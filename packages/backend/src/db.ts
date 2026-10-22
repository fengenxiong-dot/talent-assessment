import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryRow = Record<string, any>;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/talent",
  max: 10,
  idleTimeoutMillis: 30000,
});

export function query(text: string, params?: unknown[]) {
  return pool.query<QueryRow>(text, params);
}

export async function getClient() {
  return pool.connect();
}

export default pool;
