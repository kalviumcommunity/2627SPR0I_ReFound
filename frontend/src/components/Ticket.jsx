import { useMemo } from "react";

// A claim-ticket frame: tear-off stub on the left, perforation, content on the right.
export default function Ticket({ label, children }) {
  const number = useMemo(() => String(Math.floor(1000 + Math.random() * 9000)), []);

  return (
    <div className="ticket">
      <div className="ticket__stub" aria-hidden="true">
        <span className="ticket__hole" />
        <span className="ticket__stub-text">
          {label} · No. {number}
        </span>
        <span className="ticket__barcode" />
      </div>
      <div className="ticket__body">
        <p className="ticket__number mono">
          {label} <span>No. {number}</span>
        </p>
        {children}
      </div>
    </div>
  );
}
