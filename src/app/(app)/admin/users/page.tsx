import { ActionForm } from "@/components/ActionForm";
import { Badge, PageHead, Panel } from "@/components/ui";
import { query } from "@/lib/db";
import { fmtRelative } from "@/lib/format";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { createUser, resetPassword, updateUser } from "./actions";

export const metadata = { title: "Users & roles" };

export default async function Users() {
  const me = await requireUser("admin");
  const users = await query<{ id: string; email: string; name: string; role: Role; active: boolean; created_at: Date; last_login_at: Date | null }>(
    "select id, email, name, role, active, created_at, last_login_at from users order by active desc, name"
  );

  return (
    <div className="stack">
      <PageHead title="Users & roles" intro="Create accounts, assign roles and control access (D2 §5.1). Changes apply on the user's next request." />

      <div className="grid-3">
        {ROLES.map((r) => (
          <div key={r} className="kpi">
            <div className="label">{ROLE_LABELS[r]}</div>
            <div className="value" style={{ fontSize: 22 }}>{users.filter((u) => u.role === r && u.active).length}</div>
            <div className="sub">{ROLE_DESCRIPTIONS[r]}</div>
          </div>
        ))}
      </div>

      <Panel title="Add user">
        <ActionForm action={createUser} submit="Create user">
          <label>Name<input name="name" required maxLength={120} /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Role
            <select name="role" defaultValue="viewer">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </label>
          <label>Initial password<input name="password" type="password" minLength={10} required autoComplete="new-password" /></label>
        </ActionForm>
      </Panel>

      <Panel title={`${users.length} users`} flush>
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}{u.id === me.id && <span className="muted small"> (you)</span>}<div className="small muted">{u.email}</div></td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td><Badge status={u.active ? "active" : "inactive"} /></td>
                  <td className="small">{fmtRelative(u.last_login_at)}</td>
                  <td className="right">
                    <details className="inline-edit">
                      <summary>Manage</summary>
                      <div className="stack" style={{ gap: 12, textAlign: "left" }}>
                        <ActionForm action={updateUser} submit="Save" resetOnSuccess={false}>
                          <input type="hidden" name="id" value={u.id} />
                          <label>Name<input name="name" defaultValue={u.name} required /></label>
                          <label>Role
                            <select name="role" defaultValue={u.role}>
                              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                          </label>
                          <label className="inline"><input type="checkbox" name="active" defaultChecked={u.active} /> Active</label>
                        </ActionForm>
                        <ActionForm action={resetPassword} submit="Reset password" buttonClass="secondary">
                          <input type="hidden" name="id" value={u.id} />
                          <label>New password<input name="password" type="password" minLength={10} required autoComplete="new-password" /></label>
                        </ActionForm>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
