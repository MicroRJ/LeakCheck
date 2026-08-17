<script>
	import "bootstrap/dist/css/bootstrap.min.css";
	import "bootstrap-icons/font/bootstrap-icons.css";
	import "../app.css";

	let { children } = $props();
</script>

<svelte:head>
	<title>LeakCheck</title>
	<meta
		name="description"
		content="Find completed work that may not have been invoiced."
	/>
</svelte:head>

{@render children()}
