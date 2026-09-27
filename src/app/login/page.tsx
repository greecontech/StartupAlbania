import { redirect } from "next/navigation";
import { Logo, Mark } from "@/components/Logo";
import { one } from "@/lib/db";
import { getUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

/** Explains an unfinished setup instead of failing with a generic server error. */
async function setupProblem(): Promise<string | null> {
  if (!process.env.DATABASE_URL) return "The database is not connected. Set DATABASE_URL on the service (Railway: ${{Postgres.DATABASE_URL}}) and redeploy.";
  try {
    const row = await one<{ n: number }>("select count(*)::int as n from users");
    if (!row || row.n === 0) return "No administrator exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (min. 8 characters) on the service and redeploy.";
    return null;
  } catch {
    return "The database cannot be reached or is not initialised. Check DATABASE_URL and the deploy logs.";
  }
}

export default async function LoginPage() {
  const problem = await setupProblem();
  if (!problem && (await getUser().catch(() => null))) redirect("/");
  return (
    <main className="auth">
      <section className="auth-brand" aria-hidden="true">
        <div className="auth-brand-mark"><Mark size={64} color="#f7f1e9" /></div>
        <div>
          <p className="auth-kicker">Greecon Platform</p>
          <h1 className="auth-title">Nature and technology <em>in harmony.</em></h1>
          <p className="auth-lead">One intelligent system for renewable energy, smart agriculture and water management — monitored, measured and optimised in real time.</p>
        </div>
        <ul className="auth-sectors">
          <li>Energy</li><li>Agriculture</li><li>Water</li>
        </ul>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <Logo size={40} />
          {problem && <div className="notice error" role="alert">{problem}</div>}
          <LoginForm />
          <p className="auth-foot">Greecon shpk · Durana Tech Park, Shijak · <a href="https://greecon.earth">greecon.earth</a></p>
        </div>
      </section>
    </main>
  );
}
