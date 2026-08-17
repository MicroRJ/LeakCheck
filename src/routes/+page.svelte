<script>
	import { onMount } from "svelte";
	import AppSidebar from "$lib/components/AppSidebar.svelte";

	const dollar_formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0
	});

	let dashboard = $state({
		jobs_analyzed: 0,
		invoices_analyzed: 0,
		potential_revenue_at_risk: 0,
		open_findings: 0,
		uninvoiced_jobs: 0,
		findings: []
	});
	let loading = $state(true);
	let error = $state("");
	let selected_finding = $state(null);

	function format_finding_type(type) {
		if (type === "missing_invoice") return "Missing invoice";
		if (type === "partial_invoice") return "Partial invoice";
		if (type === "stale_draft_invoice") return "Stale draft";
		return "Needs review";
	}

	function explain_finding(type) {
		if (type === "missing_invoice") return "This completed job has no matching finalized invoice.";
		if (type === "partial_invoice") return "The finalized invoices do not cover the full value of this job.";
		if (type === "stale_draft_invoice") return "A matching invoice exists, but it is still a draft and has not been finalized.";
		return "The job and accounting records do not reconcile and should be reviewed.";
	}

	async function load_dashboard() {
		loading = true;
		error = "";
		try {
			const response = await fetch("/api/dashboard");
			if (!response.ok) {
				throw new Error(`Server returned ${response.status}`);
			}
			dashboard = await response.json();
		}
		catch (request_error) {
			error = request_error instanceof Error ? request_error.message : "Could not load the dashboard";
		}
		finally {
			loading = false;
		}
	}

	onMount(load_dashboard);
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === "Escape") selected_finding = null;
	}}
/>


