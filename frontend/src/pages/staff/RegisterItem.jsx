import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FormField from "../../components/FormField.jsx";
import { CATEGORIES, colorFor, formatDate, listLocations } from "../../services/itemsService.js";
import { registerItem, validateItemInput } from "../../services/staffService.js";
import { todayISO } from "../../services/mockDb.js";
import { hasErrors } from "../../utils/validation.js";

const EMPTY = { title: "", category: "", location: "", foundOn: "", description: "", privateNote: "" };

export default function RegisterItem() {
  const locations = useMemo(listLocations, []);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(null);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: "" }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const found = validateItemInput(form);
    setErrors(found);
    if (hasErrors(found)) return;
    setSubmitting(true);
    try {
      setSaved(await registerItem(form));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (saved) {
    return (
      <div className="container intake intake--done">
        <div className={`tag tag--${colorFor(saved.category)} tag--hero`} style={{ "--i": 0 }}>
          <span className="tag__hole" aria-hidden="true" />
          <p className="tag__ref mono">{saved.ref}</p>
          <h1 className="tag__item">{saved.title}</h1>
          <p className="tag__where mono">↳ {saved.location}</p>
          <p className="tag__date mono">Found {formatDate(saved.foundOn)}</p>
          <span className="stamp" aria-hidden="true">Logged</span>
        </div>
        <div>
          <p className="eyebrow mono">Tag printed</p>
          <h2 className="intake__done-title">
            Write <span className="mono ref-big">{saved.ref}</span> on the item.
          </h2>
          <p className="muted">
            It's on the public register now. The staff-only note was saved but isn't part of the public record.
          </p>
          <div className="hero__actions">
            <button
              type="button"
              className="btn btn--stamp"
              onClick={() => {
                setSaved(null);
                setForm(EMPTY);
              }}
            >
              + Log another item
            </button>
            <Link to={`/items/${saved.ref}`} className="btn btn--ghost">
              See it on the register
            </Link>
            <Link to="/staff" className="btn btn--ghost">
              Back to the desk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container intake">
      <Link to="/staff" className="back mono">← Back to the desk</Link>
      <header className="register__head">
        <p className="eyebrow mono">Intake slip</p>
        <h1>
          Log a <em>found</em> item
        </h1>
        <p className="muted">A reference code is given automatically when you save.</p>
      </header>

      {formError && <div className="alert alert--error" role="alert">{formError}</div>}

      <form className="slip" onSubmit={handleSubmit} noValidate>
        <fieldset className="slip__part">
          <legend className="slip__legend mono">Part A · Public — shown on the register</legend>

          <FormField id="title" label="What is it?" value={form.title} onChange={update("title")} error={errors.title} hint="Short and plain, e.g. “Blue steel bottle”." />

          <div className={`field${errors.category ? " field--error" : ""}`}>
            <span className="field__label-text mono" id="category-label">Category</span>
            <div className="chips" role="radiogroup" aria-labelledby="category-label">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={form.category === c}
                  className={`chip${form.category === c ? " is-active" : ""}`}
                  onClick={() => {
                    setForm((f) => ({ ...f, category: c }));
                    setErrors((err) => ({ ...err, category: "" }));
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            {errors.category && <p className="field__error" role="alert">{errors.category}</p>}
          </div>

          <div className="field-row">
            <FormField id="location" label="Where was it found?" value={form.location} onChange={update("location")} error={errors.location} list="known-locations" autoComplete="off" />
            <FormField id="foundOn" type="date" label="Found on" optional max={todayISO()} value={form.foundOn} onChange={update("foundOn")} error={errors.foundOn} hint="Leave blank for today." />
          </div>
          <datalist id="known-locations">
            {locations.map((l) => <option key={l} value={l} />)}
          </datalist>

          <FormField
            id="description"
            type="textarea"
            label="Public description"
            value={form.description}
            onChange={update("description")}
            error={errors.description}
            hint="Enough to recognise it — but leave out anything only the owner would know."
          />
        </fieldset>

        <fieldset className="slip__part slip__part--private">
          <legend className="slip__legend mono">Part B · Staff only — never shown publicly</legend>
          <FormField
            id="privateNote"
            type="textarea"
            label="Ownership details"
            optional
            value={form.privateNote}
            onChange={update("privateNote")}
            hint="Serial number, what's inside, stickers, scratches. You'll compare claims against this."
          />
        </fieldset>

        <button type="submit" className="btn btn--stamp btn--lg" disabled={submitting}>
          {submitting ? "Printing tag…" : "Save & print tag"}
        </button>
      </form>
    </div>
  );
}
