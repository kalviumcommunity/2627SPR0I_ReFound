import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { colorFor, findMyClaim, formatDate, getItem } from "../services/itemsService.js";

export default function ItemDetail() {
  const { ref } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    getItem(ref)
      .then((found) => {
        if (!cancelled) {
          setItem(found);
          setState("ready");
        }
      })
      .catch(() => !cancelled && setState("missing"));
    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (state === "loading") {
    return <div className="container detail"><p className="mono muted">Pulling tag {ref}…</p></div>;
  }

  if (state === "missing") {
    return (
      <div className="container detail">
        <div className="empty">
          <p className="stamp stamp--big" aria-hidden="true">Not found</p>
          <h2>No item with reference {ref}.</h2>
          <p className="muted">Check the code on your notice, or search the register.</p>
          <Link to="/items" className="btn btn--ink">Back to the register</Link>
        </div>
      </div>
    );
  }

  const myClaim = user ? findMyClaim(user.email, item.ref) : null;

  return (
    <div className="container detail">
      <Link to="/items" className="back mono">← Back to the register</Link>

      <div className="detail__grid">
        <div className={`tag tag--${colorFor(item.category)} tag--hero`} style={{ "--i": 0 }}>
          <span className="tag__hole" aria-hidden="true" />
          <p className="tag__ref mono">{item.ref}</p>
          <h1 className="tag__item">{item.title}</h1>
          <p className="tag__where mono">↳ {item.location}</p>
          <span className="stamp" aria-hidden="true">Found</span>
        </div>

        <div className="detail__info">
          <dl className="facts">
            <div><dt className="mono">Reference</dt><dd className="mono">{item.ref}</dd></div>
            <div><dt className="mono">Category</dt><dd>{item.category}</dd></div>
            <div><dt className="mono">Found at</dt><dd>{item.location}</dd></div>
            <div><dt className="mono">Found on</dt><dd>{formatDate(item.foundOn)}</dd></div>
          </dl>

          <p className="detail__desc">{item.description}</p>

          <div className="withheld">
            <span className="withheld__bar" aria-hidden="true">████ ███ ██████</span>
            <p>
              <strong>Some details are withheld.</strong> Serial numbers, contents and marks stay with staff. You'll be
              asked about them in your claim — that's how we know it's yours.
            </p>
          </div>

          <ClaimAction user={user} item={item} myClaim={myClaim} />
        </div>
      </div>
    </div>
  );
}

function ClaimAction({ user, item, myClaim }) {
  if (!user) {
    return (
      <div className="claim-cta">
        <Link to="/login" state={{ from: `/items/${item.ref}/claim` }} className="btn btn--stamp btn--lg">
          Log in to claim this →
        </Link>
        <p className="mono small muted">No account? <Link to="/signup">Sign up</Link> — it takes a minute.</p>
      </div>
    );
  }
  if (user.role === "staff") {
    return <p className="note mono">You're signed in as staff. Claims are made by students and reviewed at the desk.</p>;
  }
  if (myClaim) {
    return (
      <div className="claim-cta">
        <p className="status-line">
          <span className={`stamp stamp--inline stamp--${myClaim.status}`}>{myClaim.status}</span>
          You claimed this — claim <span className="mono">{myClaim.id}</span>.
        </p>
        <Link to="/claims" className="btn btn--ghost">View my claims</Link>
      </div>
    );
  }
  return (
    <div className="claim-cta">
      <Link to={`/items/${item.ref}/claim`} className="btn btn--stamp btn--lg">This is mine — claim it →</Link>
      <p className="mono small muted">Only the help desk sees what you write.</p>
    </div>
  );
}
