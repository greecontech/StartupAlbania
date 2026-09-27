import { query } from "./db";

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null = null,
  detail: Record<string, unknown> = {}
) {
  await query(
    "insert into audit_events (user_id, action, entity, entity_id, detail) values ($1, $2, $3, $4, $5)",
    [userId, action, entity, entityId, JSON.stringify(detail)]
  );
}
