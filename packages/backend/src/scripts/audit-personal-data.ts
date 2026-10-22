import pool from "../db.js";

const result = await pool.query(`
  SELECT
    (SELECT count(*)::int FROM users) AS users_total,
    (SELECT count(*)::int FROM users WHERE dingtalk_id LIKE 'placeholder_%') AS placeholder_users,
    (SELECT count(*)::int FROM users WHERE synced_at IS NOT NULL) AS directory_synced_users,
    (SELECT count(*)::int FROM users WHERE dingtalk_id NOT LIKE 'placeholder_%') AS real_dingtalk_users,
    (SELECT count(*)::int FROM questionnaires) AS questionnaires,
    (SELECT count(*)::int FROM evaluation_relations) AS evaluation_relations,
    (SELECT count(*)::int FROM scores) AS scores
`);

console.log(JSON.stringify(result.rows[0]));
await pool.end();
