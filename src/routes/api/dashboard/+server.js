import { json } from "@sveltejs/kit";
import company_export from "$lib/server/data/company-export.json";
import { find_leaks } from "$lib/server/find-leaks.js";

export function GET() {
	return json(find_leaks(company_export));
}
