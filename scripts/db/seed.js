import { readFile } from "node:fs/promises";

import pg from "pg";

const { Client } = pg;
const connection_string = process.env.DATABASE_URL;

if (!connection_string) {
	throw new Error("DATABASE_URL is required");
}

const dataset = JSON.parse(await readFile(
	new URL("../../src/lib/server/data/company-export.json", import.meta.url),
	"utf8"
));

function record_id(organization_id, source_system, external_id) {
	return `${organization_id}:${source_system}:${external_id}`;
}

function amount_to_cents(amount) {
	const cents = Math.round(Number(amount) * 100);
	if (!Number.isSafeInteger(cents) || cents < 0) {
		throw new Error(`Invalid monetary amount: ${amount}`);
	}
	return cents;
}

const organization_id = dataset.company.id;
const crm_source = dataset.crm_export.source;
const accounting_source = dataset.accounting_export.source;
const database = new Client({ connectionString: connection_string });

await database.connect();
await database.query("BEGIN");

try {
	await database.query("DELETE FROM organizations WHERE id = $1", [organization_id]);
	await database.query(
		"INSERT INTO organizations (id, name, currency) VALUES ($1, $2, $3)",
		[organization_id, dataset.company.name, dataset.company.currency]
	);

	for (const customer of dataset.crm_export.customers) {
		await database.query(
			`INSERT INTO customers
				(id, organization_id, source_system, external_id, name, status)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[
				record_id(organization_id, crm_source, customer.id),
				organization_id,
				crm_source,
				customer.id,
				customer.name,
				customer.status
			]
		);
	}

	for (const job of dataset.crm_export.jobs) {
		await database.query(
			`INSERT INTO jobs
				(id, organization_id, source_system, external_id, customer_id,
				 description, status, total_cents, currency, completed_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
			[
				record_id(organization_id, crm_source, job.id),
				organization_id,
				crm_source,
				job.id,
				record_id(organization_id, crm_source, job.customer_id),
				job.description,
				job.status,
				amount_to_cents(job.total),
				job.currency,
				job.completed_at
			]
		);
	}

	for (const invoice of dataset.accounting_export.invoices) {
		const invoice_id = record_id(organization_id, accounting_source, invoice.id);
		await database.query(
			`INSERT INTO invoices
				(id, organization_id, source_system, external_id, customer_id,
				 status, total_cents, currency, issued_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			[
				invoice_id,
				organization_id,
				accounting_source,
				invoice.id,
				record_id(organization_id, crm_source, invoice.customer_id),
				invoice.status,
				amount_to_cents(invoice.total),
				invoice.currency,
				invoice.created_at
			]
		);

		if (invoice.job_id) {
			await database.query(
				`INSERT INTO invoice_applications
					(organization_id, invoice_id, job_id, amount_cents)
				 VALUES ($1, $2, $3, $4)`,
				[
					organization_id,
					invoice_id,
					record_id(organization_id, crm_source, invoice.job_id),
					amount_to_cents(invoice.total)
				]
			);
		}
	}

	const sync_runs = [
		{
			source: crm_source,
			exported_at: dataset.crm_export.exported_at,
			record_count: dataset.crm_export.customers.length + dataset.crm_export.jobs.length
		},
		{
			source: accounting_source,
			exported_at: dataset.accounting_export.exported_at,
			record_count: dataset.accounting_export.invoices.length
		}
	];

	for (const sync_run of sync_runs) {
		await database.query(
			`INSERT INTO sync_runs
				(id, organization_id, source_system, status, record_count,
				 started_at, completed_at)
			 VALUES ($1, $2, $3, 'succeeded', $4, $5, $5)`,
			[
				record_id(organization_id, "sync", sync_run.source),
				organization_id,
				sync_run.source,
				sync_run.record_count,
				sync_run.exported_at
			]
		);
	}

	await database.query("COMMIT");
	console.log(
		`Seeded ${dataset.crm_export.customers.length} customers, `
		+ `${dataset.crm_export.jobs.length} jobs, and `
		+ `${dataset.accounting_export.invoices.length} invoices`
	);
}
catch (error) {
	await database.query("ROLLBACK");
	throw error;
}
finally {
	await database.end();
}
