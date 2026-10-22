import pool from "../db.js";

await pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS job_number VARCHAR(64);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS department_ids JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS department_names JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_job_number_unique
    ON users(job_number) WHERE job_number IS NOT NULL AND job_number <> '';
`);
console.log("通讯录字段迁移完成");
await pool.end();
