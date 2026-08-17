import { json } from "@sveltejs/kit";
import { find_leaks } from "$lib/server/find-leaks.js";
import { load_dataset } from "$lib/server/load-dataset.js";

export async function GET() {
	const dataset = await load_dataset("COMP-001");
	// this 'json' creates a response object
	return json(find_leaks(dataset), {
		headers: { "Cache-Control": "no-store" }
	});
}
