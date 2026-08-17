import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const company_adjectives = [
	'Acme', 'Apex', 'Blue', 'Bright', 'Clear', 'Coastal', 'Cornerstone', 'Crown',
	'Elite', 'Evergreen', 'First', 'Frontier', 'Golden', 'Grand', 'Great',
	'Highland', 'Keystone', 'Liberty', 'Metro', 'Modern', 'National', 'Northstar',
	'Pacific', 'Premier', 'Prime', 'Pro', 'Redwood', 'Royal', 'Silver', 'Southern',
	'Summit', 'United', 'Western', 'Central', 'Dynamic', 'Advanced', 'American',
	'Atlantic', 'Beacon', 'Capital', 'Classic', 'Continental', 'Diamond', 'Elevation',
	'Empire', 'Express', 'Heritage', 'Horizon', 'Independent', 'Landmark',
	'Pinnacle', 'Precision', 'Reliable', 'Strategic', 'Superior', 'Titan',
	'Vanguard', 'Victory'
];

const company_nouns = [
	'Manufacturing', 'Properties', 'Logistics', 'Industries', 'Construction',
	'Solutions', 'Services', 'Technologies', 'Systems', 'Enterprises', 'Holdings',
	'Group', 'Partners', 'Supply', 'Equipment', 'Electric', 'Energy', 'Transport',
	'Distribution', 'Development', 'Resources', 'Materials', 'Contractors',
	'Consulting', 'Management', 'Engineering', 'Security', 'Communications',
	'Facilities', 'Infrastructure', 'Operations', 'Maintenance', 'Automation',
	'Fabrication', 'Products', 'Networks', 'Capital', 'Ventures', 'Realty',
	'Builders', 'Landscapes', 'Plumbing', 'Mechanical', 'Roofing', 'Flooring',
	'Interiors', 'Exteriors', 'Industrial', 'Commercial'
];

const company_suffixes = [
	'LLC', 'Inc.', 'Co.', 'Group', 'Partners', 'Corp.', 'Holdings', 'Enterprises',
	'Services'
];

const family_names = [
	'Smith', 'Johnson', 'Williams', 'Anderson', 'Thompson', 'Miller', 'Davis',
	'Wilson', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Harris', 'Clark', 'Lewis',
	'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green',
	'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell', 'Roberts', 'Phillips',
	'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris',
	'Murphy', 'Cooper', 'Richardson', 'Cox'
];

const job_types = [
	'General Construction', 'New Construction', 'Renovation', 'Remodeling',
	'Demolition', 'Site Preparation', 'Concrete Work', 'Foundation Repair',
	'Roofing', 'Siding Installation', 'Window Installation', 'Door Installation',
	'Flooring', 'Painting', 'Drywall', 'Framing', 'Landscaping', 'Irrigation',
	'Property Inspection', 'Property Maintenance', 'Tenant Turnover',
	'Water Damage Restoration', 'Fire Damage Restoration', 'HVAC Installation',
	'HVAC Repair', 'HVAC Maintenance', 'Plumbing Repair', 'Plumbing Installation',
	'Electrical Repair', 'Electrical Installation', 'Generator Service',
	'Appliance Repair', 'Elevator Maintenance', 'Garage Door Repair',
	'Locksmith Service', 'Welding', 'Fabrication', 'Equipment Repair',
	'Equipment Installation', 'Equipment Maintenance', 'Machine Repair',
	'Preventive Maintenance', 'Facility Maintenance', 'Industrial Cleaning',
	'Factory Inspection', 'Safety Inspection', 'Calibration',
	'Automation Installation', 'Control System Repair', 'Conveyor Repair',
	'Material Handling', 'Industrial Electrical', 'Industrial Plumbing',
	'Structural Inspection', 'Environmental Inspection', 'Software Installation',
	'System Integration', 'Network Installation', 'Network Repair',
	'Security System Installation', 'Access Control Installation',
	'Camera Installation', 'IT Support', 'Data Migration', 'Cloud Migration',
	'Consulting', 'Engineering Review', 'Site Survey', 'Technical Inspection',
	'Compliance Audit', 'Delivery', 'Pickup', 'Freight Transport',
	'Equipment Transport', 'Warehouse Service', 'Inventory Audit', 'Route Service',
	'Field Inspection', 'Emergency Service', 'On-Site Repair', 'Scheduled Service',
	'Preventive Service'
];

const eligible_job_statuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Closed'];
const exported_at = '2026-08-16T18:30:00Z';
const reference_date = new Date('2026-08-16T15:00:00Z');

