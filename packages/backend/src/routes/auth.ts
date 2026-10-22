import { Router } from "express";
import { query } from "../db.js";
import { signToken } from "../middleware/auth.js";
import type { AuthUser } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { code } = req.body;

    // Mock 模式：开发环境跳过钉钉 API
    if (process.env.NODE_ENV !== "production" && code?.startsWith("mock_dev_code")) {
      // mock_username 用于指定登录为哪个用户（从 users 表查找）
      const mockName: string | undefined = req.body.mock_username;

      if (mockName && mockName !== "管理员") {
        // 以评价人身份登录：查找或创建该用户（非管理员）
        const result = await query(
          `INSERT INTO users (dingtalk_id, name, is_admin)
           VALUES ($1, $2, FALSE)
           ON CONFLICT (dingtalk_id) DO NOTHING
           RETURNING id, dingtalk_id, name, avatar, is_admin`,
          [`mock_dt_${mockName}`, mockName]
        );
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const token = signToken({ user_id: user.id, is_admin: user.is_admin });
          res.json({ token, user });
          return;
        }
        // 如果已存在，查找并返回
        const existing = await query(
          "SELECT id, dingtalk_id, name, avatar, is_admin FROM users WHERE name = $1",
          [mockName]
        );
        if (existing.rows.length > 0) {
          const user = existing.rows[0];
          const token = signToken({ user_id: user.id, is_admin: user.is_admin });
          res.json({ token, user });
          return;
        }
      }

      // 默认：管理员登录
      const result = await query(
        `INSERT INTO users (dingtalk_id, name, is_admin)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (dingtalk_id) DO UPDATE SET is_admin = TRUE
         RETURNING id, dingtalk_id, name, avatar, is_admin`,
        ["mock_dt_admin", "管理员"]
      );
      const user = result.rows[0];
      const token = signToken({ user_id: user.id, is_admin: user.is_admin });
      res.json({ token, user });
      return;
    }

    // 生产模式：调用钉钉 API 换取 userid
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "缺少钉钉免登授权码" });
      return;
    }
    const dingtalkUser = await exchangeCodeForUser(code);
    const result = await query(
      `INSERT INTO users (dingtalk_id, name, avatar)
       VALUES ($1, $2, $3)
       ON CONFLICT (dingtalk_id) DO UPDATE
       SET name = EXCLUDED.name, avatar = EXCLUDED.avatar, updated_at = now()
       RETURNING id, dingtalk_id, name, avatar, is_admin`,
      [dingtalkUser.userid, dingtalkUser.name, dingtalkUser.avatar || null]
    );
    const user = result.rows[0];
    const token = signToken({ user_id: user.id, is_admin: user.is_admin });
    res.json({ token, user });
  } catch (err) {
    console.error("登录失败:", err);
    const detail = err instanceof Error ? err.message : "未知错误";
    res.status(500).json({ error: `登录失败：${detail}` });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const authUser = req.user as AuthUser | undefined;
    if (!authUser) {
      res.status(401).json({ error: "未登录" });
      return;
    }

    const result = await query(
      "SELECT id, dingtalk_id, name, avatar, is_admin FROM users WHERE id = $1",
      [authUser.user_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "用户不存在" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("获取用户信息失败:", err);
    res.status(500).json({ error: "获取用户信息失败" });
  }
});

async function exchangeCodeForUser(
  code: string
): Promise<{ userid: string; name: string; avatar?: string }> {
  const appKey = process.env.DINGTALK_APP_KEY;
  const appSecret = process.env.DINGTALK_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("服务端缺少 DINGTALK_APP_KEY 或 DINGTALK_APP_SECRET 环境变量");
  }

  // 获取 access_token
  const tokenUrl = "https://oapi.dingtalk.com/gettoken";
  const tokenParams = new URLSearchParams({
    appkey: appKey,
    appsecret: appSecret,
  });
  const tokenRes = await fetch(`${tokenUrl}?${tokenParams}`);
  const tokenData = (await tokenRes.json()) as { access_token?: string; errcode?: number };
  if (tokenData.errcode !== 0) {
    throw new Error(`获取钉钉 token 失败: ${JSON.stringify(tokenData)}`);
  }

  // 用 code 换取 userid
  const userUrl = "https://oapi.dingtalk.com/topapi/v2/user/getuserinfo";
  const userRes = await fetch(`${userUrl}?access_token=${encodeURIComponent(tokenData.access_token || "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const userData = (await userRes.json()) as {
    result?: { userid?: string };
    errcode?: number;
  };
  if (userData.errcode !== 0) {
    throw new Error(`获取钉钉用户失败: ${JSON.stringify(userData)}`);
  }

  const userid = userData.result?.userid;
  if (!userid) throw new Error("钉钉未返回 userid");

  const detailRes = await fetch(
    `https://oapi.dingtalk.com/topapi/v2/user/get?access_token=${encodeURIComponent(tokenData.access_token || "")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userid }),
    }
  );
  const detailData = (await detailRes.json()) as {
    errcode?: number;
    errmsg?: string;
    result?: { userid?: string; name?: string; avatar?: string };
  };
  if (detailData.errcode !== 0 || !detailData.result?.name) {
    throw new Error(`获取钉钉用户详情失败: ${JSON.stringify(detailData)}`);
  }
  return {
    userid,
    name: detailData.result.name,
    avatar: detailData.result.avatar,
  };
}

export default router;
