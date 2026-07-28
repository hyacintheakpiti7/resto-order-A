import { and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { toNumber } from "@/lib/format";

export type ReportBucket = { key: string; label: string; orders: number; revenue: number };

export type ReportData = {
  range: { from: string; to: string; label: string };
  totals: {
    orders: number;
    paidOrders: number;
    cancelledOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    revenue: number;
    cashed: number;
    averageTicket: number;
    averagePrepSeconds: number;
    averageServiceSeconds: number;
  };
  byServer: ReportBucket[];
  byCook: (ReportBucket & { avgPrep: number })[];
  byDish: { key: string; label: string; quantity: number; revenue: number }[];
  byCategory: { key: string; label: string; quantity: number; revenue: number }[];
  byPaymentMethod: { key: string; label: string; count: number; amount: number }[];
  byHour: { hour: string; orders: number; revenue: number }[];
  statusCounts: Record<string, number>;
};

const CANCELLED = "annulee";

export async function computeReport(from: Date, to: Date, label: string): Promise<ReportData> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)));

  const itemRows = await db
    .select({
      orderId: orderItems.orderId,
      dishName: orderItems.dishName,
      categoryName: orderItems.categoryName,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems);

  const paymentRows = await db
    .select()
    .from(payments)
    .where(and(gte(payments.createdAt, from), lte(payments.createdAt, to)));

  const validOrders = orderRows.filter((o) => o.status !== CANCELLED);
  const orderIds = new Set(validOrders.map((o) => o.id));
  const revenue = validOrders.reduce((sum, o) => sum + toNumber(o.total), 0);
  const cashed = paymentRows
    .filter((p) => p.status === "valide")
    .reduce((sum, p) => sum + toNumber(p.amount), 0);

  const prepDurations = orderRows.filter((o) => o.prepSeconds !== null).map((o) => o.prepSeconds!);
  const serviceDurations = orderRows
    .filter((o) => o.serviceSeconds !== null)
    .map((o) => o.serviceSeconds!);

  const serverMap = new Map<string, ReportBucket>();
  for (const o of validOrders) {
    const key = String(o.serverId ?? 0);
    const entry = serverMap.get(key) ?? {
      key,
      label: o.serverName ?? "Inconnu",
      orders: 0,
      revenue: 0,
    };
    entry.orders += 1;
    entry.revenue += toNumber(o.total);
    serverMap.set(key, entry);
  }

  const cookMap = new Map<string, ReportBucket & { avgPrep: number; _sum: number; _n: number }>();
  for (const o of validOrders.filter((x) => x.cookId)) {
    const key = String(o.cookId);
    const entry = cookMap.get(key) ?? {
      key,
      label: o.cookName ?? "Inconnu",
      orders: 0,
      revenue: 0,
      avgPrep: 0,
      _sum: 0,
      _n: 0,
    };
    entry.orders += 1;
    entry.revenue += toNumber(o.total);
    if (o.prepSeconds) {
      entry._sum += o.prepSeconds;
      entry._n += 1;
    }
    cookMap.set(key, entry);
  }

  const dishMap = new Map<string, { key: string; label: string; quantity: number; revenue: number }>();
  const catMap = new Map<string, { key: string; label: string; quantity: number; revenue: number }>();
  for (const item of itemRows) {
    if (!orderIds.has(item.orderId)) continue;
    const d = dishMap.get(item.dishName) ?? {
      key: item.dishName,
      label: item.dishName,
      quantity: 0,
      revenue: 0,
    };
    d.quantity += item.quantity;
    d.revenue += toNumber(item.lineTotal);
    dishMap.set(item.dishName, d);

    const catName = item.categoryName || "Autres";
    const c = catMap.get(catName) ?? { key: catName, label: catName, quantity: 0, revenue: 0 };
    c.quantity += item.quantity;
    c.revenue += toNumber(item.lineTotal);
    catMap.set(catName, c);
  }

  const methodMap = new Map<string, { key: string; label: string; count: number; amount: number }>();
  for (const p of paymentRows) {
    const entry = methodMap.get(p.method) ?? { key: p.method, label: p.method, count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += toNumber(p.amount);
    methodMap.set(p.method, entry);
  }

  const hourMap = new Map<number, { orders: number; revenue: number }>();
  for (const o of validOrders) {
    const h = o.createdAt.getHours();
    const entry = hourMap.get(h) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += toNumber(o.total);
    hourMap.set(h, entry);
  }

  const statusCounts: Record<string, number> = {};
  for (const o of orderRows) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return {
    range: { from: from.toISOString(), to: to.toISOString(), label },
    totals: {
      orders: orderRows.length,
      paidOrders: orderRows.filter((o) => o.paymentStatus === "paye").length,
      cancelledOrders: orderRows.filter((o) => o.status === CANCELLED).length,
      pendingOrders: orderRows.filter((o) =>
        ["en_attente_validation", "validee", "assignee", "en_preparation", "prete"].includes(o.status),
      ).length,
      deliveredOrders: orderRows.filter((o) => o.status === "livree").length,
      revenue,
      cashed,
      averageTicket: validOrders.length ? Math.round((revenue / validOrders.length) * 100) / 100 : 0,
      averagePrepSeconds: avg(prepDurations),
      averageServiceSeconds: avg(serviceDurations),
    },
    byServer: [...serverMap.values()].sort((a, b) => b.revenue - a.revenue),
    byCook: [...cookMap.values()]
      .map(({ _sum, _n, ...rest }) => ({ ...rest, avgPrep: _n ? Math.round(_sum / _n) : 0 }))
      .sort((a, b) => b.orders - a.orders),
    byDish: [...dishMap.values()].sort((a, b) => b.quantity - a.quantity),
    byCategory: [...catMap.values()].sort((a, b) => b.revenue - a.revenue),
    byPaymentMethod: [...methodMap.values()].sort((a, b) => b.amount - a.amount),
    byHour: [...hourMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, v]) => ({ hour: `${String(hour).padStart(2, "0")}h`, ...v })),
    statusCounts,
  };
}

export function rangeForPeriod(period: string, reference = new Date()) {
  const from = new Date(reference);
  const to = new Date(reference);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  let label = "Journalier";

  if (period === "week") {
    const day = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - day);
    to.setTime(from.getTime());
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    label = "Hebdomadaire";
  } else if (period === "month") {
    from.setDate(1);
    to.setMonth(from.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    label = "Mensuel";
  } else if (period === "year") {
    from.setMonth(0, 1);
    to.setMonth(11, 31);
    to.setHours(23, 59, 59, 999);
    label = "Annuel";
  }
  return { from, to, label };
}
