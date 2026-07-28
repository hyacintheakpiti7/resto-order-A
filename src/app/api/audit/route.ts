import { desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { handleError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser(["admin"]);
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 150);
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.min(500, limit));
    return ok({ logs: rows });
  } catch (error) {
    return handleError(error);
  }
}

export const dynamic = "force-dynamic";
