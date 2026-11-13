import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate } from "../../services/itemsService.js";
import { listClaims, recordHandover, reviewClaim } from "../../services/staffService.js";

const TABS = [
  { key: "pending", label: "To review", match: (c) => c.status === "pending" },
  { key: "approved", label: "Waiting for pickup", match: (c) => c.status === "approved" && !c.handedOverAt },
  { key: "returned", label: "Returned", match: (c) => Boolean(c.handedOverAt) },
  { key: "rejected", label: "Rejected", match: (c) => c.status === "rejected" },
];

export default function ReviewClaims() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.key === params.get("tab")) ?? TABS[0];
  const [claims, setClaims] = useState(null);

  const load = useCallback(() => listClaims().then(setClaims), []);
  useEffect(() => {
    load();
  }, [load]);

  const visible = claims?.filter(tab.match) ?? [];

  return (
    <div className="container register">
      <Link to="/staff" className="back mono">← Back to the desk</Link>
      <header className="register__head">
        <p className="eyebrow mono">Claims · staff only</p>
        <h1>
          Check every claim against <em>the record</em>
        </h1>
        <p className="muted">Compare what the student says with what the desk logged. Approve only if it matches.</p>
      </header>

      <div className="chips tabs" role="tablist" aria-label="Claim status">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab.key === t.key}
            className={`chip${tab.key === t.key ? " is-active" : ""}`}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
          >
            {t.label}
            {claims && <span className="chip__count">{claims.filter(t.match).length}</span>}
          </button>
        ))}
      </div>

      {claims === null ? (
        <p className="mono muted">Pulling the folders…</p>
      ) : visible.length === 0 ? (
        <div className="empty">
          <h2>Nothing here.</h2>
          <p className="muted">
            {tab.key === "pending"
              ? "No claims are waiting. When a student claims an item, it lands here."
              : "No claims in this pile yet."}
          </p>
        </div>
      ) : (
        <div className="casefiles">
          {visible.map((c) => (
            <CaseFile key={c.id} claim={c} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function CaseFile({ claim, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [idChecked, setIdChecked] = useState(false);
  const [idNote, setIdNote] = useState("");
  const { item, claimant, answers } = claim;

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const stampText = claim.handedOverAt ? "returned" : claim.status;

  return (
    <article className="casefile" id={claim.id}>
      <div className="casefile__tab mono">{claim.id}</div>
      <header className="casefile__head">
        <div>
          <p className="mono small muted">
            Filed {formatDate(claim.submittedAt)} · item <Link to={`/items/${item.ref}`}>{item.ref}</Link>
          </p>
          <h3>{item.title}</h3>
        </div>
        <span className={`stamp stamp--inline stamp--${stampText}`}>{stampText}</span>
      </header>

      <div className="casefile__grid">
        <section className="casefile__col">
          <h4 className="mono">Claimant</h4>
          <dl className="kv">
            <dt>Name</dt><dd>{claimant.name}</dd>
            <dt>Student ID</dt><dd className="mono">{claimant.studentId ?? "—"}</dd>
            <dt>Email</dt><dd className="mono small">{claimant.email}</dd>
          </dl>
        </section>

        <section className="casefile__col">
          <h4 className="mono">They say</h4>
          <p className="quote">“{answers.description}”</p>
          <p className="quote quote--key">
            <span className="mono small">Only the owner would know:</span> “{answers.identifying}”
          </p>
          {(answers.lostOn || answers.lostWhere) && (
            <p className="small muted">
              Lost {answers.lostOn ? formatDate(answers.lostOn) : "—"}
              {answers.lostWhere ? ` · ${answers.lostWhere}` : ""}
            </p>
          )}
        </section>

        <section className="casefile__col casefile__col--record">
          <h4 className="mono">The desk logged</h4>
          <p className="small">
            {item.category} · {item.location}
            {item.foundOn ? ` · ${formatDate(item.foundOn)}` : ""}
          </p>
          {item.privateNote ? (
            <p className="quote quote--record">{item.privateNote}</p>
          ) : (
            <p className="small muted">No private note was logged for this item. Check the item itself.</p>
          )}
        </section>
      </div>

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {claim.status === "pending" && (
        <footer className="casefile__actions">
          <button type="button" className="btn btn--ink" disabled={busy} onClick={() => run(() => reviewClaim(claim.id, "approved"))}>
            ✓ Approve
          </button>
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => run(() => reviewClaim(claim.id, "rejected"))}>
            ✗ Reject
          </button>
        </footer>
      )}

      {claim.status === "approved" && !claim.handedOverAt && (
        <footer className="casefile__actions casefile__handover">
          <label className="check">
            <input type="checkbox" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} />
            <span>
              I checked their student ID card in person and it matches{" "}
              <strong className="mono">{claimant.studentId ?? claimant.name}</strong>.
            </span>
          </label>
          <input
            className="inline-input"
            type="text"
            placeholder="Note (optional), e.g. “ID card checked, collected 3pm”"
            value={idNote}
            onChange={(e) => setIdNote(e.target.value)}
            aria-label="Handover note"
          />
          <button
            type="button"
            className="btn btn--stamp"
            disabled={busy || !idChecked}
            onClick={() => run(() => recordHandover(claim.id, { identityChecked: idChecked, identityNote: idNote }))}
          >
            Record handover
          </button>
        </footer>
      )}

      {claim.handedOverAt && (
        <p className="casefile__closed mono small">Handed over {formatDate(claim.handedOverAt)}. Case closed.</p>
      )}
    </article>
  );
}
