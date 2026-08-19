# Backup & Disaster Recovery

> **Last updated:** 2026-08-19
> **Scope:** PostgreSQL database (Supabase), uploaded images (local disk on Render), and application code.

---

## 1. Current backup posture — what is automatically protected

### 1.1 Database — Supabase

Supabase's backup offerings vary by plan tier. The table below is **verified** against Supabase's official documentation
([Database Backups](https://supabase.com/docs/guides/platform/backups),
[Pricing](https://supabase.com/pricing)) as of 2026-08-19.

| Plan        | Daily backups | Retention     | Point-in-Time Recovery (PITR) | Free-tier auto-pause   |
| ----------- | ------------- | ------------- | ----------------------------- | ---------------------- |
| **Free**    | **None**      | 0 days        | Not available                 | After 1 week inactivity |
| **Pro**     | Yes           | 7 days        | Paid add-on (~$100/mo/7 days) | Never                  |
| **Team**    | Yes           | 14 days       | Usually included              | Never                  |
| **Enterprise** | Yes        | 30 days       | Usually included              | Never                  |

> **NOT VERIFIED — current plan tier:** The exact Supabase plan this project
> is on could not be confirmed without access to the Supabase dashboard
> (project ref: `szwqswzeuclgdimeqmro`). However,
> `src/backend/config/db.ts:37` contains a comment — *"keep pool small to
> respect Supabase free-tier limits"* — that **suggests the project is
> currently on the Free tier**. This is an in-repo hint, not proof. **You
> must confirm the actual plan in the Supabase Dashboard** under
> *Project Settings → Billing* before relying on any of the guarantees below.

### 1.2 If on the Free tier (most likely currently)

- **No automatic database backups.** Supabase explicitly recommends:
  > *"We recommend that free tier plan projects regularly export their data
  > using the Supabase CLI `db dump` command and maintain off-site backups."*
  > — [Supabase Docs: Backups](https://supabase.com/docs/guides/platform/backups)
- Free projects **pause after 1 week of inactivity**, which can interrupt
  the always-on process needed for Socket.io.
- **RPO (recovery point objective) is unbounded** — if the project is
  deleted or corrupted, the most recent recoverable data is from your last
  manual dump.

### 1.3 Uploaded images — Render persistent disk

- Product images are uploaded by admins via `POST /api/admin/upload/image`
  and stored on the **local filesystem** at `uploads/products/` (see
  `src/backend/controllers/upload.controllers.ts:31`).
- They are served statically at `/uploads/products/<filename>`
  (`server.ts:142`).
- **Render's Starter plan uses an ephemeral filesystem by default.** Verified
  from Render docs:
  > *"By default, Render services have an ephemeral filesystem. This means
  > that without a persistent disk, any changes you make to a service's local
  > files are lost every time the service redeploys or restarts."*
  > — [Render: Persistent Disks](https://render.com/docs/disks)
- **No persistent disk is configured** for this service in `render.yaml`.
  This means: **every deploy or restart wipes all uploaded images.**
  There is no backup and no persistence for uploaded files.

---

## 2. Manual restore / backup procedures

### 2.1 Taking a manual logical database backup (Free tier workaround)

If the project is on the Free tier, run this regularly and store the dump file
off-site (e.g., a private S3 bucket):

```bash
# Prerequisites: Supabase CLI installed and linked to this project
# Install: https://supabase.com/docs/guides/getting-started/local-development
# Link:    supabase link --project-ref szwqswzeuclgdimeqmro

# Full dump (schema + data, excluding Supabase-managed schemas like auth/storage)
supabase db dump --linked --file ./backup/manual-dump-$(date +%Y%m%d).sql

# Schema-only dump (migrations-style, smaller)
supabase db dump --linked --schema public --file ./backup/schema-$(date +%Y%m%d).sql

# Data-only dump
supabase db dump --linked --data-only --file ./backup/data-$(date +%Y%m%d).sql
```

You can also use `pg_dump` directly with the `DATABASE_URL` from your
environment, but the CLI handles Supabase-specific schema exclusions
automatically.

### 2.2 Restoring from a manual dump

```bash
# 1. If restoring to a NEW project, create the project first in the dashboard.

# 2. Restore using the CLI (link to the target project first):
supabase db push --linked  # if you have migration files
# OR for a raw dump:
psql "$DATABASE_URL" -f ./backup/manual-dump-20260801.sql

# 3. Reset custom role passwords if the dump included custom roles
# (Supabase does not store role passwords in backups for security).
```

### 2.3 Restoring from a Supabase daily backup (Pro/Team/Enterprise only)

If on a paid tier that has daily backups:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Navigate to **Database → Backups → Scheduled**.
3. Find the backup closest to (but before) your desired restore point.
4. Click **Restore**. A confirmation modal appears.
5. Review the downtime warning (the project is inaccessible during restore).
   Downtime scales with database size.
6. Click **Restore** to confirm. The dashboard shows progress.
7. After restore completes, if you use custom database roles, **reset their
   passwords** (Supabase does not restore role passwords for security).

### 2.4 Restoring via Point-in-Time Recovery (PITR, Pro/Team/Enterprise + add-on)

1. Go to **Database → Backups → Point in Time**.
2. Use the calendar + time picker to select the exact second to restore to
   (within the retention window — 7/14/28 days depending on your add-on).
3. Review and confirm. The project is taken offline while Supabase:
   a. Restores the most recent base snapshot before your target time.
   b. Replays WAL (Write-Ahead Log) segments up to your target timestamp.
4. The dashboard notifies you when restoration completes.

**Programmatic restore via Management API:**
```bash
export SUPABASE_ACCESS_TOKEN="your-access-token"   # from https://supabase.com/dashboard/account/tokens
export PROJECT_REF="szwqswzeuclgdimeqmro"

# Restore to a specific Unix timestamp
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups/restore-pitr" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recovery_time_target_unix": "1735689600"}'
```

### 2.5 Restoring uploaded images

**This is the highest-risk gap.** Images are stored on Render's ephemeral disk
and are **not** backed up anywhere. If the instance restarts:

- On a Free/Starter plan without a persistent disk, **the images are lost**
  with no recovery possible.
- **Immediate mitigation:** Manually download the `uploads/` directory via
  Render Shell + SCP before any deploy:
  ```bash
  # From your local machine
  scp -s YOUR_SERVICE@ssh.frankfurt.render.com:/opt/render/project/src/uploads ./
  ```
- **Long-term fix:** Migrate image storage to Supabase Storage
  (`supabase.storage.from('product-images')`) or S3. Note: Supabase Storage
  objects are **also not covered by PITR** (WAL only covers the Postgres
  database), so they need their own bucket-level backup plan.

---

## 3. Is the current tier sufficient?

**Recommendation: No — if on the Free tier, this is not sufficient for
production.**

This is an e-commerce application handling real payments (Fapshi) and
customer data. The Free tier's lack of automatic backups, combined with
ephemeral-disk image storage and 1-week auto-pause, creates multiple
single-points-of-failure:

| Risk                          | Free tier                    | Pro tier                     |
| ----------------------------- | ---------------------------- | ---------------------------- |
| Database RPO                  | Unbounded (last manual dump) | ≤ 24 hours (daily snapshot)  |
| Database RTO                  | Manual restore               | Dashboard restore            |
| PITR granularity              | Not available                | ~1 second (add-on, ~$100/mo) |
| Free-tier auto-pause          | After 1 week inactivity      | Never                        |
| Uploaded image persistence    | Lost on every deploy         | Lost (no disk configured)    |

**Recommended minimum:** Upgrade to **Pro ($25/mo)** for automatic daily
backups with 7-day retention. For an e-commerce app with real transactions,
add **PITR ($100/mo for 7 days)** to reduce the RPO from 24 hours to ~2
minutes — the cost of a single day of lost orders far exceeds the monthly
PITR fee.

**Action items for the human:**
1. **Confirm the current Supabase plan** in the dashboard.
2. If Free tier → **upgrade to Pro** and **enable PITR** (7-day retention
   minimum).
3. Add a **persistent disk** to the Render service in `render.yaml` OR migrate
   uploads to Supabase Storage/S3 with a separate backup strategy.
4. Set up a **cron-based `supabase db dump`** as a belt-and-suspenders
   off-site backup regardless of tier:
   ```bash
   # Example: nightly dump via Supabase CLI or pg_dump, uploaded to S3
   0 2 * * * supabase db dump --linked --file /tmp/backup.sql && aws s3 cp /tmp/backup.sql s3://your-backup-bucket/
   ```

---

## 4. What is NOT covered by any of the above

| Asset                        | Covered? | Notes                                                                 |
| ---------------------------- | -------- | --------------------------------------------------------------------- |
| Supabase Postgres database   | Yes (Pro+) | Daily snapshots; PITR add-on on Pro/Team                             |
| Supabase Storage (S3 buckets)| **No**   | Not in WAL; not covered by PITR or daily snapshots                   |
| Edge Function code           | **No**   | Not in WAL; must be version-controlled                               |
| Uploaded images (local disk) | **No**   | Ephemeral on Render; wiped on every deploy/restart                   |
| Custom DB role passwords     | **No**   | Supabase does not back up role passwords; must be reset after restore|
| Project deletion             | **No**   | Deleting a project permanently removes all data including backups     |
| Environment variables/secrets| **No**   | Stored per-service; no automated export                              |

---

## 5. Quick reference — emergency checklist

```
1. Determine current Supabase plan: Supabase Dashboard → Project Settings → Billing
2. Was the DB corrupted or a table dropped?
   - Pro/Team/Enterprise with PITR? → Restore via Dashboard → Database → Backups → Point in Time
   - Pro/Team/Enterprise daily backup? → Restore via Dashboard → Database → Backups → Scheduled
   - Free tier? → Restore from your last `supabase db dump` file
3. Are uploaded images missing?
   - Check if a persistent disk was recently attached.
   - If not, images are unrecoverable — migrate to Storage/S3 + off-site backup.
4. After any restore: reset custom DB role passwords, verify JWT_SECRET still matches.
5. Post-restore: run `npm run lint && npm run build` to confirm app code integrity.
```
