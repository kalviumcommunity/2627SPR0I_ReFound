import { useState } from "react";

// Text, email, password, date or textarea field with label, hint and error.
export default function FormField({ id, label, type = "text", value, onChange, error, hint, optional, ...rest }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const shared = {
    id,
    name: id,
    value,
    onChange,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
    ...rest,
  };

  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      <div className="field__control">
        {type === "textarea" ? (
          <textarea rows={3} {...shared} />
        ) : (
          <input type={isPassword && show ? "text" : type} {...shared} />
        )}
        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
