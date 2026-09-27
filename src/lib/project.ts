import { one } from "./db";

// Startup Albania 2026 — 5-month implementation window (Aneksi 1).
export const PROJECT_MONTHS = 5;

export function projectStart() {
  return new Date(process.env.PROJECT_START_DATE || "2026-08-01T00:00:00Z");
}

/** 1-based project month for `now`, 0 before start, >5 after the end. */
export function currentProjectMonth(now = new Date()) {
  const start = projectStart();
  if (now < start) return 0;
  return (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth()) + 1;
}

export function monthLabel(index: number) {
  const d = projectStart();
  d.setUTCMonth(d.getUTCMonth() + index - 1);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

// D1 — Plani indikativ i aktiviteteve (Plan Pune për Zhvillimin Teknologjik, §4).
export const PHASES = [
  { month: 1, phase: "Analiza e specifikimi", activities: "Analiza e konceptit, objektivave dhe nevojave të platformës; identifikimi i përdoruesve dhe funksionaliteteve prioritare; specifikimi i kërkesave funksionale dhe teknike", result: "Kërkesat funksionale dhe teknike të strukturuara" },
  { month: 2, phase: "Strukturimi funksional dhe teknik", activities: "Strukturimi i moduleve dhe funksionaliteteve; përcaktimi i rrjedhës së përdorimit; fillimi i zhvillimit/përmirësimit të komponentëve prioritarë", result: "Strukturë funksionale dhe teknike e përcaktuar" },
  { month: 3, phase: "Zhvillimi dhe integrimi", activities: "Zhvillimi dhe përmirësimi i funksionaliteteve; integrimi gradual i komponentëve", result: "Funksionalitete prioritare të zhvilluara/integruara" },
  { month: 4, phase: "Testimi dhe përmirësimi", activities: "Testimi funksional dhe teknik; evidentimi i problematikave; korrigjime dhe optimizime", result: "Version i përmirësuar pas testimit" },
  { month: 5, phase: "Konsolidimi dhe përgatitja për pilotim", activities: "Konsolidimi i funksionaliteteve; testimi përfundimtar i kësaj faze; përgatitja për demonstrim dhe pilotim; dokumentimi", result: "Version funksional për demonstrim dhe pilotim" }
] as const;

/** Months marked as completed on the Project plan page (settings: project_completed_months). */
export async function completedMonths() {
  const row = await one<{ value: number }>("select value from settings where key = 'project_completed_months'").catch(() => null);
  const n = Number(row?.value ?? 0);
  return Number.isInteger(n) ? Math.min(Math.max(n, 0), PROJECT_MONTHS) : 0;
}
