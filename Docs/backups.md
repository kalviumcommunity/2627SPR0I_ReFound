# Backups — the ReFound database

The database is the one part of this project the provider does not protect.
Render's free tier says free Postgres databases *"don't support any form of
backups"* and *"expire 30 days after creation"* (quoted in
[responsibility-map.md](responsibility-map.md), where this row is assigned to
Jeevan_HD). So a bad `DELETE`, a mistaken restore, or day 31 takes every found
item, claim and audit row with it.

[`scripts/db-backup.sh`](../scripts/db-backup.sh) is the safety net: it takes a
`pg_dump` and can restore one.

## Take a backup

```
bash scripts/db-backup.sh
```

- Reads `DATABASE_URL` from the environment, or from `.env` / `backend/.env`.
- Writes `backups/refound-<UTC timestamp>.sql.gz` — plain SQL, gzipped, with
  `--no-owner --no-privileges`, so it restores under any role name (the local
  `refound` role and Render's generated role are different).
- **Refuses to leave a file behind** if the dump is not valid gzip or contains no
  `CREATE TABLE`. An empty dump that looks successful is worse than no dump.
- Keeps the newest 14 dumps (`KEEP=14`), pruning older ones.
- Prints the target with the password masked, so a pasted log is safe.

### Against the deployed database

Point `DATABASE_URL` at Render's **external** connection string for one run:

```
DATABASE_URL='postgres://...@<host>.render.com/<db>' bash scripts/db-backup.sh
```

The free database currently accepts connections from any IP (see the
network row in [responsibility-map.md](responsibility-map.md)), so this works
from campus. If that allow-list is ever narrowed, run the backup from a machine
on the list.

## Restore

```
bash scripts/db-backup.sh --restore backups/refound-<stamp>.sql.gz --force
```

- `--force` is required because a restore overwrites data.
- The file is applied in **one transaction** (`psql -1`): if it fails halfway, the
  target is left exactly as it was.
- It tells you if the target already has tables before writing over them.

## Where to keep the dumps

- **Not in git.** `backups/` is ignored.
- Keep them somewhere private — a team drive or an encrypted archive. A dump
  contains claim answers, student emails and ID checks: it is personal data and
  deserves the same care as the live database.

## Scheduling

A cron entry on a machine that is usually on:

```
0 3 * * * cd /path/to/2627SPR0I_ReFound && ./scripts/db-backup.sh >> backups/backup.log 2>&1
```

Be honest about what that gives you: a laptop cron only runs while the laptop is
on and awake. For this sprint, run a backup manually before anything risky (a
demo, a bulk import, a schema change) and after each demo.

## Drill — do this once, it takes two minutes

A backup you have never restored is a guess. Prove it:

```
# 1. a scratch database to restore into (never the live one)
psql "$DATABASE_URL" -c 'CREATE DATABASE refound_restore_check'

# 2. restore the newest dump into it
DATABASE_URL='<same host>/refound_restore_check' \
  bash scripts/db-backup.sh --restore "$(ls -1t backups/refound-*.sql.gz | head -1)" --force

# 3. the numbers must match the live database
psql "$DATABASE_URL" -c "select (select count(*) from items) items, (select count(*) from claims) claims, (select count(*) from users) users"
psql '<same host>/refound_restore_check' -c "select (select count(*) from items) items, (select count(*) from claims) claims, (select count(*) from users) users"

# 4. clean up
psql "$DATABASE_URL" -c 'DROP DATABASE refound_restore_check'
```

**Not yet run against the deployed database.** Run this drill once on a machine
with a `pg_dump` at least as new as the server (PostgreSQL 16 here), record the
date below, and treat it as part of the demo checklist.

```
Last drill: <date> — restored <file> into refound_restore_check; counts matched: <yes/no>
```
