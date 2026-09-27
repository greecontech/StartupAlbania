import { one } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await one("select 1");
    return Response.json({ status: "ok", database: "ok", time: new Date().toISOString() });
  } catch {
    return Response.json({ status: "degraded", database: "unreachable" }, { status: 503 });
  }
}
