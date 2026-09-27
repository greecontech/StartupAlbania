import { ActionForm } from "@/components/ActionForm";
import { PageHead, Panel } from "@/components/ui";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { changePassword, updateProfile } from "./actions";

export const metadata = { title: "Account" };

export default async function Account() {
  const user = await requireUser();
  return (
    <div className="stack">
      <PageHead title="Account" intro={`${user.email} · ${ROLE_LABELS[user.role]} — ${ROLE_DESCRIPTIONS[user.role]}`} />
      <div className="grid-2">
        <Panel title="Profile">
          <ActionForm action={updateProfile} submit="Save" resetOnSuccess={false}>
            <label>Name<input name="name" defaultValue={user.name} required /></label>
          </ActionForm>
        </Panel>
        <Panel title="Change password">
          <ActionForm action={changePassword} submit="Change password">
            <label>Current password<input name="current" type="password" required autoComplete="current-password" /></label>
            <label>New password<input name="next" type="password" minLength={10} required autoComplete="new-password" /></label>
            <label>Repeat new password<input name="confirm" type="password" minLength={10} required autoComplete="new-password" /></label>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
