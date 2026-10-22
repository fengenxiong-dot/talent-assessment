import pool from "../db.js";

const name = process.argv[2];
if (!name) {
  throw new Error("用法: tsx src/scripts/promote-admin-by-name.ts <姓名>");
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const matches = await client.query(
    "SELECT id, dingtalk_id, name, is_admin FROM users WHERE name = $1 FOR UPDATE",
    [name],
  );
  if (matches.rows.length !== 1) {
    throw new Error(`姓名 ${name} 匹配到 ${matches.rows.length} 个用户，已取消修改`);
  }
  const updated = await client.query(
    `UPDATE users SET is_admin = TRUE, updated_at = now()
     WHERE id = $1
     RETURNING id, dingtalk_id, name, is_admin`,
    [matches.rows[0].id],
  );
  await client.query("COMMIT");
  console.log(JSON.stringify(updated.rows[0]));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
