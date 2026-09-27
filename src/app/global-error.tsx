"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f1e9", color: "#1a211d", fontFamily: "'IBM Plex Serif', Georgia, serif", padding: 24 }}>
        <div style={{ maxWidth: 520 }}>
          <h1 style={{ fontWeight: 500 }}>Greecon Platform is unavailable</h1>
          <p style={{ color: "rgba(26,33,29,.66)" }}>A server error occurred. If this persists, check the service variables (DATABASE_URL, SESSION_SECRET) and the deploy logs.</p>
          {error.digest && <p style={{ fontSize: 13 }}>Reference: <code>{error.digest}</code></p>}
          <button onClick={reset} style={{ minHeight: 40, padding: "0 16px", border: 0, borderRadius: 6, background: "#2f3d35", color: "#f7f1e9", font: "inherit", cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
