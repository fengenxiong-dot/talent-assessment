import { query } from "../db.js";

type DingResponse<T> = {
  errcode?: number;
  errmsg?: string;
  sub_code?: string;
  sub_msg?: string;
  result?: T;
  task_id?: number;
};

export async function getDingtalkAccessToken(): Promise<string> {
  const cached = await query(
    "SELECT access_token FROM dingtalk_token WHERE id = 1 AND expires_at > now() + interval '5 minutes'",
  );
  if (cached.rows[0]?.access_token) return cached.rows[0].access_token as string;

  const appKey = process.env.DINGTALK_APP_KEY;
  const appSecret = process.env.DINGTALK_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("缺少 DINGTALK_APP_KEY 或 DINGTALK_APP_SECRET 环境变量");
  }
  const params = new URLSearchParams({ appkey: appKey, appsecret: appSecret });
  const response = await fetch(`https://oapi.dingtalk.com/gettoken?${params}`);
  const data = (await response.json()) as DingResponse<never> & {
    access_token?: string;
    expires_in?: number;
  };
  if (data.errcode !== 0 || !data.access_token) {
    throw new Error(`获取钉钉 access_token 失败: ${JSON.stringify(data)}`);
  }
  await query(
    `INSERT INTO dingtalk_token (id, access_token, expires_at, updated_at)
     VALUES (1, $1, now() + ($2 * interval '1 second'), now())
     ON CONFLICT (id) DO UPDATE
     SET access_token = EXCLUDED.access_token,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()`,
    [data.access_token, data.expires_in || 7200],
  );
  return data.access_token;
}

export async function dingtalkPost<T>(path: string, body: unknown): Promise<DingResponse<T>> {
  const token = await getDingtalkAccessToken();
  const retryDelays = [1000, 2000, 4000];
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(
      `https://oapi.dingtalk.com${path}?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = (await response.json()) as DingResponse<T>;
    if (data.errcode === 0) return data;
    const rateLimited = data.sub_code === "90002";
    if (!rateLimited || attempt >= retryDelays.length) {
      throw new Error(`钉钉接口 ${path} 调用失败: ${JSON.stringify(data)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
  }
}

export interface DingDepartment {
  dept_id: number;
  name: string;
}

export interface DingUser {
  userid: string;
  name: string;
  job_number?: string;
  avatar?: string;
  dept_id_list?: number[];
  active?: boolean;
}

export async function listAllDepartments(): Promise<DingDepartment[]> {
  const departments: DingDepartment[] = [{ dept_id: 1, name: "根部门" }];
  const visited = new Set<number>();
  const queue = [1];
  while (queue.length > 0) {
    const deptId = queue.shift()!;
    if (visited.has(deptId)) continue;
    visited.add(deptId);
    const data = await dingtalkPost<DingDepartment[]>(
      "/topapi/v2/department/listsub",
      { dept_id: deptId },
    );
    for (const department of data.result || []) {
      if (!visited.has(department.dept_id)) queue.push(department.dept_id);
      if (!departments.some((item) => item.dept_id === department.dept_id)) {
        departments.push(department);
      }
    }
  }
  return departments;
}

export async function listDepartmentUsers(deptId: number): Promise<DingUser[]> {
  const users: DingUser[] = [];
  let cursor = 0;
  do {
    const data = await dingtalkPost<{
      list?: DingUser[];
      has_more?: boolean;
      next_cursor?: number;
    }>("/topapi/v2/user/list", {
      dept_id: deptId,
      cursor,
      size: 100,
      order_field: "entry_asc",
      contain_access_limit: false,
    });
    users.push(...(data.result?.list || []));
    if (!data.result?.has_more) break;
    cursor = data.result.next_cursor || 0;
  } while (cursor > 0);
  return users;
}

export async function sendWorkNotification(userIds: string[], title: string, markdown: string) {
  const agentId = Number(process.env.DINGTALK_AGENT_ID);
  const frontendUrl = process.env.FRONTEND_URL;
  if (!agentId || !frontendUrl) {
    throw new Error("缺少 DINGTALK_AGENT_ID 或 FRONTEND_URL 环境变量");
  }
  const taskIds: number[] = [];
  for (let index = 0; index < userIds.length; index += 100) {
    const batch = userIds.slice(index, index + 100);
    const data = await dingtalkPost<never>(
      "/topapi/message/corpconversation/asyncsend_v2",
      {
        agent_id: agentId,
        userid_list: batch.join(","),
        to_all_user: false,
        msg: {
          msgtype: "action_card",
          action_card: {
            title,
            markdown,
            single_title: "进入人才盘点评价",
            single_url: `${frontendUrl.replace(/\/$/, "")}/evaluator`,
          },
        },
      },
    );
    if (typeof data.task_id !== "number") {
      throw new Error(`钉钉未返回通知 task_id: ${JSON.stringify(data)}`);
    }
    taskIds.push(data.task_id);
  }
  return taskIds;
}
