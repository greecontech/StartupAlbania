import { headers } from "next/headers";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";
import { query } from "@/lib/db";
import { SECTOR_LABELS, fmtNumber, fmtRelative } from "@/lib/format";
import { listMetrics } from "@/lib/queries";
import { atLeast } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import {
  addMetric, createSite, createSource, deleteMetric, deleteSite, deleteSource, rotateKey, toggleSource, updateMetric
} from "./actions";

export const metadata = { title: "Sites & sources" };

type Source = { id: string; site_id: string; name: string; kind: string; api_key_prefix: string | null; active: boolean; last_seen_at: Date | null };

const KIND_LABELS: Record<string, string> = { device: "Device", api: "API integration", manual: "Manual entry", simulated: "Simulated" };

export default async function Sources() {
  const user = await requireUser();
  const canEdit = atLeast(user.role, "operator");
  const isAdmin = atLeast(user.role, "admin");
  const [sites, sources, metrics] = await Promise.all([
    query<{ id: string; name: string; sector: string; location: string; description: string }>("select * from sites order by name"),
    query<Source>("select id, site_id, name, kind, api_key_prefix, active, last_seen_at from data_sources order by name"),
    listMetrics()
  ]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  return (
    <div className="stack">
      <PageHead title="Sites & sources" intro="Where data comes from: sites, the devices or systems that report for them, and the metrics each one measures, with their limits." />

      {canEdit && (
        <Panel title="Add a site">
          <ActionForm action={createSite} submit="Add site">
            <label>Name<input name="name" required maxLength={120} placeholder="e.g. Solar PV — Durana" /></label>
            <label>Sector
              <select name="sector" defaultValue="energy">
                {Object.entries(SECTOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>Location<input name="location" maxLength={200} /></label>
            <label>Description<input name="description" maxLength={500} /></label>
          </ActionForm>
        </Panel>
      )}

      {sites.length === 0 && <Panel><Empty>No sites yet.</Empty></Panel>}

      {sites.map((site) => (
        <Panel key={site.id} title={site.name}
          meta={[SECTOR_LABELS[site.sector], site.location, site.description].filter(Boolean).join(" · ")}>
          <div className="stack">
            {sources.filter((s) => s.site_id === site.id).map((src) => {
              const online = src.last_seen_at && Date.now() - new Date(src.last_seen_at).getTime() < 3_600_000;
              const own = metrics.filter((m) => m.source_id === src.id);
              return (
                <div key={src.id} className="panel" style={{ background: "transparent" }}>
                  <div className="panel-head">
                    <div>
                      <h3>{src.name}</h3>
                      <p>
                        {KIND_LABELS[src.kind]} · last data {fmtRelative(src.last_seen_at)}
                        {src.api_key_prefix && <> · key <code>gk_{src.api_key_prefix}_…</code></>}
                      </p>
                    </div>
                    <div className="row">
                      {!src.active ? <Badge status="inactive" /> : <Badge status={online ? "ok" : "offline"} label={online ? "online" : "no recent data"} />}
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Metric</th><th>Key</th><th className="num">Latest</th><th className="num">Lower limit</th><th className="num">Upper limit</th>{canEdit && <th />}</tr></thead>
                      <tbody>
                        {own.length === 0 && <tr><td colSpan={6} className="muted small">No metrics yet{src.kind !== "manual" ? " — they are also created automatically on first ingestion" : ""}.</td></tr>}
                        {own.map((m) => (
                          <tr key={m.id}>
                            <td>{m.name} <span className="muted small">{m.unit}</span></td>
                            <td><code>{m.key}</code></td>
                            <td className="num">{fmtNumber(m.last_value)}</td>
                            <td className="num">{fmtNumber(m.min_threshold)}</td>
                            <td className="num">{fmtNumber(m.max_threshold)}</td>
                            {canEdit && (
                              <td className="right">
                                <details className="inline-edit">
                                  <summary>Edit</summary>
                                  <ActionForm action={updateMetric} submit="Save" resetOnSuccess={false}>
                                    <input type="hidden" name="id" value={m.id} />
                                    <label>Name<input name="name" defaultValue={m.name} required /></label>
                                    <label>Unit<input name="unit" defaultValue={m.unit} /></label>
                                    <label>Lower limit<input name="min" inputMode="decimal" defaultValue={m.min_threshold ?? ""} /></label>
                                    <label>Upper limit<input name="max" inputMode="decimal" defaultValue={m.max_threshold ?? ""} /></label>
                                  </ActionForm>
                                  {isAdmin && (
                                    <div style={{ marginTop: 10 }}>
                                      <ActionForm action={deleteMetric} submit="Delete metric" className="row" buttonClass="danger small"
                                        confirm={`Delete “${m.name}” and all of its readings?`}>
                                        <input type="hidden" name="id" value={m.id} />
                                      </ActionForm>
                                    </div>
                                  )}
                                </details>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {canEdit && (
                    <div className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
                      <div className="row">
                        <details className="inline-edit">
                          <summary>Add metric</summary>
                          <ActionForm action={addMetric} submit="Add metric">
                            <input type="hidden" name="source_id" value={src.id} />
                            <label>Key<input name="key" required placeholder="soil_moisture" pattern="[a-z0-9][a-z0-9_.\-]{0,63}" /></label>
                            <label>Name<input name="name" required placeholder="Soil moisture" /></label>
                            <label>Unit<input name="unit" placeholder="%" /></label>
                            <label>Lower limit<input name="min" inputMode="decimal" /></label>
                            <label>Upper limit<input name="max" inputMode="decimal" /></label>
                          </ActionForm>
                        </details>
                        {(src.kind === "device" || src.kind === "api") && (
                          <details className="inline-edit">
                            <summary>New API key</summary>
                            <ActionForm action={rotateKey} submit="Generate new key" className="row" buttonClass="secondary small"
                              confirm="The current key will stop working immediately. Continue?">
                              <input type="hidden" name="id" value={src.id} />
                            </ActionForm>
                          </details>
                        )}
                        <details className="inline-edit">
                          <summary>{src.active ? "Deactivate" : "Activate"}</summary>
                          <ActionForm action={toggleSource} submit={src.active ? "Deactivate source" : "Activate source"} className="row" buttonClass="secondary small">
                            <input type="hidden" name="id" value={src.id} />
                          </ActionForm>
                        </details>
                        {isAdmin && (
                          <details className="inline-edit">
                            <summary>Delete</summary>
                            <ActionForm action={deleteSource} submit="Delete source" className="row" buttonClass="danger small"
                              confirm={`Delete “${src.name}” with all metrics and readings?`}>
                              <input type="hidden" name="id" value={src.id} />
                            </ActionForm>
                          </details>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {canEdit && (
              <div className="row" style={{ alignItems: "flex-start" }}>
                <details className="inline-edit" style={{ flex: 1 }}>
                  <summary>Add a data source to this site</summary>
                  <ActionForm action={createSource} submit="Add source">
                    <input type="hidden" name="site_id" value={site.id} />
                    <label>Name<input name="name" required placeholder="e.g. Inverter SMA-01" /></label>
                    <label>Type
                      <select name="kind" defaultValue="device">
                        <option value="device">Device (sends via API key)</option>
                        <option value="api">API integration (external system)</option>
                        <option value="manual">Manual entry / CSV import</option>
                      </select>
                    </label>
                  </ActionForm>
                </details>
                {isAdmin && (
                  <details className="inline-edit">
                    <summary>Delete site</summary>
                    <ActionForm action={deleteSite} submit="Delete site" className="row" buttonClass="danger small"
                      confirm={`Delete “${site.name}” with all sources, metrics and readings?`}>
                      <input type="hidden" name="id" value={site.id} />
                    </ActionForm>
                  </details>
                )}
              </div>
            )}
          </div>
        </Panel>
      ))}

      <Panel title="Integration API" meta="For devices, gateways and external systems (D2 §5.4)">
        <div className="stack" style={{ gap: 12 }}>
          <p className="small">
            Send readings with the source&apos;s API key. Unknown metric keys are created automatically; limits are then set here.
            Timestamps are optional (ISO 8601, default: now). Up to 5,000 readings per request.
          </p>
          <pre className="mono" style={{ margin: 0, padding: 14, background: "var(--surface)", borderRadius: 6, overflowX: "auto" }}>{`curl -X POST ${origin}/api/ingest \\
  -H "Authorization: Bearer gk_xxxxxxxx_..." \\
  -H "Content-Type: application/json" \\
  -d '{"readings":[
        {"metric":"soil_moisture","value":31.4,"unit":"%","name":"Soil moisture"},
        {"metric":"air_temp","value":24.8,"ts":"2026-09-27T10:00:00Z"}
      ]}'`}</pre>
          <p className="small muted">Response: <code>{`{"inserted":2,"alertsOpened":0,"metricsCreated":0}`}</code>. Health check: <code>GET /api/health</code>.</p>
        </div>
      </Panel>
    </div>
  );
}
