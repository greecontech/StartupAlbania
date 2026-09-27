// D2 §4 — user groups: system administrators, operators, authorized (read-only) users.
export const ROLES = ["admin", "operator", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  operator: "Operator",
  viewer: "Authorized user"
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Manages users, roles, configuration, sources and all data.",
  operator: "Monitors, enters and imports data, manages sources and handles alerts.",
  viewer: "Read-only access to dashboard, monitoring, alerts and reports."
};

const RANK: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };

export function atLeast(role: Role, required: Role) {
  return RANK[role] >= RANK[required];
}
