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
	let search = $state("");
	let type_filter = $state("all");
	let sort_order = $state("risk_desc");
	let selected_finding = $state(null);

	let visible_findings = $derived.by(() => {
		const term = search.trim().toLowerCase();
		const findings = dashboard.findings.filter((finding) => {
			const matches_type = type_filter === "all" || finding.type === type_filter;
			const matches_search = term.length === 0 || [
				finding.job_id,
				finding.customer_name,
				finding.description,
				format_finding_type(finding.type)
			].some((value) => value.toLowerCase().includes(term));
			return matches_type && matches_search;
		});

		return findings.sort((left, right) => {
			if (sort_order === "risk_asc") return left.amount_at_risk - right.amount_at_risk;
			if (sort_order === "age_desc") return right.age_in_days - left.age_in_days;
			if (sort_order === "age_asc") return left.age_in_days - right.age_in_days;
			return right.amount_at_risk - left.amount_at_risk;
		});
	});

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

	function finding_class(type) {
		if (type === "partial_invoice") return "finding-partial";
		if (type === "stale_draft_invoice") return "finding-draft";
		return "finding-missing";
	}

	function coverage_percent(finding) {
		if (finding.job_total <= 0) return 0;
		return Math.max(0, Math.min(100, (finding.invoiced_total / finding.job_total) * 100));
	}

	async function load_findings() {
		loading = true;
		error = "";
		try {
			const response = await fetch("/api/dashboard");
			if (!response.ok) throw new Error(`Server returned ${response.status}`);
			dashboard = await response.json();
		}
		catch (request_error) {
			error = request_error instanceof Error ? request_error.message : "Could not load findings";
		}
		finally {
			loading = false;
		}
	}

	function export_findings() {
		const columns = [
			["Job", (finding) => finding.job_id],
			["Customer", (finding) => finding.customer_name],
			["Type", (finding) => format_finding_type(finding.type)],
			["Job total", (finding) => finding.job_total],
			["Finalized invoices", (finding) => finding.invoiced_total],
			["Amount at risk", (finding) => finding.amount_at_risk],
			["Age in days", (finding) => finding.age_in_days]
		];
		// make the value CSV friendly, literal quotes are doubled!
		escape = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
		const lines = [
			columns.map(([label]) => escape(label)).join(","),
			...visible_findings.map((finding) =>
				columns.map(([, read]) => escape(read(finding))).join(",")
			)
		];
		const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = "leakcheck-findings.csv";
		link.click();
		URL.revokeObjectURL(url);
	}

	onMount(load_findings);
</script>

<svelte:head>
	<title>Findings · LeakCheck</title>
</svelte:head>

<svelte:window
	onkeydown={(event) => {
		if (event.key === "Escape") selected_finding = null;
	}}
/>

