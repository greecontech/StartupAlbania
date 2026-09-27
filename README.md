# Greecon Platform

Operational platform of **Greecon shpk** for monitoring energy, water and agriculture sites. It is built within the **Startup Albania 2026** project, supported by the Ministry of Economy and Innovation.

This repository is the working base of the platform described in the project's technology development deliverables: **D1**, the work plan, and **D2**, the functional and technical specification. [`docs/requirements-coverage.md`](docs/requirements-coverage.md) maps each D2 requirement to what is implemented.

## What it does

| Module | D2 | Summary |
|---|---|---|
| Sign-in and roles | §5.1, §9.1 | Email and password sign-in. Three roles: **Administrator**, **Operator** and **Authorized user** (read-only). Access is enforced on the server. |
| Dashboard | §5.2 | Key figures, alerts that need attention, and each site's metrics with 24-hour trends. |
| Data | §5.3 | Every reading, filterable by site, metric, origin and period. Supports manual entry, CSV import and CSV export. |
| Sites and sources | §5.4 | Sites, data sources (device, API, manual), and metrics with lower and upper limits. Sources get API keys for ingestion. |
| Monitoring | §5.5, §9.4–9.5 | A chart for each metric with its limits, a period selector (24 h to 90 days, or custom), and comparison with the previous period. |
| Alerts | §5.6, §9.6 | An alert is raised when a reading crosses a limit: warning or critical. Alerts can be acknowledged or resolved, and they close automatically once values return to range. |
| Reports | §5.7, §9.7 | A summary per metric for a chosen period: min, max, average, change against the previous period, share of readings outside limits, and alerts. Can be exported to CSV or printed. |
| Administration | §5.8 | Users and roles, organization settings, system status and a full audit log. |
| Project plan | Aneksi 1 | Startup Albania activity plan (Gantt chart), the current month, and the status of deliverables D1–D7. |

## Stack

- **Next.js 16** (App Router, server components and server actions) with TypeScript.
- **PostgreSQL** accessed through `pg`. The schema is plain SQL in `db/`, applied by `scripts/migrate.mjs` on every start.
- Sessions use signed JWT cookies (`jose`), and passwords are hashed with bcrypt.
- Charts are server-rendered SVG, with no client-side chart library.
- The design follows the Greecon design system: IBM Plex Serif and the brand palette.

## Deploying to Railway

1. **Create a project.** In Railway, choose **New Project → Deploy from GitHub repo** and select `greecontech/StartupAlbania`. Railway reads `railway.json`, builds the `Dockerfile` and uses `/api/health` as the health check.
2. **Add a database.** Choose **+ New → Database → PostgreSQL** in the same project.
3. **Set variables.** Under the app service's **Variables**, set the following (see `.env.example`):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (a reference to the Postgres service) |
   | `SESSION_SECRET` | A random string of 32 or more characters, e.g. `openssl rand -base64 48` |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | The first administrator, created on first start |
   | `SEED_DEMO` | `true` for demo sites with 30 days of history (optional) |
   | `SIMULATOR` | `true` for live simulated readings every 60 s (optional) |
   | `PROJECT_START_DATE` | `2026-09-01` |

4. **Get a URL.** Under **Settings → Networking → Generate Domain**, create a public URL. A custom domain such as `platform.greecon.earth` can be added in the same place.
5. **Deploy and sign in.** Deploy, then sign in with the admin account and change the password under **Account**.

Every start runs the database migrations, which are idempotent and safe to repeat, before the server starts.

To remove the demo data later, set `SEED_DEMO` and `SIMULATOR` to `false`. Then delete the demo sites under **Sites & sources**.

## Local development

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD
set -a; . ./.env; set +a
npm run migrate
npm run dev                 # http://localhost:3000
```

Checks:

```bash
npm run typecheck
npm test
npm run build
```

## Sending data from devices

Create a source of type **Device** or **API integration** under **Sites & sources** and copy its key. It is shown only once. Then send readings:

```bash
curl -X POST https://<your-domain>/api/ingest \
  -H "Authorization: Bearer gk_xxxxxxxx_..." \
  -H "Content-Type: application/json" \
  -d '{"readings":[{"metric":"soil_moisture","value":31.4,"unit":"%"}]}'
```

The API accepts up to 5,000 readings per request, and timestamps are optional (ISO 8601). A metric key the platform hasn't seen before is created automatically. A request with any invalid reading is rejected as a whole, with the index and reason for each error.

## Structure

```
db/                    SQL migrations (schema, project plan)
scripts/migrate.mjs    applies migrations, creates the first admin
src/instrumentation.ts demo seed and simulator on server start
src/lib/               database, session, roles, ingestion and alerting, queries, reports
src/app/(app)/         authenticated pages
src/app/api/           health, ingestion and CSV export endpoints
tests/                 unit tests (node --test)
```
