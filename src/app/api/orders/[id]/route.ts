import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  dishes,
  orderItemSupplements,
  orderItems,
  orders,
  payments,
  supplements,
  users,
} from "@/db/schema";
import { fail, handleError, ok } from "@/lib/api";
import { logAction, requireUser } from "@/lib/auth";
import { getOrder, getSettings, notify } from "@/lib/orders";
import { toNumber } from "@/lib/format";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const order = await getOrder(Number(id));
    if (!order) return fail("Commande introuvable", 404);
    return ok({ order });
  } catch (error) {
    return handleError(error);
  }
}

async function recomputeTotals(orderId: number) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const config = await getSettings();
  const subtotal = items.reduce((sum, i) => sum + toNumber(i.lineTotal), 0);
  const taxAmount = Math.round(subtotal * (toNumber(config.taxRate) / 100) * 100) / 100;
  const serviceAmount = Math.round(subtotal * (toNumber(config.serviceRate) / 100) * 100) / 100;
  const total = subtotal + taxAmount + serviceAmount;
  await db
    .update(orders)
    .set({
      subtotal: String(subtotal),
      taxAmount: String(taxAmount),
      serviceAmount: String(serviceAmount),
      total: String(total),
    })
    .where(eq(orders.id, orderId));
  return total;
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id: rawId } = await ctx.params;
    const orderId = Number(rawId);
    const body = await request.json();
    const action = String(body.action ?? "");

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return fail("Commande introuvable", 404);
    const now = new Date();

    /* ---------------- Caisse : modification des articles ---------------- */
    if (action === "update-items") {
      if (!["caissier", "admin"].includes(user.role)) return fail("Accès non autorisé", 403);
      const config = await getSettings();
      if (user.role === "caissier" && !config.cashierCanEditOrders) {
        return fail("La modification des commandes est désactivée pour la caisse", 403);
      }
      if (order.status !== "en_attente_validation") {
        return fail("La commande ne peut plus être modifiée");
      }
      const items = (body.items ?? []) as {
        dishId: number;
        quantity: number;
        notes?: string;
        supplementIds?: number[];
      }[];
      if (items.length === 0) return fail("La commande doit contenir au moins un article");

      const dishIds = [...new Set(items.map((i) => Number(i.dishId)))];
      const dishRows = await db.select().from(dishes).where(inArray(dishes.id, dishIds));
      const catRows = await db
        .select()
        .from(categories)
        .where(inArray(categories.id, [...new Set(dishRows.map((d) => d.categoryId))]));
      const supIds = [...new Set(items.flatMap((i) => (i.supplementIds ?? []).map(Number)))];
      const supRows = supIds.length
        ? await db.select().from(supplements).where(inArray(supplements.id, supIds))
        : [];

      await db.delete(orderItemSupplements).where(eq(orderItemSupplements.orderId, orderId));
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

      for (const item of items) {
        const dish = dishRows.find((d) => d.id === Number(item.dishId));
        if (!dish) continue;
        const qty = Math.max(1, Number(item.quantity ?? 1));
        const chosen = (item.supplementIds ?? [])
          .map((sid) => supRows.find((s) => s.id === Number(sid)))
          .filter((s): s is (typeof supRows)[number] => Boolean(s));
        const supTotal = chosen.reduce((sum, s) => sum + toNumber(s.price), 0);
        const [row] = await db
          .insert(orderItems)
          .values({
            orderId,
            dishId: dish.id,
            dishName: dish.name,
            categoryName: catRows.find((c) => c.id === dish.categoryId)?.name ?? "",
            unitPrice: String(toNumber(dish.price)),
            quantity: qty,
            supplementsTotal: String(supTotal * qty),
            lineTotal: String((toNumber(dish.price) + supTotal) * qty),
            notes: String(item.notes ?? ""),
          })
          .returning();
        if (chosen.length) {
          await db.insert(orderItemSupplements).values(
            chosen.map((s) => ({
              orderItemId: row.id,
              orderId,
              supplementId: s.id,
              name: s.name,
              price: String(toNumber(s.price)),
            })),
          );
        }
      }
      const total = await recomputeTotals(orderId);
      await logAction(user, "modification_commande", "order", orderId, `${order.reference} — nouveau total ${total}`);
      return ok({ success: true, total });
    }

    /* ---------------- Caisse : validation + encaissement ---------------- */
    if (action === "validate") {
      if (!["caissier", "admin"].includes(user.role)) return fail("Accès non autorisé", 403);
      if (order.status !== "en_attente_validation") return fail("Commande déjà validée");
      const lines = (body.payments ?? []) as { method: PaymentMethod; amount: number }[];
      const valid = lines.filter((l) => l.method && Number(l.amount) > 0);
      if (valid.length === 0) return fail("Renseignez au moins un règlement");

      const total = toNumber(order.total);
      const paid = valid.reduce((sum, l) => sum + Number(l.amount), 0);
      if (paid + 0.01 < total) {
        return fail(`Montant insuffisant : ${paid} encaissé pour un total de ${total}`);
      }
      const method: PaymentMethod = valid.length > 1 ? "mixte" : valid[0].method;
      const stamp = Date.now().toString().slice(-6);

      for (const [index, line] of valid.entries()) {
        await db.insert(payments).values({
          orderId,
          orderReference: order.reference,
          reference: `PAY-${order.reference.replace("CMD-", "")}-${stamp}${index + 1}`,
          method: line.method,
          amount: String(Number(line.amount)),
          status: "valide",
          cashierId: user.id,
          cashierName: user.fullName,
        });
      }

      await db
        .update(orders)
        .set({
          status: "validee",
          validatedAt: now,
          cashierId: user.id,
          cashierName: user.fullName,
          paidAmount: String(paid),
          paymentMethod: method,
          paymentStatus: "paye",
        })
        .where(eq(orders.id, orderId));

      await notify({
        targetRole: "chef",
        orderId,
        orderReference: order.reference,
        type: "commande_validee",
        title: `Commande ${order.reference} à préparer`,
        message: `Table ${order.tableNumber} • validée par ${user.fullName} • ${PAYMENT_LABELS[method]}.`,
      });
      await notify({
        targetRole: "caissier",
        orderId,
        orderReference: order.reference,
        type: "commande_prete",
        title: `Commande ${order.reference} prête`,
        message: `Table ${order.tableNumber} est prête à être servie.`,
      });
      await notify({
        targetRole: "serveur",
        orderId,
        orderReference: order.reference,
        type: "commande_prete",
        title: `Commande ${order.reference} prête`,
        message: `Table ${order.tableNumber} est prête à être servie.`,
      });
      await notify({
        targetUserId: order.serverId,
        orderId,
        orderReference: order.reference,
        type: "commande_validee",
        title: `Commande ${order.reference} validée`,
        message: `Encaissement enregistré (${PAYMENT_LABELS[method]}). Envoyée en cuisine.`,
      });
      await logAction(user, "validation_caisse", "order", orderId, `${order.reference} — ${paid}`);
      return ok({ success: true });
    }

    /* ---------------- Chef : attribution / priorité ---------------- */
    if (action === "assign") {
      if (!["chef", "admin"].includes(user.role)) return fail("Accès non autorisé", 403);
      const cookId = Number(body.cookId);
      const [cook] = await db.select().from(users).where(eq(users.id, cookId)).limit(1);
      if (!cook || cook.role !== "cuisinier") return fail("Cuisinier invalide");
      if (!["validee", "assignee"].includes(order.status)) {
        return fail("Cette commande ne peut pas être attribuée");
      }
      await db
        .update(orders)
        .set({
          status: "assignee",
          chefId: user.id,
          chefName: user.fullName,
          cookId: cook.id,
          cookName: cook.fullName,
          assignedAt: now,
          priority: String(body.priority ?? order.priority),
        })
        .where(eq(orders.id, orderId));
      await notify({
        targetUserId: cook.id,
        orderId,
        orderReference: order.reference,
        type: "attribution",
        title: `Commande ${order.reference} vous est attribuée`,
        message: `Table ${order.tableNumber} • priorité ${String(body.priority ?? order.priority)}.`,
      });
      await logAction(user, "attribution_commande", "order", orderId, `${order.reference} → ${cook.fullName}`);
      return ok({ success: true });
    }

    if (action === "priority") {
      if (!["chef", "admin"].includes(user.role)) return fail("Accès non autorisé", 403);
      await db.update(orders).set({ priority: String(body.priority) }).where(eq(orders.id, orderId));
      await logAction(user, "priorite_commande", "order", orderId, String(body.priority));
      return ok({ success: true });
    }

    /* ---------------- Cuisinier : début / fin de préparation ---------------- */
    if (action === "start") {
      if (!["cuisinier", "chef", "admin"].includes(user.role)) return fail("Accès non autorisé", 403);
      if (user.role === "cuisinier" && order.cookId !== user.id) {
        return fail("Cette commande ne vous est pas attribuée", 403);
      }
      if (order.status !== "assignee") return fail("Préparation déjà démarrée");
      await db
        .update(orders)
        .set({ status: "en_preparation", startedAt: now })
        .where(eq(orders.id, orderId));
      await logAction(user, "debut_preparation", "order", orderId, order.reference);
      return ok({ success: true });
    }

    if (action === "ready") {
      if (!["cuisinier", "chef", "admin"].includes(user.role)) return fail("Accès non autorisé", 403);
      if (user.role === "cuisinier" && order.cookId !== user.id) {
        return fail("Cette commande ne vous est pas attribuée", 403);
      }
      if (order.status !== "en_preparation") return fail("La préparation n'a pas démarré");
      const startedAt = order.startedAt ?? order.assignedAt ?? order.createdAt;
      const prepSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
      await db
        .update(orders)
        .set({ status: "prete", readyAt: now, prepSeconds })
        .where(eq(orders.id, orderId));
      await notify({
        targetUserId: order.serverId,
        orderId,
        orderReference: order.reference,
        type: "commande_prete",
        title: `🔔 Commande ${order.reference} est prête`,
        message: `Table ${order.tableNumber} • disponible à ${now.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })} • préparée par ${order.cookName ?? user.fullName}.`,
      });
      await notify({
        targetRole: "chef",
        orderId,
        orderReference: order.reference,
        type: "commande_prete",
        title: `Commande ${order.reference} terminée`,
        message: `Préparée en ${Math.round(prepSeconds / 60)} min par ${order.cookName ?? user.fullName}.`,
      });
      await logAction(user, "fin_preparation", "order", orderId, `${order.reference} — ${prepSeconds}s`);
      return ok({ success: true, prepSeconds });
    }

    /* ---------------- Serveur : livraison ---------------- */
    if (action === "deliver") {
      if (!["serveur", "admin"].includes(user.role)) return fail("Accès non autorisé", 403);
      if (order.status !== "prete") return fail("La commande n'est pas encore prête");
      const serviceSeconds = Math.round((now.getTime() - order.createdAt.getTime()) / 1000);
      await db
        .update(orders)
        .set({ status: "livree", deliveredAt: now, serviceSeconds })
        .where(eq(orders.id, orderId));
      await notify({
        targetRole: "caissier",
        orderId,
        orderReference: order.reference,
        type: "commande_livree",
        title: `Commande ${order.reference} livrée`,
        message: `Table ${order.tableNumber} servie par ${user.fullName}.`,
      });
      await logAction(user, "livraison_commande", "order", orderId, order.reference);
      return ok({ success: true, serviceSeconds });
    }

    /* ---------------- Kanban : transition rapide encadrée ---------------- */
    if (action === "move-status") {
      const target = String(body.status ?? "");
      if (target === "en_preparation") {
        if (!["chef", "admin", "cuisinier"].includes(user.role)) return fail("Accès non autorisé", 403);
        if (!["validee", "assignee", "en_preparation"].includes(order.status)) {
          return fail("Cette commande doit d’abord être encaissée à la caisse");
        }
        if (user.role === "cuisinier" && order.cookId !== user.id) return fail("Cette commande ne vous est pas attribuée", 403);
        if (order.status !== "en_preparation") {
          await db.update(orders).set({ status: "en_preparation", startedAt: order.startedAt ?? now }).where(eq(orders.id, orderId));
          await logAction(user, "kanban_preparation", "order", orderId, order.reference);
        }
        return ok({ success: true });
      }
      if (target === "prete") {
        if (!["chef", "admin", "cuisinier"].includes(user.role)) return fail("Accès non autorisé", 403);
        if (!["validee", "assignee", "en_preparation"].includes(order.status)) return fail("Transition impossible");
        if (user.role === "cuisinier" && order.cookId !== user.id) return fail("Cette commande ne vous est pas attribuée", 403);
        const startedAt = order.startedAt ?? order.assignedAt ?? order.createdAt;
        const prepSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
        await db.update(orders).set({ status: "prete", startedAt: order.startedAt ?? now, readyAt: now, prepSeconds }).where(eq(orders.id, orderId));
        await notify({ targetUserId: order.serverId, orderId, orderReference: order.reference, type: "commande_prete", title: `Commande ${order.reference} prête`, message: `Table ${order.tableNumber} est prête à servir.` });
        await notify({ targetRole: "caissier", orderId, orderReference: order.reference, type: "commande_prete", title: `Commande ${order.reference} prête`, message: `Table ${order.tableNumber} est prête à être servie.` });
        await notify({ targetRole: "serveur", orderId, orderReference: order.reference, type: "commande_prete", title: `Commande ${order.reference} prête`, message: `Table ${order.tableNumber} est prête à être servie.` });
        await logAction(user, "kanban_prete", "order", orderId, order.reference);
        return ok({ success: true });
      }
      if (target === "livree") {
        if (!["serveur", "admin"].includes(user.role)) return fail("Accès non autorisé", 403);
        if (order.status !== "prete") return fail("La commande doit être prête avant d’être servie");
        const serviceSeconds = Math.round((now.getTime() - order.createdAt.getTime()) / 1000);
        await db.update(orders).set({ status: "livree", deliveredAt: now, serviceSeconds }).where(eq(orders.id, orderId));
        await logAction(user, "kanban_livraison", "order", orderId, order.reference);
        return ok({ success: true });
      }
      return fail("Colonne de destination invalide");
    }

    /* ---------------- Annulation ---------------- */
    if (action === "cancel") {
      if (!["caissier", "admin"].includes(user.role)) return fail("Accès non autorisé", 403);
      if (["livree", "annulee"].includes(order.status)) return fail("Commande déjà clôturée");
      await db
        .update(orders)
        .set({
          status: "annulee",
          cancelledAt: now,
          cancelReason: String(body.reason ?? "Non précisé"),
        })
        .where(eq(orders.id, orderId));
      await notify({
        targetUserId: order.serverId,
        orderId,
        orderReference: order.reference,
        type: "annulation",
        title: `Commande ${order.reference} annulée`,
        message: String(body.reason ?? "Non précisé"),
      });
      await logAction(user, "annulation_commande", "order", orderId, String(body.reason ?? ""));
      return ok({ success: true });
    }

    return fail("Action inconnue");
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE() {
  // La suppression est interdite : traçabilité complète exigée.
  return fail("Suppression interdite — la traçabilité des commandes est permanente", 405);
}

export const dynamic = "force-dynamic";
