export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="brand">
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="18" fill="none" stroke="#2f3d35" strokeWidth="2" />
        <path d="M11 23c6-11 16-11 21-4" fill="none" stroke="#448561" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M20 6v28" stroke="#2f3d35" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>
        <strong>Greecon</strong>
        <span>Platform</span>
      </span>
    </span>
  );
}
