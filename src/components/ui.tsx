import type { ReactNode } from "react";

export function PageHead({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </header>
  );
}

export function Panel({ title, meta, actions, flush, children }: {
  title?: ReactNode; meta?: ReactNode; actions?: ReactNode; flush?: boolean; children: ReactNode;
}) {
  return (
    <section className="panel">
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {meta && <p>{meta}</p>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      <div className={flush ? "panel-body flush" : "panel-body"}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}{unit && <small>{unit}</small>}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  open: "critical", critical: "critical", warning: "warning", acknowledged: "watch", resolved: "ok",
  ok: "ok", active: "ok", inactive: "neutral", done: "ok", in_progress: "watch", planned: "neutral",
  simulated: "neutral", offline: "neutral", stale: "warning"
};

export function Badge({ status, label }: { status: string; label?: string }) {
  return <span className={`badge ${TONES[status] ?? "neutral"}`}>{label ?? status.replace("_", " ")}</span>;
}

export function Notice({ tone, children }: { tone?: "error" | "success"; children: ReactNode }) {
  return <div className={`notice ${tone ?? ""}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
