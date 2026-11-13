import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import FormField from "../components/FormField.jsx";
import Ticket from "../components/Ticket.jsx";
import { hasErrors, validateLoginForm } from "../utils/validation.js";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Staff / Volunteer" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ email: location.state?.email ?? "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const justSignedUp = Boolean(location.state?.signedUp);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: "" }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const found = validateLoginForm(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      const signedIn = await login({ ...form, role });
      const home = signedIn.role === "student" ? "/welcome" : "/staff";
      navigate(location.state?.from ?? home, { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <Ticket label="Desk pass">
        <h1>
          Welcome <em>back.</em>
        </h1>
        <p className="muted">Log in to claim items or manage the register.</p>

        {justSignedUp && (
          <div className="alert alert--success" role="status">
            Account created. Log in to continue.
          </div>
        )}

        <div className="segmented" role="tablist" aria-label="Log in as">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="tab"
              aria-selected={role === r.value}
              className={`segmented__btn${role === r.value ? " is-active" : ""}`}
              onClick={() => {
                setRole(r.value);
                setFormError("");
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {formError && (
          <div className="alert alert--error" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="email"
            label={role === "staff" ? "Staff email" : "Campus email"}
            type="email"
            value={form.email}
            onChange={update("email")}
            error={errors.email}
            autoComplete="email"
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            value={form.password}
            onChange={update("password")}
            error={errors.password}
            autoComplete="current-password"
          />
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        {role === "student" ? (
          <p className="auth__switch">
            New here? <Link to="/signup">Create a student account</Link>
          </p>
        ) : (
          <p className="auth__switch muted small">
            Staff accounts are created by your supervisor. Demo: <code>staff@campus.edu</code> or{" "}
            <code>supervisor@campus.edu</code> with any password.
          </p>
        )}
      </Ticket>
    </div>
  );
}
