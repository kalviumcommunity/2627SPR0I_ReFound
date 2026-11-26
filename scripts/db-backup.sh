#!/usr/bin/env bash
# Back up the ReFound database, or restore a dump into it.
#
#   bash scripts/db-backup.sh                          # write backups/refound-<utc>.sql.gz
#   bash scripts/db-backup.sh --restore FILE --force    # load a dump into $DATABASE_URL
#
# Reads DATABASE_URL from the environment, or from .env / backend/.env.
# Free Render Postgres keeps no backups of its own, so this script is the safety
# net. The runbook, including where to keep the files, is Docs/backups.md.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP="${KEEP:-14}"

say()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

# ---------- connection ----------
if [[ -z "${DATABASE_URL:-}" ]]; then
  for f in "$ROOT/.env" "$ROOT/backend/.env"; do
    [[ -f "$f" ]] || continue
    set -a
    # shellcheck disable=SC1090
    . "$f"
    set +a
    [[ -n "${DATABASE_URL:-}" ]] && break
  done
fi
[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL is not set. Put it in .env or export it."

# Never print the password, even in an error message.
masked="$(printf '%s' "$DATABASE_URL" | sed -E 's#(://[^:/]+:)[^@]*@#\1***@#')"
say "target ${masked}"

command -v pg_dump >/dev/null 2>&1 || die "pg_dump is missing. It ships with postgresql-client — see SETUP.md."
command -v psql    >/dev/null 2>&1 || die "psql is missing. It ships with postgresql-client — see SETUP.md."

public_tables() {
  psql "$DATABASE_URL" -tAc \
    "select count(*) from information_schema.tables where table_schema = 'public'" 2>/dev/null || echo 0
}

# ---------- restore ----------
if [[ "${1:-}" == "--restore" ]]; then
  file="${2:-}"
  [[ -n "$file" && -f "$file" ]] || die "Usage: $0 --restore <file.sql.gz> --force"
  [[ "${3:-}" == "--force" || "${FORCE:-}" == "yes" ]] \
    || die "Restoring overwrites the target database. Re-run with --force if that is what you want."

  existing="$(public_tables)"
  if [[ "$existing" != "0" ]]; then
    warn "the target already has $existing tables; the dump is applied on top of them"
  fi

  say "restoring $file"
  # -1 wraps the whole file in one transaction: a failure halfway leaves the database untouched.
  gunzip -c "$file" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -q
  say "restore complete — $(( $(public_tables) )) tables in $(printf '%s' "$masked")"
  exit 0
fi

# ---------- backup ----------
mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/refound-$stamp.sql.gz"
# Two dumps inside the same second would otherwise collide and the second one die.
suffix=1
while [[ -e "$out" ]]; do
  suffix=$((suffix + 1))
  out="$BACKUP_DIR/refound-$stamp-$suffix.sql.gz"
done

say "dumping to $out"
# --no-owner/--no-privileges: the dump restores under a different role name, which
# is the normal case (local `refound` vs Render's generated role).
# If pg_dump fails, the redirect has already created a file: remove it, so a broken
# run never leaves something that looks like a usable backup.
if ! pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" | gzip -9 > "$out"; then
  rm -f "$out"
  die "pg_dump failed — no dump written. Is DATABASE_URL reachable from here?"
fi

gzip -t "$out" 2>/dev/null || { rm -f "$out"; die "the dump is not valid gzip; nothing written"; }

# A dump with no tables restores to an empty database and looks like a success.
tables="$(gzip -dc "$out" | grep -c '^CREATE TABLE' || true)"
if [[ "$tables" -eq 0 ]]; then
  rm -f "$out"
  die "the dump contains no tables — is DATABASE_URL pointing at the right database?"
fi

say "wrote $(du -h "$out" | cut -f1) with $tables tables"

# Keep the newest $KEEP dumps and drop the rest.
mapfile -t old < <(ls -1t "$BACKUP_DIR"/refound-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)))
for f in "${old[@]:-}"; do
  [[ -n "$f" ]] || continue
  say "pruning $(basename "$f")"
  rm -f "$f"
done

say "done — $(ls -1 "$BACKUP_DIR"/refound-*.sql.gz 2>/dev/null | wc -l) dump(s) kept in $BACKUP_DIR"
