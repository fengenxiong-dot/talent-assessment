import pool from "../db.js";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log("用法: tsx src/scripts/init-admin.ts <钉钉userid> [姓名]");
    process.exit(1);
  }

  const dingtalkId = args[0];
  const name = args[1] || "管理员";

  try {
    const result = await pool.query(
      `INSERT INTO users (dingtalk_id, name, is_admin)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (dingtalk_id) DO UPDATE SET is_admin = TRUE, name = $2
       RETURNING id, dingtalk_id, name, is_admin`,
      [dingtalkId, name]
    );

    console.log("管理员已创建:", result.rows[0]);

    // 同时更新 dingtalk_token 表的初始行
    await pool.query(
      `INSERT INTO dingtalk_token (id, access_token, expires_at)
       VALUES (1, '', now())
       ON CONFLICT (id) DO NOTHING`
    );

    console.log("Token 缓存表已初始化");
  } catch (err) {
    console.error("初始化失败:", err);
  } finally {
    await pool.end();
  }
}

main();
