import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { handleError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(notifications)
      .where(
        or(eq(notifications.targetUserId, user.id), eq(notifications.targetRole, user.role)),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(40);
    const unread = rows.filter((r) => !r.readAt).length;
    return ok({ notifications: rows, unread });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const id = body?.id ? Number(body.id) : null;
    if (id) {
      await db
        .update(notifications)
        .set({ readAt: sql`now()` })
        .where(eq(notifications.id, id));
    } else {
      await db
        .update(notifications)
        .set({ readAt: sql`now()` })
        .where(
          and(
            isNull(notifications.readAt),
            or(eq(notifications.targetUserId, user.id), eq(notifications.targetRole, user.role)),
          ),
        );
    }
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

export const dynamic = "force-dynamic";
