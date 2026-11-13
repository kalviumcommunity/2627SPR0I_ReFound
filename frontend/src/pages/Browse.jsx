import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ItemTag from "../components/ItemTag.jsx";
import { CATEGORIES, listLocations, searchItems } from "../services/itemsService.js";

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const location = params.get("location") ?? "";

  const [items, setItems] = useState([]);
  const [locations] = useState(listLocations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchItems({ q, category, location }).then((found) => {
      if (!cancelled) {
        setItems(found);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [q, category, location]);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const filtering = Boolean(q || category || location);

  return (
    <div className="container register">
      <header className="register__head">
        <p className="eyebrow mono">The Register</p>
        <h1>
          What's on the <em>rack</em> right now
        </h1>
        <p className="muted">Everything the help desk has logged. Only safe details are shown — the rest stays with staff.</p>
      </header>

      <form className="searchstrip" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="q" className="searchstrip__label mono">
          Search
        </label>
        <input
          id="q"
          type="search"
          placeholder="e.g. blue bottle, earbuds, RF-0142"
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          autoComplete="off"
        />
      </form>

      <div className="filters">
        <div className="chips" role="group" aria-label="Filter by category">
          <button type="button" className={`chip${!category ? " is-active" : ""}`} onClick={() => setParam("category", "")}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              className={`chip${category === c ? " is-active" : ""}`}
              onClick={() => setParam("category", category === c ? "" : c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="filters__row">
          <label className="select mono">
            <span>Where</span>
            <select value={location} onChange={(e) => setParam("location", e.target.value)}>
              <option value="">Anywhere on campus</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <p className="count mono" aria-live="polite">
            {loading ? "Checking the rack…" : `${items.length} item${items.length === 1 ? "" : "s"} found`}
          </p>

          {filtering && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams({}, { replace: true })}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {!loading && items.length === 0 ? (
        <div className="empty">
          <p className="stamp stamp--big" aria-hidden="true">
            No match
          </p>
          <h2>Nothing on the rack matches that.</h2>
          <p className="muted">
            Try fewer or different words, or clear the filters. New items are added as the help desk logs them — check back
            later.
          </p>
          <button type="button" className="btn btn--ink" onClick={() => setParams({}, { replace: true })}>
            Show everything
          </button>
        </div>
      ) : (
        <div className={`tag-grid${loading ? " is-loading" : ""}`}>
          {items.map((item, i) => (
            <ItemTag key={item.ref} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
