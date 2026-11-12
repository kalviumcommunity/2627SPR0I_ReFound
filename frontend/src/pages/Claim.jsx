import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import FormField from "../components/FormField.jsx";
import Ticket from "../components/Ticket.jsx";
import { findMyClaim, formatDate, getItem, submitClaim } from "../services/itemsService.js";
import { hasErrors } from "../utils/validation.js";

const EMPTY = { description: "", identifying: "", lostOn: "", lostWhere: "", bringId: false };
const today = () => new Date().toISOString().slice(0, 10);

function validate(form) {
  return {
    description:
      form.description.trim().length < 20 ? "Describe the item in at least 20 characters." : "",
    identifying: form.identifying.trim() ? "" : "Tell us something only the owner would know.",
    lostOn: form.lostOn && form.lostOn > today() ? "That date is in the future." : "",
    bringId: form.bringId ? "" : "You'll need your student ID at the desk.",
  };
}

export default function Claim() {
  const { ref } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [claim, setClaim] = useState(null);

  useEffect(() => {
    getItem(ref)
      .then((found) => {
        setItem(found);
        setClaim(findMyClaim(user.email, found.ref));
      })
      .catch(() => setMissing(true));
  }, [ref, user.email]);

  const update = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: "" }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const found = validate(form);
    setErrors(found);
    if (hasErrors(found)) return;
    setSubmitting(true);
    try {
      setClaim(await submitClaim({ item, user, ...form }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (missing) {
    return (
      <div className="auth">
        <div className="empty">
          <h2>No item with reference {ref}.</h2>
          <Link to="/items" className="btn btn--ink">Back to the register</Link>
        </div>
      </div>
    );
  }

  if (!item) return <div className="auth"><p className="mono muted">Pulling tag {ref}…</p></div>;

  if (claim) return <Receipt claim={claim} />;

  return (
    <div className="auth">
      <Ticket label="Claim form">
        <p className="mono small muted">Claiming {item.ref}</p>
        <h1>
          Is the <em>{item.title.toLowerCase()}</em> yours?
        </h1>
        <p className="muted">
          Only the help desk reads this. Be specific — vague claims take longer to check.
        </p>

        {formError && <div className="alert alert--error" role="alert">{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="description"
            type="textarea"
            label="Describe the item"
            value={form.description}
            onChange={update("description")}
            error={errors.description}
            hint="Colour, brand, size, condition — in your own words."
          />
          <FormField
            id="identifying"
            type="textarea"
            label="Something only the owner would know"
            value={form.identifying}
            onChange={update("identifying")}
            error={errors.identifying}
            hint="e.g. a sticker, a scratch, what's inside, the lock-screen photo."
          />
          <div className="field-row">
            <FormField
              id="lostOn"
              type="date"
              label="When did you lose it?"
              optional
              max={today()}
              value={form.lostOn}
              onChange={update("lostOn")}
              error={errors.lostOn}
            />
            <FormField
              id="lostWhere"
              label="Where, roughly?"
              optional
              value={form.lostWhere}
              onChange={update("lostWhere")}
            />
          </div>

          <label className={`check${errors.bringId ? " check--error" : ""}`}>
            <input type="checkbox" checked={form.bringId} onChange={update("bringId")} />
            <span>I'll bring my student ID to the help desk to collect it.</span>
          </label>
          {errors.bringId && <p className="field__error" role="alert">{errors.bringId}</p>}

          <button type="submit" className="btn btn--stamp btn--block" disabled={submitting}>
            {submitting ? "Filing your claim…" : "Submit claim"}
          </button>
        </form>

        <p className="auth__switch">
          <Link to={`/items/${item.ref}`}>← Back to the item</Link>
        </p>
      </Ticket>
    </div>
  );
}

function Receipt({ claim }) {
  return (
    <div className="auth">
      <div className="receipt">
        <p className="mono receipt__head">Refound · Help Desk</p>
        <p className="mono receipt__rule">- - - - - - - - - - - - - - - - - -</p>
        <h1>Claim filed.</h1>
        <dl className="receipt__lines mono">
          <div><dt>Claim no.</dt><dd>{claim.id}</dd></div>
          <div><dt>Item</dt><dd>{claim.ref}</dd></div>
          <div><dt>What</dt><dd>{claim.itemTitle}</dd></div>
          <div><dt>Filed</dt><dd>{formatDate(claim.submittedAt.slice(0, 10))}</dd></div>
          <div><dt>Status</dt><dd>Pending review</dd></div>
        </dl>
        <p className="mono receipt__rule">- - - - - - - - - - - - - - - - - -</p>
        <p className="small">
          <strong>Next:</strong> staff will check your answers. Once approved, bring your student ID to the help desk and
          quote <span className="mono">{claim.id}</span>.
        </p>
        <span className="stamp stamp--receipt" aria-hidden="true">Received</span>
        <div className="receipt__actions">
          <Link to="/claims" className="btn btn--ink">My claims</Link>
          <Link to="/items" className="btn btn--ghost">Back to the register</Link>
        </div>
      </div>
    </div>
  );
}
