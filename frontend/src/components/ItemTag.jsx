import { Link } from "react-router-dom";
import { colorFor, formatDate } from "../services/itemsService.js";

// A found item shown as a luggage tag. Links to the item page.
export default function ItemTag({ item, index = 0 }) {
  return (
    <Link
      to={`/items/${item.ref}`}
      className={`tag tag--${colorFor(item.category)} tag--card`}
      style={{ "--i": index % 3 }}
      aria-label={`${item.title}, found at ${item.location}, reference ${item.ref}`}
    >
      <span className="tag__hole" aria-hidden="true" />
      <p className="tag__ref mono">
        {item.ref} <span>{item.category}</span>
      </p>
      <h3 className="tag__item">{item.title}</h3>
      <p className="tag__where mono">↳ {item.location}</p>
      <p className="tag__date mono">Found {formatDate(item.foundOn)}</p>
    </Link>
  );
}
