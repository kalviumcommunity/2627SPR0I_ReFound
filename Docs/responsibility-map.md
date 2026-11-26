# Cloud Responsibility Map — ReFound

## Assigned host and service model

**Host:** Render free tier (recorded in [SETUP.md](../SETUP.md#host-for-this-sprint); there is no second host).
**Model:** **PaaS.**

Render runs the operating system, the language runtime, the internal network and TLS. We hand it a repo and environment variables, and we never get a shell on a machine we have to patch. Render's own [Shared Responsibility Model](https://render.com/docs/shared-responsibility-model) draws the line. Render secures the infrastructure and keeps the operating systems patched. We own secrets, access, application configuration and our own disaster recovery.

Services on this host:

| Service | Render type | Region |
|---|---|---|
| `backend/` (Express API) | Free web service | Singapore |
| PostgreSQL | Free Render Postgres | Singapore, same as the API |
| `frontend/` (Vite build) | Static site | Global CDN (static sites have no region) |

## The map

Owner is either **Provider** (Render) or **Team: one named student**. A **Split** row names what each side owns.

| Layer | Owner | Evidence |
|---|---|---|
| Hardware and facility | **Provider** | [Render Shared Responsibility Model](https://render.com/docs/shared-responsibility-model): Render is responsible for *"Securing the infrastructure that hosts all hardware, software, networking, and facilities."* |
| OS patches | **Provider** | [Render Shared Responsibility Model](https://render.com/docs/shared-responsibility-model): *"Making sure all underlying operating systems are patched and up to date."* |
| Container runtime | **Provider** | [Render Shared Responsibility Model](https://render.com/docs/shared-responsibility-model): *"Ensuring that the runtime environments for supported programming languages and frameworks are secure and up to date."* We deploy with Render's native Node runtime, so there is no Docker host for us to maintain. (We use Docker only on our laptops, per [SETUP.md](../SETUP.md).) |
| Network and firewall | **Split.** **Provider:** edge network and all internal networking between our services and the database. **Team: Jeevan_HD** owns the Postgres external-access IP allow-list. | Provider: [Shared Responsibility Model](https://render.com/docs/shared-responsibility-model): *"All internal networking between services and databases."* Team: [Render Postgres access control](https://render.com/docs/postgresql-creating-connecting): *"By default, your Render Postgres instance is accessible from any IP address"* (`0.0.0.0/0`). **Not yet done:** the allow-list is narrowed or cleared in the cloud firewall LU. The API connects over the internal URL, so it does not need external access. |
| TLS certificate | **Provider** | [Render TLS docs](https://render.com/docs/tls): *"All applications and static sites hosted on Render come with fully managed and free TLS certificates."* Free web services list *"Managed TLS certificates"* on the [free tier page](https://render.com/docs/free). |
| Database backups | **Team: Jeevan_HD** | [Render free tier page](https://render.com/docs/free): *"Free Render Postgres databases don't support any form of backups"* and *"expire 30 days after creation."* Render's [Shared Responsibility Model](https://render.com/docs/shared-responsibility-model) also leaves *"business continuity and disaster recovery plans"* with the customer. **Now:** [`scripts/db-backup.sh`](../scripts/db-backup.sh) takes and restores a `pg_dump` of this schema, and [backups.md](backups.md) is the runbook plus a restore drill. Still ours to run, not to write: the schedule and the private destination. |
| Secrets and config | **Team: Danushri Prakash** | Stored in **Render → Service → Environment** (`DATABASE_URL`, `JWT_SECRET`, `STAFF_*`). Variable names only, documented in [backend/.env.example](../backend/.env.example). `.env` is git-ignored ([.gitignore](../.gitignore)). Render's model: customers own *"Protecting all secrets within their organization."* |
| Application code | **Team: Danushri Prakash** (primary), Jeevan_HD (secondary) | [backend/src/](../backend/src/) and [frontend/src/](../frontend/src/). Render's model: customers own *"Security of application-level configurations"* and *"Regular security assessments of their applications."* |

Every Team row names a student. Each named owner confirms their rows in the pull request discussion:

| Owner | Rows they confirm | Where |
|---|---|---|
| Danushri Prakash | Secrets and config, Application code | Comment on PR #17 and on this follow-up PR |
| Jeevan_HD | Database backups, Network allow-list, Application code (secondary) | Comment and approval on this follow-up PR |

## What we would have wrongly assumed

Our first guess was "Render handles the database, so Render keeps it safe." That is right for the server underneath and wrong for the data. On a VM we would have made the classic mistake: assuming the cloud company patches the OS when the provider's docs say the guest OS is ours. On Render the OS really is the provider's row ("all underlying operating systems are patched and up to date"), so that line moves. **The backup line does not.** The free Postgres database has no backups of any kind and expires after 30 days. If we had written "Database backups: Provider", the map would have looked complete. Then on day 31, or after one bad `DELETE`, every lost-item report and claim would be gone with nothing to restore. That one row is why the backups row names Jeevan_HD and not Render.

## Region and location

The API and the database both run in **Render Singapore**, the nearest of Render's five regions (Oregon, Ohio, Virginia, Frankfurt, Singapore) to our campus users in India. They must share a region. Render gives *"each region … a separate private network,"* and the API reaches Postgres over the internal URL only within the same region. Render also *"doesn't currently support changing the region for an existing service or database,"* so this is chosen once at creation. The frontend is a static site, which Render serves from a global CDN with no region.

The region is fixed in code, not just in the dashboard: [render.yaml](../render.yaml) sets `region: singapore` on both the API and the database, so a redeploy can't drift to another region.

Measured connect time from the campus network, using [Docs/measure-connect.ps1](measure-connect.ps1). It wakes the free service first (free web services spin down after 15 minutes without traffic), then times five TCP connects to `/api/health` and reports the median:

```powershell
powershell -ExecutionPolicy Bypass -File Docs/measure-connect.ps1 https://refound-api.onrender.com
```

**Result: `MEASURED_VALUE` s** (median of 5, campus Wi-Fi, MEASURED_DATE).
