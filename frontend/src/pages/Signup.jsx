import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import FormField from "../components/FormField.jsx";
import Ticket from "../components/Ticket.jsx";
import { hasErrors, validateSignupForm } from "../utils/validation.js";

const EMPTY = { name: "", studentId: "", email: "", password: "", confirmPassword: "" };

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: "" }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const found = validateSignupForm(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      const user = await signup(form);
      navigate("/login", { state: { signedUp: true, email: user.email } });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <Ticket label="Claim ticket">
        <h1>
          Get your <em>claim ticket.</em>
        </h1>
        <p className="muted">Students need an account to claim a found item.</p>

        {formError && (
          <div className="alert alert--error" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormField id="name" label="Full name" value={form.name} onChange={update("name")} error={errors.name} autoComplete="name" />
          <FormField
            id="studentId"
            label="Student ID"
            value={form.studentId}
            onChange={update("studentId")}
            error={errors.studentId}
            hint="Staff match this against your ID card at handover."
          />
          <FormField
            id="email"
            label="Campus email"
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
            hint="At least 8 characters, with a letter and a number."
            autoComplete="new-password"
          />
          <FormField
            id="confirmPassword"
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="auth__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Ticket>
    </div>
  );
}
