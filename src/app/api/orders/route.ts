import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, dishes, orderItemSupplements, orderItems, orders, supplements } from "@/db/schema";
import { fail, handleError, ok } from "@/lib/api";
import { logAction, requireUser } from "@/lib/auth";
import { getSettings, listOrders, nextReference, notify, startOfDay, endOfDay } from "@/lib/orders";
import { toNumber } from "@/lib/format";
import type { OrderStatus } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope") ?? "all";
    const statusParam = params.get("status");
    const statuses = statusParam
      ? (statusParam.split(",").filter(Boolean) as OrderStatus[])
      : undefined;

    const filter: Parameters<typeof listOrders>[0] = {
      statuses,
      limit: Number(params.get("limit") ?? 200),
    };
    if (params.get("today") === "1") {
      filter.from = startOfDay();
      filter.to = endOfDay();
    }
    if (scope === "mine") {
      if (user.role === "serveur") filter.serverId = user.id;
      if (user.role === "cuisinier") filter.cookId = user.id;
    }
    const rows = await listOrders(filter);
    return ok({ orders: rows });
  } catch (error) {
    return handleError(error);
  }
}

type ItemInput = {
  dishId: number;
  quantity: number;
  notes?: string;
  supplementIds?: number[];
};

export async function POST(request: Request) {
  try {
    const user = await requireUser(["serveur", "admin"]);
    const body = await request.json();
    const tableNumber = String(body.tableNumber ?? "").trim();
    const guests = Math.max(1, Number(body.guests ?? 1));
    const items = (body.items ?? []) as ItemInput[];
    if (!tableNumber) return fail("Le numéro de table est obligatoire");
    if (!Array.isArray(items) || items.length === 0) return fail("Ajoutez au moins un plat");

    const dishIds = [...new Set(items.map((i) => Number(i.dishId)))];
    const dishRows = await db.select().from(dishes).where(inArray(dishes.id, dishIds));
    if (dishRows.length !== dishIds.length) return fail("Un plat sélectionné est introuvable");
    const unavailable = dishRows.find((d) => !d.available);
    if (unavailable) return fail(`Le plat « ${unavailable.name} » n'est plus disponible`);

    const catRows = await db
      .select()
      .from(categories)
      .where(inArray(categories.id, [...new Set(dishRows.map((d) => d.categoryId))]));

    const supIds = [...new Set(items.flatMap((i) => (i.supplementIds ?? []).map(Number)))];
    const supRows = supIds.length
      ? await db.select().from(supplements).where(inArray(supplements.id, supIds))
      : [];

    const config = await getSettings();
    const taxRate = toNumber(config.taxRate) / 100;
    const serviceRate = toNumber(config.serviceRate) / 100;

    let subtotal = 0;
    const prepared = items.map((item) => {
      const dish = dishRows.find((d) => d.id === Number(item.dishId))!;
      const cat = catRows.find((c) => c.id === dish.categoryId);
      const qty = Math.max(1, Number(item.quantity ?? 1));
      const chosen = (item.supplementIds ?? [])
        .map((id) => supRows.find((s) => s.id === Number(id)))
        .filter((s): s is (typeof supRows)[number] => Boolean(s));
      const supTotal = chosen.reduce((sum, s) => sum + toNumber(s.price), 0);
      const lineTotal = (toNumber(dish.price) + supTotal) * qty;
      subtotal += lineTotal;
      return { dish, cat, qty, chosen, supTotal, lineTotal, notes: String(item.notes ?? "") };
    });

    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const serviceAmount = Math.round(subtotal * serviceRate * 100) / 100;
    const total = subtotal + taxAmount + serviceAmount;
    const reference = await nextReference();

    const [order] = await db
      .insert(orders)
      .values({
        reference,
        tableNumber,
        guests,
        notes: String(body.notes ?? ""),
        status: "en_attente_validation",
        serverId: user.id,
        serverName: user.fullName,
        subtotal: String(subtotal),
        taxAmount: String(taxAmount),
        serviceAmount: String(serviceAmount),
        total: String(total),
      })
      .returning();

    for (const line of prepared) {
      const [row] = await db
        .insert(orderItems)
        .values({
          orderId: order.id,
          dishId: line.dish.id,
          dishName: line.dish.name,
          categoryName: line.cat?.name ?? "",
          unitPrice: String(toNumber(line.dish.price)),
          quantity: line.qty,
          supplementsTotal: String(line.supTotal * line.qty),
          lineTotal: String(line.lineTotal),
          notes: line.notes,
        })
        .returning();
      if (line.chosen.length) {
        await db.insert(orderItemSupplements).values(
          line.chosen.map((s) => ({
            orderItemId: row.id,
            orderId: order.id,
            supplementId: s.id,
            name: s.name,
            price: String(toNumber(s.price)),
          })),
        );
      }
    }

    await notify({
      targetRole: "caissier",
      orderId: order.id,
      orderReference: reference,
      type: "nouvelle_commande",
      title: `Nouvelle commande ${reference}`,
      message: `Table ${tableNumber} • ${guests} couvert(s) • ${prepared.length} article(s) — en attente de validation.`,
    });
    await logAction(user, "creation_commande", "order", order.id, `${reference} — table ${tableNumber}`);

    return ok({ id: order.id, reference }, 201);
  } catch (error) {
    return handleError(error);
  }
}
