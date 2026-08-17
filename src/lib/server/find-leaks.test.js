import assert from "node:assert/strict";
import test from "node:test";

import { find_leaks } from "./find-leaks.js";

test("find_leaks classifies missing, partial, and draft-only invoices", () => {
	const dataset = {
		company: { id: "COMP-1", name: "Test Company", currency: "USD" },
		crm_export: {
			exported_at: "2026-08-10T00:00:00Z",
			customers: [{ id: "C-1", name: "Customer One" }],
			jobs: [
				{ id: "J-PAID", customer_id: "C-1", description: "Paid", total: 100, completed_at: "2026-08-01T00:00:00Z" },
				{ id: "J-PARTIAL", customer_id: "C-1", description: "Partial", total: 100, completed_at: "2026-08-02T00:00:00Z" },
				{ id: "J-MISSING", customer_id: "C-1", description: "Missing", total: 80, completed_at: "2026-08-03T00:00:00Z" },
				{ id: "J-DRAFT", customer_id: "C-1", description: "Draft", total: 120, completed_at: "2026-08-04T00:00:00Z" }
			]
		},
		accounting_export: {
			invoices: [
				{ job_id: "J-PAID", status: "paid", total: 100 },
				{ job_id: "J-PARTIAL", status: "sent", total: 40 },
				{ job_id: "J-DRAFT", status: "draft", total: 120 }
			]
		}
	};
	const original_dataset = structuredClone(dataset);

	const dashboard = find_leaks(dataset);

	assert.equal(dashboard.jobs_analyzed, 4);
	assert.equal(dashboard.invoices_analyzed, 3);
	assert.equal(dashboard.open_findings, 3);
	assert.equal(dashboard.uninvoiced_jobs, 2);
	assert.equal(dashboard.potential_revenue_at_risk, 260);
	assert.deepEqual(
		dashboard.findings.map((finding) => [finding.job_id, finding.type, finding.amount_at_risk]),
		[
			["J-DRAFT", "stale_draft_invoice", 120],
			["J-MISSING", "missing_invoice", 80],
			["J-PARTIAL", "partial_invoice", 60]
		]
	);
	assert.deepEqual(dataset, original_dataset);
});
