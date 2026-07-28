import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { cashClosures, orders } from "@/db/schema";
import { fail, handleError, ok } from "@/lib/api";
import { logAction, requireUser } from "@/lib/auth";
import { computeReport } from "@/lib/reports";
import { endOfDay, startOfDay } from "@/lib/orders";
import { todayKey } from "@/lib/format";

export async function GET() {
  try {
    await requireUser(["admin", "caissier"]);
    const rows = await db
      .select()
      .from(cashClosures)
      .orderBy(desc(cashClosures.createdAt))
      .limit(60);
    const preview = await computeReport(startOfDay(), endOfDay(), "Journalier");
    return ok({ closures: rows, preview });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST() {
  try {
    const user = await requireUser(["admin", "caissier"]);
    const from = startOfDay();
    const to = endOfDay();
    const businessDate = todayKey();

    const existing = await db
      .select()
      .from(cashClosures)
      .where(eq(cashClosures.businessDate, businessDate))
      .limit(1);
    if (existing.length) return fail("La caisse a déjà été clôturée pour aujourd'hui");

    const report = await computeReport(from, to, "Journalier");
    const breakdown: Record<string, number> = {};
    for (const m of report.byPaymentMethod) breakdown[m.key] = m.amount;

    const [closure] = await db
      .insert(cashClosures)
      .values({
        businessDate,
        cashierId: user.id,
        cashierName: user.fullName,
        totalOrders: report.totals.orders,
        paidOrders: report.totals.paidOrders,
        cancelledOrders: report.totals.cancelledOrders,
        pendingOrders: report.totals.pendingOrders,
        revenue: String(report.totals.revenue),
        cashed: String(report.totals.cashed),
        balance: String(report.totals.cashed - report.totals.revenue),
        breakdown,
      })
      .returning();

    await db
      .update(orders)
      .set({ closureId: closure.id })
      .where(
        and(gte(orders.createdAt, from), lte(orders.createdAt, to), isNull(orders.closureId)),
      );

    await logAction(user, "cloture_caisse", "closure", closure.id, `${businessDate} — ${report.totals.cashed}`);
    return ok({ closure }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export const dynamic = "force-dynamic";