<div class="app-shell">
	<AppSidebar active="overview" />

	<main class="main">
		<div class="mobile-header">
			<span class="brand-mark"><i class="bi bi-shield-check"></i></span>
			LeakCheck
		</div>

		<header class="topbar">
			<div>
				<p class="eyebrow">Overview</p>
				<h1>Revenue leakage</h1>
				<p class="subtitle">Completed work that may not have been invoiced.</p>
			</div>

			<button class="btn sync-button" onclick={load_dashboard} disabled={loading}>
				<i class="bi bi-arrow-repeat me-2"></i>
				{loading ? "Analyzing…" : "Run sync"}
			</button>
		</header>

		<section class="row g-3">
			<div class="col-12 col-sm-6 col-xl-3">
				<article class="metric-card">
					<div class="metric-top">
						<div class="metric-label">Potential revenue at risk</div>
						<div class="metric-icon"><i class="bi bi-currency-dollar"></i></div>
					</div>
					<div class="metric-value">{dollar_formatter.format(dashboard.potential_revenue_at_risk)}</div>
					<div class="metric-note">Across {dashboard.jobs_analyzed} completed jobs</div>
				</article>
			</div>

			<div class="col-12 col-sm-6 col-xl-3">
				<article class="metric-card">
					<div class="metric-top">
						<div class="metric-label">Open findings</div>
						<div class="metric-icon"><i class="bi bi-exclamation-triangle"></i></div>
					</div>
					<div class="metric-value">{dashboard.open_findings}</div>
					<div class="metric-note">From {dashboard.invoices_analyzed} accounting records</div>
				</article>
			</div>

			<div class="col-12 col-sm-6 col-xl-3">
				<article class="metric-card">
					<div class="metric-top">
						<div class="metric-label">No finalized invoice</div>
						<div class="metric-icon"><i class="bi bi-check2-circle"></i></div>
					</div>
					<div class="metric-value">{dashboard.uninvoiced_jobs}</div>
					<div class="metric-note">Missing invoices or stale drafts</div>
				</article>
			</div>

			<div class="col-12 col-sm-6 col-xl-3">
				<article class="metric-card">
					<div class="metric-top">
						<div class="metric-label">Integration health</div>
						<div class="metric-icon"><i class="bi bi-heart-pulse"></i></div>
					</div>
					<div class="metric-value">2 / 2</div>
					<div class="metric-note"><span class="trend-up">Healthy</span> · synced 7 min ago</div>
				</article>
			</div>
		</section>

		<section class="row g-3 mt-1">
			<div class="col-12 col-xl-8">
				<article class="panel h-100">
					<div class="panel-header">
						<div>
							<h2 class="panel-title">Revenue at risk</h2>
							<div class="panel-subtitle">Potential unbilled value detected over six months</div>
						</div>
						<button class="btn btn-sm btn-light border">Last 6 months</button>
					</div>

					<div class="chart-wrap">
						<div class="chart-summary">
							<div class="chart-total">{dollar_formatter.format(dashboard.potential_revenue_at_risk)}</div>
							<div class="chart-change">Current demo analysis</div>
						</div>

						<svg class="chart-svg" viewBox="0 0 760 190" role="img" aria-label="Revenue at risk trend">
							<defs>
								<linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="#5b5bd6" stop-opacity="0.28"></stop>
									<stop offset="100%" stop-color="#5b5bd6" stop-opacity="0"></stop>
								</linearGradient>
							</defs>

							<line class="chart-grid" x1="0" y1="25" x2="760" y2="25"></line>
							<line class="chart-grid" x1="0" y1="75" x2="760" y2="75"></line>
							<line class="chart-grid" x1="0" y1="125" x2="760" y2="125"></line>
							<line class="chart-grid" x1="0" y1="175" x2="760" y2="175"></line>

							<path class="chart-area" d="M0,150 C70,145 100,105 150,115 C210,125 235,70 300,80 C365,92 400,118 455,96 C515,73 540,48 605,60 C665,72 705,25 760,35 L760,180 L0,180 Z"></path>
							<path class="chart-line" d="M0,150 C70,145 100,105 150,115 C210,125 235,70 300,80 C365,92 400,118 455,96 C515,73 540,48 605,60 C665,72 705,25 760,35"></path>

							<circle class="chart-dot" cx="0" cy="150" r="5"></circle>
							<circle class="chart-dot" cx="150" cy="115" r="5"></circle>
							<circle class="chart-dot" cx="300" cy="80" r="5"></circle>
							<circle class="chart-dot" cx="455" cy="96" r="5"></circle>
							<circle class="chart-dot" cx="605" cy="60" r="5"></circle>
							<circle class="chart-dot" cx="760" cy="35" r="5"></circle>
						</svg>

						<div class="chart-labels">
							<span>Mar</span>
							<span>Apr</span>
							<span>May</span>
							<span>Jun</span>
							<span>Jul</span>
							<span>Aug</span>
						</div>
					</div>
				</article>
			</div>

			<div class="col-12 col-xl-4">
				<article class="panel h-100">
					<div class="panel-header">
						<div>
							<h2 class="panel-title">Source health</h2>
							<div class="panel-subtitle">Freshness of connected data</div>
						</div>
					</div>

					<div class="source-list">
						<div class="source-item">
							<div class="source-logo"><i class="bi bi-people"></i></div>
							<div>
								<div class="source-name">HubSpot</div>
								<div class="source-meta">{dashboard.jobs_analyzed} jobs · loaded for demo</div>
							</div>
							<span class="status-dot" title="Healthy"></span>
						</div>

						<div class="source-item">
							<div class="source-logo"><i class="bi bi-receipt"></i></div>
							<div>
								<div class="source-name">Accounting</div>
								<div class="source-meta">{dashboard.invoices_analyzed} invoices · loaded for demo</div>
							</div>
							<span class="status-dot" title="Healthy"></span>
						</div>

						<div class="source-item">
							<div class="source-logo"><i class="bi bi-shield-check"></i></div>
							<div>
								<div class="source-name">Detection engine</div>
								<div class="source-meta">Last run completed successfully</div>
							</div>
							<span class="status-dot" title="Healthy"></span>
						</div>
					</div>
				</article>
			</div>
		</section>

		<section class="panel findings-panel">
			<div class="table-toolbar d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
				<div>
					<h2 class="panel-title">Potentially unbilled jobs</h2>
					<div class="panel-subtitle">Ordered by amount at risk</div>
				</div>

				<div class="d-flex gap-2">
					<button class="btn btn-sm btn-light border">
						<i class="bi bi-funnel me-1"></i> Filter
					</button>
					<button class="btn btn-sm btn-light border">
						Export
					</button>
				</div>
			</div>

			<div class="table-responsive">
				<table class="table findings-table">
					<thead>
						<tr>
							<th>Job</th>
							<th>Customer</th>
							<th>Amount at risk</th>
							<th>Status</th>
							<th>Age</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#if error}
							<tr><td colspan="6">Could not load findings: {error}</td></tr>
						{:else if loading}
							<tr><td colspan="6">Analyzing jobs and invoices…</td></tr>
						{:else if dashboard.findings.length === 0}
							<tr><td colspan="6">No suspicious jobs found.</td></tr>
						{:else}
							{#each dashboard.findings as finding (finding.id)}
								<tr>
									<td><span class="job-id">{finding.job_id}</span></td>
									<td>
										<div class="customer-name">{finding.customer_name}</div>
										<div class="customer-detail">{finding.description} · {format_finding_type(finding.type)}</div>
									</td>
									<td class="money">{dollar_formatter.format(finding.amount_at_risk)}</td>
									<td><span class="status-pill status-open"><i class="bi bi-circle-fill" style="font-size:.4rem"></i> Open</span></td>
									<td class="age">{finding.age_in_days} days</td>
									<td class="text-end">
										<button class="review-button" onclick={() => selected_finding = finding}>Review</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</section>
	</main>
</div>

{#if selected_finding}
	<div class="review-backdrop" role="presentation" onclick={() => selected_finding = null}>
		<dialog
			class="review-panel"
			open
			aria-modal="true"
			aria-labelledby="review-title"
			onclick={(event) => event.stopPropagation()}
		>
			<button
				class="review-close"
				type="button"
				aria-label="Close finding review"
				onclick={() => selected_finding = null}
			>
				<i class="bi bi-x-lg"></i>
			</button>

			<p class="eyebrow">Finding review</p>
			<div class="review-heading">
				<div>
					<h2 id="review-title">{selected_finding.job_id}</h2>
					<p>{selected_finding.customer_name} · {selected_finding.description}</p>
				</div>
				<span class="status-pill status-open"><i class="bi bi-circle-fill"></i> Open</span>
			</div>

			<div class="review-explanation">
				<strong>{format_finding_type(selected_finding.type)}</strong>
				<p>{explain_finding(selected_finding.type)}</p>
			</div>

			<div class="review-facts">
				<div class="review-fact">
					<span>Job total</span>
					<strong>{dollar_formatter.format(selected_finding.job_total)}</strong>
				</div>
				<div class="review-fact">
					<span>Finalized invoices</span>
					<strong>{dollar_formatter.format(selected_finding.invoiced_total)}</strong>
				</div>
				<div class="review-fact review-risk">
					<span>Amount at risk</span>
					<strong>{dollar_formatter.format(selected_finding.amount_at_risk)}</strong>
				</div>
				<div class="review-fact">
					<span>Job age</span>
					<strong>{selected_finding.age_in_days} days</strong>
				</div>
			</div>

			<p class="review-footnote">
				This is a potential discrepancy generated from the demo CRM and accounting exports.
			</p>
		</dialog>
	</div>
{/if}
