export default function Toast({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="toast" role="status">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {children}
    </div>
  );
}
