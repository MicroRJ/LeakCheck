# LeakCheck

LeakCheck reconciles completed CRM jobs with accounting invoices and surfaces
revenue that may not have been billed.

## Project layout

```text
src/
  routes/                 SvelteKit pages and HTTP endpoints
  lib/server/             Leak rules and server-only data
static/                   Public assets
scripts/                  Development utilities
db/migrations/            Versioned PostgreSQL schema changes
```

The product is the SvelteKit application at the repository root. There is no
separate frontend or demo server.

## Run it

```powershell
npm run dev
```

Useful checks:

```powershell
npm test
npm run build
```

To regenerate the deterministic demo-company export:

```powershell
npm run data:generate
```

The database seed script imports that generated JSON file.

## Database

LeakCheck uses PostgreSQL through a server-only `DATABASE_URL`. Copy
`.env.example` to `.env.local` or pull the development environment from Vercel,
then initialize the database with:

```powershell
npm run db:setup
```

This applies versioned SQL migrations and replaces only the `COMP-001` demo
organization with the bundled demo export. Run `db:migrate` independently for
schema upgrades that must preserve application data.
