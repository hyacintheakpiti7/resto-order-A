import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, cashClosures, orders, restaurantTables } from "@/db/schema";
import { handleError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import type { OrderStatus } from "@/lib/constants";
import { toNumber } from "@/lib/format";
import { endOfDay, getSettings, listOrders, startOfDay } from "@/lib/orders";
import { computeReport, rangeForPeriod } from "@/lib/reports";

const LIVE_STATUSES: OrderStatus[] = [
  "en_attente_validation",
  "validee",
  "assignee",
  "en_preparation",
  "prete",
];

type Period = "today" | "week" | "month";

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function salesSeries(rows: { createdAt: Date; total: string }[], period: Period, from: Date) {
  const points = new Map<string, { label: string; revenue: number; orders: number }>();
  if (period === "today") {
    for (let hour = 8; hour <= 23; hour += 1) {
      const key = String(hour);
      points.set(key, { label: `${String(hour).padStart(2, "0")}h`, revenue: 0, orders: 0 });
    }
    for (const row of rows) {
      const key = String(row.createdAt.getHours());
      const point = points.get(key);
      if (point) {
        point.revenue += toNumber(row.total);
        point.orders += 1;
      }
    }
  } else {
    const days = period === "week" ? 7 : 30;
    for (let index = 0; index < days; index += 1) {
      const date = new Date(from);
      date.setDate(from.getDate() + index);
      const key = dateKey(date);
      points.set(key, {
        label: days === 7 ? date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "") : String(date.getDate()),
        revenue: 0,
        orders: 0,
      });
    }
    for (const row of rows) {
      const point = points.get(dateKey(row.createdAt));
      if (point) {
        point.revenue += toNumber(row.total);
        point.orders += 1;
      }
    }
  }
  return [...points.values()];
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const requestedPeriod = new URL(request.url).searchParams.get("period");
    const period: Period = requestedPeriod === "week" || requestedPeriod === "month" ? requestedPeriod : "today";
    const range = period === "today"
      ? { from: startOfDay(), to: endOfDay(), label: "Aujourd’hui" }
      : rangeForPeriod(period);

    const [report, live, config, activity, tableRows, salesRows, closure] = await Promise.all([
      computeReport(range.from, range.to, range.label),
      listOrders({ statuses: LIVE_STATUSES, limit: 60 }),
      getSettings(),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8),
      db.select().from(restaurantTables).where(eq(restaurantTables.active, true)),
      db
        .select({ createdAt: orders.createdAt, total: orders.total })
        .from(orders)
        .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to))),
      db.select().from(cashClosures).where(eq(cashClosures.businessDate, dateKey(new Date()))).limit(1),
    ]);

    const now = Date.now();
    const pending = live.filter((order) => order.status === "en_attente_validation");
    const preparing = live.filter((order) => ["validee", "assignee", "en_preparation"].includes(order.status));
    const ready = live.filter((order) => order.status === "prete");
    const late = preparing.filter((order) => now - new Date(order.createdAt).getTime() > 20 * 60 * 1000);
    const alerts = [
      ...(pending.length ? [{ tone: "amber", title: `${pending.length} commande${pending.length > 1 ? "s" : ""} en attente`, message: "Validation caisse requise." }] : []),
      ...(late.length ? [{ tone: "rose", title: `${late.length} commande${late.length > 1 ? "s" : ""} dépassent 20 min`, message: "Vérifiez immédiatement l’avancement cuisine." }] : []),
      ...(closure.length === 0 ? [{ tone: "amber", title: "Clôture de caisse non effectuée", message: "Pensez à clôturer la journée avant votre départ." }] : []),
    ];

    return ok({
      report,
      live,
      settings: { currency: config.currency, restaurantName: config.restaurantName },
      user,
      activity: activity.map((item) => ({
        id: item.id,
        action: item.action,
        entity: item.entity,
        details: item.details,
        userName: item.userName,
        createdAt: item.createdAt.toISOString(),
      })),
      kitchen: { preparing: preparing.length, ready: ready.length, late: late.length, pending: pending.length },
      tables: { occupied: new Set(live.map((order) => order.tableNumber)).size, total: tableRows.length },
      alerts,
      series: salesSeries(salesRows.map((row) => ({ createdAt: row.createdAt, total: String(row.total) })), period, range.from),
    });
  } catch (error) {
    return handleError(error);
  }
}

export const dynamic = "force-dynamic";
