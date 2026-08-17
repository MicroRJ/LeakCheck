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

From `W:\MicroRJ\LeakCheck`:

```powershell
npm run dev
```

Useful checks:

```powershell
npm test
npm run build
```

## Current data flow

```text
Browser dashboard -> /api/dashboard -> leak rules -> demo company export
```

The demo export lives at `src/lib/server/data/company-export.json`. Regenerate
it from the repository root with:

```powershell
..\elf\build\elf.exe .\scripts\dataset_generator.elf
```
