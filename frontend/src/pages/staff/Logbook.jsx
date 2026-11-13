import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ACTIONS, actionKey, describe, listAudit, toCsv } from "../../services/auditService.js";

const dayLabel = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeLabel = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function groupByDay(entries) {
  const groups = [];
  for (const e of entries) {
    const day = e.at.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.entries.push(e);
    else groups.push({ day, label: dayLabel(e.at), entries: [e] });
  }
  return groups;
}

export default function Logbook() {
  const [params, setParams] = useSearchParams();
  const action = params.get("action") ?? "";
  const q = params.get("q") ?? "";
  const [all, setAll] = useState(null);

  useEffect(() => {
    listAudit().then(setAll);
  }, []);

  const entries = useMemo(() => {
    if (!all) return [];
    const needle = q.trim().toLowerCase();
    return all.filter((e) => {
      if (action && actionKey(e) !== action) return false;
      if (!needle) return true;
      return `${describe(e)} ${e.actor?.name ?? ""} ${e.actor?.email ?? ""}`.toLowerCase().includes(needle);
    });
  }, [all, action, q]);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function exportCsv() {
    const blob = new Blob([toCsv(entries)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refound-logbook-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const counts = useMemo(() => {
    const c = {};
    for (const e of all ?? []) c[actionKey(e)] = (c[actionKey(e)] ?? 0) + 1;
    return c;
  }, [all]);

  return (
    <div className="container register">
      <Link to="/staff" className="back mono">← Back to the desk</Link>
      <header className="register__head desk__head">
        <div>
          <p className="eyebrow mono">Supervisor · audit history</p>
          <h1>
            The <em>logbook</em>
          </h1>
          <p className="muted">
            Every item logged, claim filed, decision made and handover recorded — who did it, and when. Claim answers are
            never written here.
          </p>
        </div>
        <button type="button" className="btn btn--ink" onClick={exportCsv} disabled={!entries.length}>
          ⇩ Export CSV
        </button>
      </header>

      <form className="searchstrip" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="logq" className="searchstrip__label mono">Find</label>
        <input
          id="logq"
          type="search"
          placeholder="Reference, claim no., student or staff name"
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          autoComplete="off"
        />
      </form>

      <div className="chips" role="group" aria-label="Filter by action">
        <button type="button" className={`chip${!action ? " is-active" : ""}`} onClick={() => setParam("action", "")}>
          Everything
          {all && <span className="chip__count">{all.length}</span>}
        </button>
        {Object.entries(ACTIONS).map(([key, a]) => (
          <button
            key={key}
            type="button"
            aria-pressed={action === key}
            className={`chip${action === key ? " is-active" : ""}`}
            onClick={() => setParam("action", action === key ? "" : key)}
          >
            {a.label}
            <span className="chip__count">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {all === null ? (
        <p className="mono muted">Opening the logbook…</p>
      ) : entries.length === 0 ? (
        <div className="empty">
          <h2>{all.length ? "No entries match." : "The logbook is empty."}</h2>
          <p className="muted">
            {all.length
              ? "Try another filter or search."
              : "Entries appear here as staff log items, students file claims, and claims are reviewed or handed over."}
          </p>
        </div>
      ) : (
        <div className="logbook">
          {groupByDay(entries).map((g) => (
            <section key={g.day} className="logbook__day">
              <h2 className="logbook__date">{g.label}</h2>
              <ol className="logbook__lines">
                {g.entries.map((e) => {
                  const meta = ACTIONS[actionKey(e)] ?? { label: e.action, tone: "ink" };
                  return (
                    <li key={e.id} className="logline">
                      <time className="logline__time mono" dateTime={e.at}>{timeLabel(e.at)}</time>
                      <span className={`logline__action logline__action--${meta.tone} mono`}>{meta.label}</span>
                      <span className="logline__text">{describe(e)}</span>
                      <span className="logline__who mono">
                        {e.actor?.name ?? "System"}
                        <span className="logline__role"> · {e.actor?.role ?? "—"}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
