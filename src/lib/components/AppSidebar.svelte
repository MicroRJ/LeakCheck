<script>
	let { active = "overview" } = $props();
</script>

<aside class="sidebar">
	<div class="brand">
		<span class="brand-mark"><i class="bi bi-shield-check"></i></span>
		<span>LeakCheck</span>
	</div>

	<div class="nav-label">Workspace</div>
	<nav aria-label="Workspace">
		<a class:active={active === "overview"} class="side-link" href="/">
			<i class="bi bi-grid-1x2-fill"></i>
			Overview
		</a>
		<a class:active={active === "findings"} class="side-link" href="/findings">
			<i class="bi bi-exclamation-diamond"></i>
			Findings
		</a>
		<button class="side-link" type="button">
			<i class="bi bi-plug"></i>
			Integrations
		</button>
		<button class="side-link" type="button">
			<i class="bi bi-buildings"></i>
			Customers
		</button>
	</nav>

	<div class="nav-label">System</div>
	<nav aria-label="System">
		<button class="side-link" type="button">
			<i class="bi bi-clock-history"></i>
			Activity
		</button>
		<button class="side-link" type="button">
			<i class="bi bi-gear"></i>
			Settings
		</button>
	</nav>

	<div class="sidebar-footer">
		<div class="small fw-semibold text-white">Acme HVAC</div>
		<div class="small mt-1" style="color:#8f92ad;">2 integrations connected</div>
	</div>
</aside>
