import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatDate, getMyClaims } from "../services/itemsService.js";

const STATUS_TEXT = {
  pending: "Waiting for the help desk to review.",
  approved: "Approved — bring your student ID to collect it.",
  rejected: "Not approved. Visit the help desk if you think this is wrong.",
  returned: "Handed back. Case closed.",
};

export default function MyClaims() {
  const { user } = useAuth();
  const [claims, setClaims] = useState(null);

  useEffect(() => {
    getMyClaims(user.email).then(setClaims);
  }, [user.email]);

  return (
    <div className="container register">
      <header className="register__head">
        <p className="eyebrow mono">Your claims</p>
        <h1>
          Claims you've <em>filed</em>
        </h1>
      </header>

      {claims === null ? (
        <p className="mono muted">Opening the drawer…</p>
      ) : claims.length === 0 ? (
        <div className="empty">
          <h2>No claims yet.</h2>
          <p className="muted">Find your item on the register and press “This is mine”.</p>
          <Link to="/items" className="btn btn--ink">Browse the register</Link>
        </div>
      ) : (
        <ul className="claims">
          {claims.map((c) => (
            <li key={c.id} className="claim-row">
              <div>
                <p className="mono small muted">
                  {c.id} · filed {formatDate(c.submittedAt.slice(0, 10))}
                </p>
                <h3>
                  <Link to={`/items/${c.ref}`}>{c.itemTitle}</Link> <span className="mono small muted">{c.ref}</span>
                </h3>
                <p className="muted small">{STATUS_TEXT[c.status]}</p>
              </div>
              <span className={`stamp stamp--inline stamp--${c.status}`}>{c.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
