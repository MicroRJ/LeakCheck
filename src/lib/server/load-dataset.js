import { get_database_pool } from "./database.js";

function cents_to_amount(cents) {
	return Number(cents) / 100;
}

export async function load_dataset(organization_id) {
	const database = await get_database_pool().connect();

	try {
		// 'BEGIN TRANSACTION': Begin a new transaction;
		// 'ISOLATION LEVEL REPEATABLE READ': All reads see the same snapshot, so even if another
		// process modified the database while we're still working, we'll see the same data the
		// transaction started with;
		// 'READ ONLY': read only mode, so INSERT, UPDATE, DELETE, etc. Will Fail!
		await database.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

		// Get the organization;
		const organization_result = await database.query(
			"SELECT id, name, currency FROM organizations WHERE id = $1",
			[organization_id]
		);
		if (organization_result.rowCount === 0) {
			throw new Error(`Unknown organization: ${organization_id}`);
		}
		// Get customers;
		const customers_result = await database.query(
			`SELECT external_id AS id, name, status
			 FROM customers
			 WHERE organization_id = $1
			 ORDER BY external_id`,
			[organization_id]
		);
		// Get jobs;
		// Our processor expects customer id's to be the external id's, but we store our own customer ids.
		// So this query selects a job row;
		// Finds its customer by customer id;
		// And replaces the resulting row's customer id with the target customer's external id.
		const jobs_result = await database.query(
			`SELECT jobs.external_id AS id,
				customers.external_id AS customer_id,
				jobs.description,
				jobs.status,
				jobs.total_cents,
				jobs.currency,
				jobs.completed_at,
				jobs.source_system
			 FROM jobs
			 JOIN customers ON customers.id = jobs.customer_id
			 WHERE jobs.organization_id = $1
			 ORDER BY jobs.external_id`,
			[organization_id]
		);
		const invoices_result = await database.query(
			`SELECT
			   invoices.external_id  AS id,
				jobs.external_id      AS job_id,
				customers.external_id AS customer_id,
				invoices.status,
				COALESCE(invoice_applications.amount_cents, invoices.total_cents) AS applied_cents,
				invoices.currency,
				invoices.issued_at,
				invoices.source_system
			 FROM invoices
			 LEFT JOIN customers ON customers.id = invoices.customer_id
			 LEFT JOIN invoice_applications ON invoice_applications.invoice_id = invoices.id
			 LEFT JOIN jobs ON jobs.id = invoice_applications.job_id
			 WHERE invoices.organization_id = $1
			 ORDER BY invoices.external_id, jobs.external_id`,
			[organization_id]
		);
		const analysis_result = await database.query(
			`SELECT max(completed_at) AS analyzed_at
			 FROM sync_runs
			 WHERE organization_id = $1 AND status = 'succeeded'`,
			[organization_id]
		);

		await database.query("COMMIT");

		const organization = organization_result.rows[0];
		const analyzed_at = analysis_result.rows[0].analyzed_at;
		return {
			company: organization,
			crm_export: {
				source: jobs_result.rows[0]?.source_system ?? "Unknown CRM",
				exported_at: analyzed_at.toISOString(),
				customers: customers_result.rows,
				jobs: jobs_result.rows.map((job) => ({
					id: job.id,
					customer_id: job.customer_id,
					description: job.description,
					status: job.status,
					total: cents_to_amount(job.total_cents),
					currency: job.currency,
					completed_at: job.completed_at.toISOString()
				}))
			},
			accounting_export: {
				source: invoices_result.rows[0]?.source_system ?? "Unknown accounting system",
				exported_at: analyzed_at.toISOString(),
				invoices: invoices_result.rows.map((invoice) => ({
					id: invoice.id,
					job_id: invoice.job_id,
					customer_id: invoice.customer_id,
					status: invoice.status,
					total: cents_to_amount(invoice.applied_cents),
					currency: invoice.currency,
					created_at: invoice.issued_at.toISOString()
				}))
			}
		};
	}
	catch (error) {
		await database.query("ROLLBACK");
		throw error;
	}
	finally {
		database.release();
	}
}
