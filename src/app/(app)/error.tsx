"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1>Something went wrong</h1>
      <p className="muted">This page could not be loaded. It may be a temporary problem with the database connection.</p>
      {error.digest && <p className="small muted">Reference: <code>{error.digest}</code> (search for it in the server logs)</p>}
      <div className="row"><button onClick={reset}>Try again</button><a className="button secondary" href="/">Dashboard</a></div>
    </div>
  );
}
