import { Router } from "express";
import { query } from "../db.js";
import {
  listAllDepartments,
  listDepartmentUsers,
  type DingUser,
} from "../services/dingtalk.js";

const router = Router();

// GET /api/contacts/search?keyword=xxx
router.get("/search", async (req, res) => {
  try {
    const keyword = (req.query.keyword as string) || "";
    const result = await query(
      `SELECT id, dingtalk_id, name, avatar, job_number,
              department_names, active, is_admin
       FROM users
       WHERE active = TRUE
         AND (name ILIKE $1 OR job_number ILIKE $1)
       ORDER BY name
       LIMIT 50`,
      [`%${keyword}%`]
    );

    res.json({ users: result.rows });
  } catch (err) {
    console.error("搜索通讯录失败:", err);
    res.status(500).json({ error: "搜索通讯录失败" });
  }
});

// POST /api/contacts/sync — 同步钉钉通讯录
router.post("/sync", async (_req, res) => {
  try {
    const departments = await listAllDepartments();
    const departmentNames = new Map(
      departments.map((department) => [department.dept_id, department.name]),
    );
    const users = new Map<string, DingUser>();
    for (const department of departments) {
      const departmentUsers = await listDepartmentUsers(department.dept_id);
      for (const user of departmentUsers) users.set(user.userid, user);
    }

    let synced = 0;
    for (const user of users.values()) {
      const deptIds = user.dept_id_list || [];
      const deptNames = deptIds
        .map((id) => departmentNames.get(id))
        .filter((name): name is string => Boolean(name));
      await query(
        `INSERT INTO users
           (dingtalk_id, name, avatar, job_number, department_ids,
            department_names, active, synced_at)
         VALUES ($1, $2, $3, NULLIF($4, ''), $5::jsonb, $6::jsonb, $7, now())
         ON CONFLICT (dingtalk_id) DO UPDATE SET
           name = EXCLUDED.name,
           avatar = EXCLUDED.avatar,
           job_number = EXCLUDED.job_number,
           department_ids = EXCLUDED.department_ids,
           department_names = EXCLUDED.department_names,
           active = EXCLUDED.active,
           synced_at = now(),
           updated_at = now()`,
        [
          user.userid,
          user.name,
          user.avatar || null,
          user.job_number || "",
          JSON.stringify(deptIds),
          JSON.stringify(deptNames),
          user.active !== false,
        ],
      );
      synced++;
    }
    res.json({
      success: true,
      departments: departments.length,
      users: synced,
      message: `已同步 ${departments.length} 个部门、${synced} 名员工`,
    });
  } catch (err) {
    console.error("同步通讯录失败:", err);
    const detail = err instanceof Error ? err.message : "未知错误";
    res.status(500).json({ error: `同步通讯录失败：${detail}` });
  }
});

export default router;
