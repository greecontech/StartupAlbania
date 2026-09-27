import Link from "next/link";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";
import { query } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { atLeast } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { acknowledgeAlert, resolveAlert } from "./actions";

export const metadata = { title: "Alerts" };

const VIEWS = {
  active: { label: "Active", where: "a.status <> 'resolved'" },
  open: { label: "Open", where: "a.status = 'open'" },
  acknowledged: { label: "Acknowledged", where: "a.status = 'acknowledged'" },
  resolved: { label: "Resolved", where: "a.status = 'resolved'" },
  all: { label: "All", where: "true" }
} as const;

type AlertRow = {
  id: string; message: string; severity: string; status: string; kind: string; value: number; threshold: number;
  created_at: Date; acknowledged_at: Date | null; resolved_at: Date | null; ack_name: string | null;
  metric_id: string; site_name: string;
};

export default async function Alerts({ searchParams }: { searchParams: Promise<{ view?: string; severity?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const view = (params.view && params.view in VIEWS ? params.view : "active") as keyof typeof VIEWS;
  const severity = params.severity === "critical" || params.severity === "warning" ? params.severity : null;
  const canAct = atLeast(user.role, "operator");

  const alerts = await query<AlertRow>(
    `select a.*, u.name as ack_name, s.name as site_name
     from alerts a
     join metrics m on m.id = a.metric_id join data_sources d on d.id = m.source_id join sites s on s.id = d.site_id
     left join users u on u.id = a.acknowledged_by
     where ${VIEWS[view].where} and ($1::text is null or a.severity = $1)
     order by a.created_at desc limit 300`,
    [severity]
  );

  const href = (v: string, sev: string | null) => `/alerts?view=${v}${sev ? `&severity=${sev}` : ""}`;

  return (
    <div className="stack">
      <PageHead title="Alerts" intro="Deviations detected when a reading crosses a metric's limits. Alerts close automatically once values return within range." />

      <div className="spread">
        <nav className="segmented" aria-label="Status">
          {Object.entries(VIEWS).map(([key, def]) => (
            <Link key={key} href={href(key, severity)} className={view === key ? "on" : undefined}>{def.label}</Link>
          ))}
        </nav>
        <nav className="segmented" aria-label="Severity">
          <Link href={href(view, null)} className={!severity ? "on" : undefined}>Any severity</Link>
          <Link href={href(view, "critical")} className={severity === "critical" ? "on" : undefined}>Critical</Link>
          <Link href={href(view, "warning")} className={severity === "warning" ? "on" : undefined}>Warning</Link>
        </nav>
      </div>

      <Panel flush>
        {alerts.length === 0 ? (
          <Empty>No alerts in this view.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Severity</th><th>Alert</th><th>Status</th><th>Raised</th>{canAct && <th className="right">Actions</th>}</tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td><Badge status={a.severity} /></td>
                    <td>
                      <Link href={`/monitoring?metric=${a.metric_id}&period=24h`}>{a.message}</Link>
                      <div className="small muted">{a.site_name}</div>
                    </td>
                    <td>
                      <Badge status={a.status} />
                      <div className="small muted">
                        {a.status === "acknowledged" && `${a.ack_name ?? "—"} · ${fmtDateTime(a.acknowledged_at)}`}
                        {a.status === "resolved" && fmtDateTime(a.resolved_at)}
                      </div>
                    </td>
                    <td className="small">{fmtDateTime(a.created_at)}</td>
                    {canAct && (
                      <td className="right">
                        <div className="row end">
                          {a.status === "open" && (
                            <form action={acknowledgeAlert}><input type="hidden" name="id" value={a.id} /><button className="secondary small">Acknowledge</button></form>
                          )}
                          {a.status !== "resolved" && (
                            <form action={resolveAlert}><input type="hidden" name="id" value={a.id} /><button className="secondary small">Resolve</button></form>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
