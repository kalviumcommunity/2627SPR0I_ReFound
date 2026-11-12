// A luggage tag with a punched hole — the Refound mark.
export default function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M9 3h14a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V11z" fill="var(--ink)" transform="rotate(-8 16 16)" />
      <circle cx="12.2" cy="8.6" r="2.1" fill="var(--paper)" />
      <path d="M12.5 15.5h8M12 19.5h9M11.5 23.5h5" stroke="var(--marker)" strokeWidth="2" strokeLinecap="round" transform="rotate(-8 16 16)" />
    </svg>
  );
}
