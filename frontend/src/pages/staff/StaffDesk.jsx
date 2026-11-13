import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { formatDate } from "../../services/itemsService.js";
import { getDeskSummary } from "../../services/staffService.js";

export default function StaffDesk() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    getDeskSummary().then(setSummary);
  }, []);

  const stats = summary && [
    { label: "Claims to review", value: summary.pending, to: "/staff/claims?tab=pending", tone: "stamp" },
    { label: "Waiting for pickup", value: summary.awaitingHandover, to: "/staff/claims?tab=approved", tone: "sky" },
    { label: "Items on the rack", value: summary.onRack, to: "/items", tone: "marker" },
    { label: "Returned to owners", value: summary.returned, to: "/staff/claims?tab=returned", tone: "rose" },
  ];

  return (
    <div className="container register">
      <header className="register__head desk__head">
        <div>
          <p className="eyebrow mono">Help desk · staff only</p>
          <h1>
            Good to see you, <em>{user.name.split(" ")[0]}.</em>
          </h1>
          <p className="muted">Log what's handed in, check claims against what you logged, and hand items back.</p>
        </div>
        <div className="desk__actions">
          <Link to="/staff/items/new" className="btn btn--stamp btn--lg">
            + Log a found item
          </Link>
          <Link to="/staff/claims" className="btn btn--ghost btn--lg">
            Review claims
          </Link>
          {user.role === "supervisor" && (
            <Link to="/staff/logbook" className="btn btn--ghost btn--lg">
              Open logbook
            </Link>
          )}
        </div>
      </header>

      {!summary ? (
        <p className="mono muted">Opening the ledger…</p>
      ) : (
        <>
          <div className="counters">
            {stats.map((s) => (
              <Link key={s.label} to={s.to} className={`counter counter--${s.tone}`}>
                <span className="counter__value">{String(s.value).padStart(2, "0")}</span>
                <span className="counter__label mono">{s.label}</span>
              </Link>
            ))}
          </div>

          <div className="desk__grid">
            <section className="ledger">
              <h2 className="ledger__title">
                In the tray <span className="mono small muted">· newest claims</span>
              </h2>
              {summary.queue.length === 0 ? (
                <p className="ledger__empty mono">Tray's empty. No claims waiting.</p>
              ) : (
                <ul className="ledger__list">
                  {summary.queue.map((c) => (
                    <li key={c.id}>
                      <Link to={`/staff/claims?tab=pending#${c.id}`} className="ledger__row">
                        <span className="mono small">{c.id}</span>
                        <span className="ledger__what">
                          <strong>{c.item.title}</strong>
                          <span className="muted small"> claimed by {c.claimant.name}</span>
                        </span>
                        <span className="mono small muted">{formatDate(c.submittedAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ledger">
              <h2 className="ledger__title">
                Logged by the desk <span className="mono small muted">· this browser</span>
              </h2>
              {summary.recentItems.length === 0 ? (
                <p className="ledger__empty mono">Nothing logged yet. Start with “Log a found item”.</p>
              ) : (
                <ul className="ledger__list">
                  {summary.recentItems.map((i) => (
                    <li key={i.ref}>
                      <Link to={`/items/${i.ref}`} className="ledger__row">
                        <span className="mono small">{i.ref}</span>
                        <span className="ledger__what">
                          <strong>{i.title}</strong>
                          <span className="muted small"> · {i.location}</span>
                        </span>
                        <span className="mono small muted">{i.status.replace("_", " ")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
