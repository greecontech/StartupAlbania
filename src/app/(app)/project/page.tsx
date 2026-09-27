import { ActionForm } from "@/components/ActionForm";
import { Badge, Kpi, PageHead, Panel } from "@/components/ui";
import { query } from "@/lib/db";
import { PHASES, PROJECT_MONTHS, completedMonths, currentProjectMonth, monthLabel, projectStart } from "@/lib/project";
import { fmtDate } from "@/lib/format";
import { atLeast } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { setCompletedMonths, updateProjectItem } from "./actions";

export const metadata = { title: "Project plan" };

type Item = { id: string; kind: "result" | "activity" | "deliverable"; code: string; title: string; months: number[]; status: string; note: string };
const STATUS_LABELS: Record<string, string> = { planned: "Planned", in_progress: "In progress", done: "Done" };

function StatusEditor({ item }: { item: Item }) {
  return (
    <details className="inline-edit">
      <summary>Update</summary>
      <ActionForm action={updateProjectItem} submit="Save" resetOnSuccess={false}>
        <input type="hidden" name="id" value={item.id} />
        <label>Status
          <select name="status" defaultValue={item.status}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>Note<input name="note" defaultValue={item.note} maxLength={500} /></label>
      </ActionForm>
    </details>
  );
}

export default async function Project() {
  const user = await requireUser();
  const canEdit = atLeast(user.role, "operator");
  const [items, completed] = await Promise.all([query<Item>("select * from project_items order by sort"), completedMonths()]);
  const month = currentProjectMonth();
  const months = Array.from({ length: PROJECT_MONTHS }, (_, i) => i + 1);
  const plan = items.filter((i) => i.kind !== "deliverable");
  const deliverables = items.filter((i) => i.kind === "deliverable");
  const phase = PHASES.find((p) => p.month === month);
  const done = deliverables.filter((d) => d.status === "done").length;
  const end = projectStart();
  end.setUTCMonth(end.getUTCMonth() + PROJECT_MONTHS);
  end.setUTCDate(0);

  return (
    <div className="stack">
      <PageHead title="Project plan"
        intro="Greecon Platform — Startup Albania 2026, supported by the Ministry of Economy and Innovation. Activity plan (Aneksi 1) and technology development deliverables (ToR, D1–D7)." />

      <div className="kpis">
        <Kpi label="Current month" value={month >= 1 && month <= PROJECT_MONTHS ? `Month ${month}` : month < 1 ? "Not started" : "Completed"}
          unit={month >= 1 && month <= PROJECT_MONTHS ? `/ ${PROJECT_MONTHS}` : undefined} sub={month >= 1 && month <= PROJECT_MONTHS ? monthLabel(month) : undefined} />
        <Kpi label="Completed" value={`${completed} / ${PROJECT_MONTHS}`} unit="months"
          sub={completed ? `through ${monthLabel(completed)}` : "none yet"} />
        <Kpi label="Implementation window" value={fmtDate(projectStart())} sub={`to ${fmtDate(end)}`} />
        <Kpi label="Deliverables" value={`${done} / ${deliverables.length}`} sub="completed" />
      </div>

      {canEdit && (
        <Panel title="Progress" meta="Mark how many project months are completed">
          <ActionForm action={setCompletedMonths} submit="Save" resetOnSuccess={false} className="row">
            <label style={{ minWidth: 220 }}>Completed months
              <select name="months" defaultValue={String(completed)}>
                {[0, ...months].map((m) => <option key={m} value={m}>{m === 0 ? "None" : `${m} of ${PROJECT_MONTHS} — through ${monthLabel(m)}`}</option>)}
              </select>
            </label>
          </ActionForm>
        </Panel>
      )}

      {phase && (
        <Panel title={`Month ${phase.month} — ${phase.phase}`} meta="Focus of the current month (D1 §4)">
          <div className="grid-2">
            <div><div className="small muted">Main activities</div><p>{phase.activities}</p></div>
            <div><div className="small muted">Expected result</div><p>{phase.result}</p></div>
          </div>
        </Panel>
      )}

      <Panel title="Activity plan" meta="Plani i aktiviteteve dhe dukshmërisë — Aneksi 1" flush>
        <div className="table-wrap">
          <table className="gantt">
            <thead>
              <tr>
                <th>Activity</th>
                {months.map((m) => <th key={m} className={`num ${m <= completed ? "done" : m === month ? "now" : ""}`} style={{ textAlign: "center" }}>M{m}{m <= completed ? " ✓" : ""}<div style={{ textTransform: "none", letterSpacing: 0 }}>{monthLabel(m)}</div></th>)}
                <th>Status</th>{canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {plan.map((item) => item.kind === "result" ? (
                <tr key={item.id} className="result"><td colSpan={months.length + (canEdit ? 3 : 2)}>{item.code}: {item.title}</td></tr>
              ) : (
                <tr key={item.id}>
                  <td><span className="muted small">{item.code}</span> {item.title}{item.note && <div className="small muted">{item.note}</div>}</td>
                  {months.map((m) => (
                    <td key={m} className="m">{item.months.includes(m) && <div className={`bar ${m <= completed ? "done" : m === month ? "now" : ""}`} />}</td>
                  ))}
                  <td><Badge status={item.status} label={STATUS_LABELS[item.status]} /></td>
                  {canEdit && <td className="right"><StatusEditor item={item} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Technology development deliverables" meta="Eksperti për Zhvillim Teknologjik — Aneksi I (ToR), §3" flush>
        <div className="table-wrap">
          <table>
            <thead><tr><th>No.</th><th>Deliverable</th><th>Due</th><th>Status</th>{canEdit && <th />}</tr></thead>
            <tbody>
              {deliverables.map((d) => (
                <tr key={d.id}>
                  <td>{d.code}</td>
                  <td>{d.title}{d.note && <div className="small muted">{d.note}</div>}</td>
                  <td className="small">{d.months.map((m) => `Month ${m}`).join(", ")}</td>
                  <td><Badge status={d.status} label={STATUS_LABELS[d.status]} /></td>
                  {canEdit && <td className="right"><StatusEditor item={d} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Development phases" meta="Plan Pune për Zhvillimin Teknologjik (D1)" flush>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Month</th><th>Main activities</th><th>Result</th></tr></thead>
            <tbody>
              {PHASES.map((p) => (
                <tr key={p.month} style={p.month === month ? { background: "rgba(68,133,97,0.08)" } : undefined}>
                  <td style={{ whiteSpace: "nowrap" }}>Month {p.month}<div className="small muted">{monthLabel(p.month)}</div>
                    {p.month <= completed && <Badge status="done" label="Completed" />}</td>
                  <td className="small">{p.activities}</td>
                  <td className="small">{p.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
