/** Знак: ломаная линия графика на «экране» терминала. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="3" fill="var(--raised)" />
      <path
        d="M5 21l6-7 5 4 5-8 6 5"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
      <rect x="5" y="25" width="22" height="2" fill="var(--border-strong)" />
    </svg>
  );
}
