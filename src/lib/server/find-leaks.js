export function find_leaks(dataset) {
	const jobs_by_id = new Map();
	const customers_by_id = new Map();

	for (const customer of dataset.crm_export.customers) {
		customers_by_id.set(customer.id, customer);
	}

	for (const job of dataset.crm_export.jobs) {
		jobs_by_id.set(job.id, {
			...job,
			under_invoiced_amount: job.total,
			finalized_invoice_count: 0,
			draft_invoice_count: 0
		});
	}

	for (const invoice of dataset.accounting_export.invoices) {
		const job = jobs_by_id.get(invoice.job_id);
		if (job === undefined) continue;

		if (invoice.status === "draft") {
			job.draft_invoice_count += 1;
			continue;
		}

		if (invoice.status !== "paid" && invoice.status !== "sent") continue;

		job.finalized_invoice_count += 1;
		job.under_invoiced_amount -= invoice.total;
		if (job.under_invoiced_amount <= 0) {
			jobs_by_id.delete(job.id);
		}
	}

	const analysis_time = new Date(dataset.crm_export.exported_at);
	const milliseconds_per_day = 24 * 60 * 60 * 1000;
	const findings = [];
	let uninvoiced_jobs = 0;

	for (const job of jobs_by_id.values()) {
		const customer = customers_by_id.get(job.customer_id);
		let type = "partial_invoice";

		if (job.finalized_invoice_count === 0) {
			uninvoiced_jobs += 1;
			type = job.draft_invoice_count > 0
				? "stale_draft_invoice"
				: "missing_invoice";
		}

		findings.push({
			id: `F-${job.id}`,
			job_id: job.id,
			customer_id: job.customer_id,
			customer_name: customer?.name ?? "Unknown customer",
			description: job.description,
			type,
			status: "open",
			job_total: job.total,
			invoiced_total: job.total - job.under_invoiced_amount,
			amount_at_risk: job.under_invoiced_amount,
			age_in_days: Math.max(0, Math.floor(
				(analysis_time - new Date(job.completed_at)) / milliseconds_per_day
			))
		});
	}

	findings.sort((left, right) => right.amount_at_risk - left.amount_at_risk);

	return {
		company: dataset.company,
		analyzed_at: dataset.crm_export.exported_at,
		jobs_analyzed: dataset.crm_export.jobs.length,
		invoices_analyzed: dataset.accounting_export.invoices.length,
		potential_revenue_at_risk: findings.reduce(
			(total, finding) => total + finding.amount_at_risk,
			0
		),
		open_findings: findings.length,
		uninvoiced_jobs,
		findings: findings.slice(0, 8)
	};
}
