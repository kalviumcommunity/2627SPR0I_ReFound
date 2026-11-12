import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const NEXT = {
  student: [
    { title: "Browse the register", to: "/items", color: "marker", note: "Open" },
    { title: "Track your claims", to: "/claims", color: "sky", note: "Open" },
  ],
  staff: [
    { title: "Register a found item", color: "marker" },
    { title: "Review claims", color: "sky" },
    { title: "Record a handover", color: "rose" },
  ],
};

// Landing spot after login. Staff screens are still to come (Jeevan's part).
export default function Welcome() {
  const { user } = useAuth();
  const isStaff = user.role === "staff";

  return (
    <div className="container welcome">
      <span className={`badge${isStaff ? " badge--staff" : ""}`}>{isStaff ? "Staff desk" : "Student"}</span>
      <h1>
        Hi, <em>{user.name}.</em>
      </h1>
      <p className="muted">
        Signed in as <span className="mono">{user.email}</span>
      </p>

      <div className="welcome__grid">
        {NEXT[user.role].map((t, i) => {
          const body = (
            <>
              <span className="tag__hole" aria-hidden="true" />
              <p className="tag__ref mono">{t.note ?? "Coming soon"}</p>
              <h3 className="tag__item">{t.title}</h3>
            </>
          );
          return t.to ? (
            <Link key={t.title} to={t.to} className={`tag tag--${t.color} tag--flat tag--link`} style={{ "--i": i }}>
              {body}
            </Link>
          ) : (
            <article key={t.title} className={`tag tag--${t.color} tag--flat`} style={{ "--i": i }}>
              {body}
            </article>
          );
        })}
      </div>
    </div>
  );
}
