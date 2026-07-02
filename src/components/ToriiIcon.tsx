// Minimal torii-gate line icon — the app's only pictorial motif (DESIGN.md:
// cultural elements stay restrained; one gate, no clip-art collages).
export function ToriiIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* kasagi (curved top lintel) */}
      <path d="M2.5 6C7 4.4 17 4.4 21.5 6" />
      {/* nuki (tie beam) */}
      <path d="M4.8 9.5h14.4" />
      {/* gakuzuka (center strut) */}
      <path d="M12 5.1v4.4" />
      {/* pillars, slightly splayed */}
      <path d="M6.8 5.3L6 21" />
      <path d="M17.2 5.3L18 21" />
    </svg>
  )
}