// A seeded generator keeps demos and tests reproducible across machines.
let random_state = 0x4c45414b;

function random() {
	random_state = (Math.imul(random_state, 1664525) + 1013904223) >>> 0;
	return random_state / 0x1_0000_0000;
}

function random_integer(min, max) {
	return min + Math.floor(random() * (max - min));
}

function random_choice(values) {
	return values[random_integer(0, values.length)];
}

function random_job_value() {
	const band = random_integer(0, 10);
	if (band < 5) return random_integer(250, 7_500);
	if (band < 8) return random_integer(7_500, 25_000);
	if (band < 9) return random_integer(25_000, 75_000);
	return random_integer(75_000, 200_000);
}

function date_days_ago(days_ago) {
	const date = new Date(reference_date);
	date.setUTCDate(date.getUTCDate() - days_ago);
	return date.toISOString().replace('.000Z', 'Z');
}

function make_company_name() {
	const adjective = random_choice(company_adjectives);
	const family_name = random_choice(family_names);
	const noun = random_choice(company_nouns);
	const suffix = random_choice(company_suffixes);
	return random_choice([
		`${adjective} ${noun}`,
		`${adjective} ${noun} ${suffix}`,
		`${family_name} ${noun}`,
		`${family_name} & Sons`,
		`${family_name} ${noun} ${suffix}`,
		`${adjective} ${family_name} ${noun}`,
		`${adjective} ${noun} Group`,
		`${adjective} ${noun} Partners`
	]);
}

function generate_dataset() {
	const customers = Array.from({ length: 30 }, (_, index) => ({
		id: `C-${10_000 + index}`,
		name: make_company_name(),
		status: 'active'
	}));

	const jobs = [];
	const invoices = [];
	let invoice_counter = 5_000;

	function add_invoice(job, status, total, created_at) {
		invoices.push({
			id: `INV-${invoice_counter++}`,
			job_id: job.id,
			customer_id: job.customer_id,
			status,
			total,
			currency: 'USD',
			created_at
		});
	}

	for (let index = 0; index < 100; index += 1) {
		const customer = random_choice(customers);
		const job_total = random_job_value();
		const scenario = random_integer(0, 100);
		let completed_days_ago = random_integer(1, 91);
		if (scenario >= 93 && completed_days_ago < 21) {
			completed_days_ago = random_integer(21, 91);
		}

		const job = {
			id: `J-${1_000 + index}`,
			customer_id: customer.id,
			description: random_choice(job_types),
			status: random_choice(eligible_job_statuses),
			total: job_total,
			currency: 'USD',
			completed_at: date_days_ago(completed_days_ago)
		};
		jobs.push(job);

		// Scenarios affect source records only; LeakCheck must infer discrepancies.
		if (scenario >= 85 && scenario < 93) {
			const invoice_total = random_integer(100, job_total);
			const age = Math.max(0, completed_days_ago - random_integer(0, 6));
			add_invoice(job, 'sent', invoice_total, date_days_ago(age));
		} else if (scenario >= 93) {
			const age = completed_days_ago - random_integer(0, 4);
			add_invoice(job, 'draft', job.total, date_days_ago(age));
		} else if (scenario >= 75 && scenario < 85) {
			// Missing invoice: intentionally emit no matching accounting record.
		} else if (scenario >= 65) {
			const first_total = random_integer(100, job_total);
			const second_total = job_total - first_total;
			const age = Math.max(0, completed_days_ago - random_integer(0, 6));
			add_invoice(job, 'sent', first_total, date_days_ago(age));
			add_invoice(job, 'sent', second_total, date_days_ago(age));
		} else {
			const age = Math.max(0, completed_days_ago - random_integer(0, 6));
			add_invoice(job, random_choice(['sent', 'paid', 'paid']), job.total, date_days_ago(age));
		}
	}

	return {
		company: { id: 'COMP-001', name: 'Acme HVAC', currency: 'USD' },
		crm_export: {
			source: 'HubSpot',
			exported_at,
			customers,
			jobs
		},
		accounting_export: {
			source: 'QuickBooks Online',
			exported_at,
			invoices
		}
	};
}

const output_path = resolve(process.argv[2] ?? 'src/lib/server/data/company-export.json');
const dataset = generate_dataset();
await mkdir(dirname(output_path), { recursive: true });
await writeFile(output_path, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
console.log(
	`Generated ${dataset.crm_export.customers.length} customers, ` +
	`${dataset.crm_export.jobs.length} jobs, and ` +
	`${dataset.accounting_export.invoices.length} invoices at ${output_path}`
);
