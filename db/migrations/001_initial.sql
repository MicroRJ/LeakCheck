CREATE TABLE organizations (
	id text PRIMARY KEY,
	name text NOT NULL,
	currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
	created_at timestamptz NOT NULL DEFAULT now()
);

-- statement-breakpoint

CREATE TABLE sync_runs (
	id text PRIMARY KEY,
	organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	source_system text NOT NULL,
	status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
	record_count integer NOT NULL DEFAULT 0 CHECK (record_count >= 0),
	started_at timestamptz NOT NULL,
	completed_at timestamptz,
	error_message text
);

-- statement-breakpoint

CREATE INDEX sync_runs_organization_completed_idx
	ON sync_runs (organization_id, completed_at DESC);

-- statement-breakpoint

CREATE TABLE customers (
	id text PRIMARY KEY,
	organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	source_system text NOT NULL,
	external_id text NOT NULL,
	name text NOT NULL,
	status text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (organization_id, source_system, external_id)
);

-- statement-breakpoint

CREATE TABLE jobs (
	id text PRIMARY KEY,
	organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	source_system text NOT NULL,
	external_id text NOT NULL,
	customer_id text NOT NULL REFERENCES customers(id),
	description text NOT NULL,
	status text NOT NULL,
	total_cents bigint NOT NULL CHECK (total_cents >= 0),
	currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
	completed_at timestamptz NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (organization_id, source_system, external_id)
);

-- statement-breakpoint

CREATE INDEX jobs_organization_completed_idx
	ON jobs (organization_id, completed_at DESC);

-- statement-breakpoint

CREATE TABLE invoices (
	id text PRIMARY KEY,
	organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	source_system text NOT NULL,
	external_id text NOT NULL,
	customer_id text REFERENCES customers(id),
	status text NOT NULL,
	total_cents bigint NOT NULL CHECK (total_cents >= 0),
	currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
	issued_at timestamptz NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (organization_id, source_system, external_id)
);

-- statement-breakpoint

CREATE INDEX invoices_organization_issued_idx
	ON invoices (organization_id, issued_at DESC);

-- statement-breakpoint

CREATE TABLE invoice_applications (
	organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
	job_id text NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
	amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
	PRIMARY KEY (invoice_id, job_id)
);

-- statement-breakpoint

CREATE INDEX invoice_applications_job_idx
	ON invoice_applications (job_id);