<div class="app-shell">
	<AppSidebar active="findings" />

	<main class="main findings-page">
		<div class="mobile-header">
			<span class="brand-mark"><i class="bi bi-shield-check"></i></span>
			LeakCheck
		</div>

		<header class="topbar findings-topbar">
			<div>
				<p class="eyebrow">Workspace</p>
				<h1>Findings</h1>
				<p class="subtitle">Prioritized discrepancies between completed jobs and accounting records.</p>
			</div>

			<div class="header-actions">
				<button
					class="btn export-button"
					type="button"
					onclick={export_findings}
					disabled={loading || visible_findings.length === 0}
				>
					<i class="bi bi-download"></i>
					Export CSV
				</button>
				<button class="btn sync-button" type="button" onclick={load_findings} disabled={loading}>
					<i class="bi bi-arrow-repeat"></i>
					{loading ? "Analyzing…" : "Refresh"}
				</button>
			</div>
		</header>

		<section class="findings-summary panel" aria-label="Finding summary">
			<div class="summary-item">
				<span>Open findings</span>
				<strong>{dashboard.open_findings}</strong>
				<small>Across the complete analysis</small>
			</div>
			<div class="summary-item summary-risk">
				<span>Potential revenue at risk</span>
				<strong>{dollar_formatter.format(dashboard.potential_revenue_at_risk)}</strong>
				<small>Unresolved completed work</small>
			</div>
			<div class="summary-item">
				<span>No finalized invoice</span>
				<strong>{dashboard.uninvoiced_jobs}</strong>
				<small>Missing invoices or stale drafts</small>
			</div>
			<div class="summary-item">
				<span>Priority queue</span>
				<strong>{dashboard.findings.length}</strong>
				<small>Highest-value findings shown</small>
			</div>
		</section>

		<section class="panel findings-workspace">
			<div class="findings-controls">
				<label class="search-field">
					<span class="visually-hidden">Search findings</span>
					<i class="bi bi-search"></i>
					<input bind:value={search} type="search" placeholder="Search job, customer, or service" />
				</label>

				<div class="control-selects">
					<label>
						<span>Finding type</span>
						<select bind:value={type_filter}>
							<option value="all">All types</option>
							<option value="missing_invoice">Missing invoice</option>
							<option value="partial_invoice">Partial invoice</option>
							<option value="stale_draft_invoice">Stale draft</option>
						</select>
					</label>

					<label>
						<span>Sort by</span>
						<select bind:value={sort_order}>
							<option value="risk_desc">Highest risk</option>
							<option value="risk_asc">Lowest risk</option>
							<option value="age_desc">Oldest job</option>
							<option value="age_asc">Newest job</option>
						</select>
					</label>
				</div>
			</div>

			<div class="queue-meta">
				<div>
					<strong>{visible_findings.length}</strong>
					{visible_findings.length === 1 ? "finding" : "findings"} in this view
				</div>
				<span>The demo API currently returns its eight highest-risk findings.</span>
			</div>

			<div class="table-responsive">
				<table class="table findings-table findings-queue">
					<thead>
						<tr>
							<th>Finding</th>
							<th>Customer</th>
							<th>Job value</th>
							<th>Invoice coverage</th>
							<th>Amount at risk</th>
							<th>Age</th>
							<th><span class="visually-hidden">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						{#if error}
							<tr>
								<td colspan="7">
									<div class="queue-state queue-error">
										<i class="bi bi-exclamation-circle"></i>
										<strong>Could not load findings</strong>
										<span>{error}</span>
										<button class="review-button" type="button" onclick={load_findings}>Try again</button>
									</div>
								</td>
							</tr>
						{:else if loading}
							{#each Array(5) as _}
								<tr class="loading-row">
									<td colspan="7"><span></span></td>
								</tr>
							{/each}
						{:else if visible_findings.length === 0}
							<tr>
								<td colspan="7">
									<div class="queue-state">
										<i class="bi bi-search"></i>
										<strong>No matching findings</strong>
										<span>Try a different search term or finding type.</span>
										<button
											class="review-button"
											type="button"
											onclick={() => { search = ""; type_filter = "all"; }}
										>Clear filters</button>
									</div>
								</td>
							</tr>
						{:else}
							{#each visible_findings as finding (finding.id)}
								<tr>
									<td>
										<div class="finding-identity">
											<span class={`finding-icon ${finding_class(finding.type)}`}>
												<i class="bi bi-exclamation-diamond"></i>
											</span>
											<div>
												<div class="job-id">{finding.job_id}</div>
												<div class="finding-kind">{format_finding_type(finding.type)}</div>
											</div>
										</div>
									</td>
									<td>
										<div class="customer-name">{finding.customer_name}</div>
										<div class="customer-detail">{finding.description}</div>
									</td>
									<td class="money">{dollar_formatter.format(finding.job_total)}</td>
									<td>
										<div class="coverage-value">
											<span>{dollar_formatter.format(finding.invoiced_total)}</span>
											<small>{Math.round(coverage_percent(finding))}%</small>
										</div>
										<div class="coverage-track">
											<span style={`width:${coverage_percent(finding)}%`}></span>
										</div>
									</td>
									<td class="money risk-money">{dollar_formatter.format(finding.amount_at_risk)}</td>
									<td class="age">{finding.age_in_days} days</td>
									<td class="text-end">
										<button class="review-button" type="button" onclick={() => selected_finding = finding}>
											Review
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<div class="queue-footer">
				<span>Showing {visible_findings.length} of {dashboard.findings.length} priority findings</span>
				<div class="pagination-buttons" aria-label="Pagination">
					<button type="button" disabled aria-label="Previous page"><i class="bi bi-chevron-left"></i></button>
					<span>1</span>
					<button type="button" disabled aria-label="Next page"><i class="bi bi-chevron-right"></i></button>
				</div>
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
			<button class="review-close" type="button" aria-label="Close finding review" onclick={() => selected_finding = null}>
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

			<p class="review-footnote">This review is read-only until finding decisions are added to the backend.</p>
		</dialog>
	</div>
{/if}
