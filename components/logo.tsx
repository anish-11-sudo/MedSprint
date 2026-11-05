export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#2F6BFF" />
        <path d="M16 5c4 3 6 7 6 11l-3 4h-6l-3-4c0-4 2-8 6-11Z" fill="#fff" />
        <circle cx="16" cy="14" r="2.4" fill="#2F6BFF" />
        <path d="M13 21c0 3 1.2 5 3 6 1.8-1 3-3 3-6" fill="#FFC93C" />
      </svg>
      MedSprint
    </span>
  );
}
