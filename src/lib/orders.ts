import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  notifications,
  orderItemSupplements,
  orderItems,
  orders,
  payments,
  settings,
} from "@/db/schema";
import { toNumber } from "@/lib/format";
import type { OrderStatus } from "@/lib/constants";

export type SupplementLine = { id: number; name: string; price: number };
export type ItemLine = {
  id: number;
  dishId: number | null;
  dishName: string;
  categoryName: string;
  unitPrice: number;
  quantity: number;
  supplementsTotal: number;
  lineTotal: number;
  notes: string;
  supplements: SupplementLine[];
};

export type OrderDTO = {
  id: number;
  reference: string;
  tableNumber: string;
  guests: number;
  status: OrderStatus;
  priority: string;
  notes: string;
  serverId: number | null;
  serverName: string | null;
  cashierId: number | null;
  cashierName: string | null;
  chefId: number | null;
  chefName: string | null;
  cookId: number | null;
  cookName: string | null;
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  total: number;
  paidAmount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string;
  validatedAt: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  prepSeconds: number | null;
  serviceSeconds: number | null;
  items: ItemLine[];
  payments: {
    id: number;
    reference: string;
    method: string;
    amount: number;
    status: string;
    cashierName: string | null;
    createdAt: string;
  }[];
};

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (row) return row;
  const [created] = await db.insert(settings).values({ id: 1 }).returning();
  return created;
}

export async function nextReference(): Promise<string> {
  const now = new Date();
  const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`${orders.reference} like ${`CMD-${day}-%`}`);
  return `CMD-${day}-${String(count + 1).padStart(4, "0")}`;
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export type OrderFilter = {
  statuses?: OrderStatus[];
  serverId?: number;
  cookId?: number;
  from?: Date;
  to?: Date;
  limit?: number;
  reference?: string;
  ids?: number[];
};

export async function listOrders(filter: OrderFilter = {}): Promise<OrderDTO[]> {
  const conditions = [];
  if (filter.statuses?.length) conditions.push(inArray(orders.status, filter.statuses));
  if (filter.serverId) conditions.push(eq(orders.serverId, filter.serverId));
  if (filter.cookId) conditions.push(eq(orders.cookId, filter.cookId));
  if (filter.from) conditions.push(gte(orders.createdAt, filter.from));
  if (filter.to) conditions.push(lte(orders.createdAt, filter.to));
  if (filter.reference) conditions.push(eq(orders.reference, filter.reference));
  if (filter.ids) conditions.push(inArray(orders.id, filter.ids.length ? filter.ids : [-1]));

  const rows = await db
    .select()
    .from(orders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(filter.limit ?? 200);

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));
  const sups = await db
    .select()
    .from(orderItemSupplements)
    .where(inArray(orderItemSupplements.orderId, ids));
  const pays = await db.select().from(payments).where(inArray(payments.orderId, ids));

  return rows.map((order) => ({
    id: order.id,
    reference: order.reference,
    tableNumber: order.tableNumber,
    guests: order.guests,
    status: order.status as OrderStatus,
    priority: order.priority,
    notes: order.notes ?? "",
    serverId: order.serverId,
    serverName: order.serverName,
    cashierId: order.cashierId,
    cashierName: order.cashierName,
    chefId: order.chefId,
    chefName: order.chefName,
    cookId: order.cookId,
    cookName: order.cookName,
    subtotal: toNumber(order.subtotal),
    taxAmount: toNumber(order.taxAmount),
    serviceAmount: toNumber(order.serviceAmount),
    total: toNumber(order.total),
    paidAmount: toNumber(order.paidAmount),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
    validatedAt: iso(order.validatedAt),
    assignedAt: iso(order.assignedAt),
    startedAt: iso(order.startedAt),
    readyAt: iso(order.readyAt),
    deliveredAt: iso(order.deliveredAt),
    cancelledAt: iso(order.cancelledAt),
    cancelReason: order.cancelReason,
    prepSeconds: order.prepSeconds,
    serviceSeconds: order.serviceSeconds,
    items: items
      .filter((i) => i.orderId === order.id)
      .map((item) => ({
        id: item.id,
        dishId: item.dishId,
        dishName: item.dishName,
        categoryName: item.categoryName ?? "",
        unitPrice: toNumber(item.unitPrice),
        quantity: item.quantity,
        supplementsTotal: toNumber(item.supplementsTotal),
        lineTotal: toNumber(item.lineTotal),
        notes: item.notes ?? "",
        supplements: sups
          .filter((s) => s.orderItemId === item.id)
          .map((s) => ({ id: s.id, name: s.name, price: toNumber(s.price) })),
      })),
    payments: pays
      .filter((p) => p.orderId === order.id)
      .map((p) => ({
        id: p.id,
        reference: p.reference,
        method: p.method,
        amount: toNumber(p.amount),
        status: p.status,
        cashierName: p.cashierName,
        createdAt: p.createdAt.toISOString(),
      })),
  }));
}

export async function getOrder(id: number): Promise<OrderDTO | null> {
  const [order] = await listOrders({ ids: [id], limit: 1 });
  return order ?? null;
}

export async function notify(input: {
  targetRole?: string | null;
  targetUserId?: number | null;
  orderId?: number | null;
  orderReference?: string | null;
  type?: string;
  title: string;
  message?: string;
}) {
  await db.insert(notifications).values({
    targetRole: input.targetRole ?? null,
    targetUserId: input.targetUserId ?? null,
    orderId: input.orderId ?? null,
    orderReference: input.orderReference ?? null,
    type: input.type ?? "info",
    title: input.title,
    message: input.message ?? "",
  });
}

export function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
