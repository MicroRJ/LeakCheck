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
