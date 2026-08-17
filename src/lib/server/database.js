import { env } from "$env/dynamic/private";
import pg from "pg";

const { Pool } = pg;
const pool_symbol = Symbol.for("leakcheck.postgres.pool");

export function get_database_pool() {
	if (!env.DATABASE_URL) {
		throw new Error("DATABASE_URL is required");
	}

	if (!globalThis[pool_symbol]) {
		globalThis[pool_symbol] = new Pool({
			connectionString: env.DATABASE_URL,
			max: 5,
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: 10_000,
			application_name: "leakcheck"
		});
	}

	return globalThis[pool_symbol];
}
