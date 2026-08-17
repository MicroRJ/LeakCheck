import { readdir, readFile } from "node:fs/promises";

import pg from "pg";

const { Client } = pg;
const connection_string = process.env.DATABASE_URL;

if (!connection_string) {
	throw new Error("DATABASE_URL is required");
}

const migrations_directory = new URL("../../db/migrations/", import.meta.url);
const migration_names = (await readdir(migrations_directory))
	.filter((name) => name.endsWith(".sql"))
	.sort();

const database = new Client({ connectionString: connection_string });
await database.connect();

try {
	await database.query(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			name text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`);

	for (const migration_name of migration_names) {
		const existing = await database.query(
			"SELECT 1 FROM schema_migrations WHERE name = $1",
			[migration_name]
		);
		if (existing.rowCount > 0) continue;

		const migration_source = await readFile(
			new URL(migration_name, migrations_directory),
			"utf8"
		);
		const statements = migration_source
			.split("-- statement-breakpoint")
			.map((statement) => statement.trim())
			.filter(Boolean);

		await database.query("BEGIN");
		try {
			for (const statement of statements) {
				await database.query(statement);
			}
			await database.query(
				"INSERT INTO schema_migrations (name) VALUES ($1)",
				[migration_name]
			);
			await database.query("COMMIT");
			console.log(`Applied migration ${migration_name}`);
		}
		catch (error) {
			await database.query("ROLLBACK");
			throw error;
		}
	}
}
finally {
	await database.end();
}
