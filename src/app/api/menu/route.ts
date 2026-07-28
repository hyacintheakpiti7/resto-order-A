import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  dishSupplements,
  dishes,
  restaurantTables,
  supplements,
} from "@/db/schema";
import { handleError, ok, fail } from "@/lib/api";
import { logAction, requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();
    const [cats, dishRows, supRows, links, tables] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.position), asc(categories.name)),
      db.select().from(dishes).orderBy(asc(dishes.name)),
      db.select().from(supplements).orderBy(asc(supplements.name)),
      db.select().from(dishSupplements),
      db.select().from(restaurantTables).orderBy(asc(restaurantTables.number)),
    ]);
    return ok({ categories: cats, dishes: dishRows, supplements: supRows, links, tables });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin"]);
    const body = await request.json();
    const { entity, action, data } = body as {
      entity: string;
      action: string;
      data: Record<string, unknown>;
    };

    if (entity === "category") {
      if (action === "create") {
        const [row] = await db
          .insert(categories)
          .values({
            name: String(data.name ?? "Nouvelle catégorie"),
            description: String(data.description ?? ""),
            position: Number(data.position ?? 0),
          })
          .returning();
        await logAction(user, "creation_categorie", "category", row.id, row.name);
        return ok({ row });
      }
      if (action === "update") {
        const id = Number(data.id);
        const [row] = await db
          .update(categories)
          .set({
            name: String(data.name),
            description: String(data.description ?? ""),
            position: Number(data.position ?? 0),
            active: Boolean(data.active),
          })
          .where(eq(categories.id, id))
          .returning();
        await logAction(user, "modification_categorie", "category", id, row?.name);
        return ok({ row });
      }
      if (action === "delete") {
        const id = Number(data.id);
        await db.update(dishes).set({ available: false }).where(eq(dishes.categoryId, id));
        await db.update(categories).set({ active: false }).where(eq(categories.id, id));
        await logAction(user, "desactivation_categorie", "category", id);
        return ok({ success: true });
      }
    }

    if (entity === "dish") {
      if (action === "create" || action === "update") {
        const values = {
          categoryId: Number(data.categoryId),
          name: String(data.name ?? ""),
          description: String(data.description ?? ""),
          price: String(Number(data.price ?? 0)),
          available: data.available === undefined ? true : Boolean(data.available),
          emoji: String(data.emoji ?? "🍽️"),
        };
        let dishId: number;
        if (action === "create") {
          const [row] = await db.insert(dishes).values(values).returning();
          dishId = row.id;
        } else {
          dishId = Number(data.id);
          await db.update(dishes).set(values).where(eq(dishes.id, dishId));
        }
        const supIds = Array.isArray(data.supplementIds)
          ? (data.supplementIds as unknown[]).map(Number)
          : [];
        await db.delete(dishSupplements).where(eq(dishSupplements.dishId, dishId));
        if (supIds.length) {
          await db
            .insert(dishSupplements)
            .values(supIds.map((supplementId) => ({ dishId, supplementId })));
        }
        await logAction(
          user,
          action === "create" ? "creation_plat" : "modification_plat",
          "dish",
          dishId,
          `${values.name} — ${values.price}`,
        );
        return ok({ id: dishId });
      }
      if (action === "toggle") {
        const id = Number(data.id);
        const [row] = await db
          .update(dishes)
          .set({ available: Boolean(data.available) })
          .where(eq(dishes.id, id))
          .returning();
        await logAction(user, "disponibilite_plat", "dish", id, row?.available ? "actif" : "inactif");
        return ok({ row });
      }
      if (action === "delete") {
        const id = Number(data.id);
        await db.update(dishes).set({ available: false }).where(eq(dishes.id, id));
        await logAction(user, "retrait_plat", "dish", id);
        return ok({ success: true });
      }
    }

    if (entity === "supplement") {
      if (action === "create") {
        const [row] = await db
          .insert(supplements)
          .values({ name: String(data.name ?? ""), price: String(Number(data.price ?? 0)) })
          .returning();
        await logAction(user, "creation_supplement", "supplement", row.id, row.name);
        return ok({ row });
      }
      if (action === "update") {
        const id = Number(data.id);
        const [row] = await db
          .update(supplements)
          .set({
            name: String(data.name ?? ""),
            price: String(Number(data.price ?? 0)),
            active: data.active === undefined ? true : Boolean(data.active),
          })
          .where(eq(supplements.id, id))
          .returning();
        await logAction(user, "modification_supplement", "supplement", id, row?.name);
        return ok({ row });
      }
    }

    if (entity === "table") {
      if (action === "create") {
        const number = String(data.number ?? "");
        const [row] = await db
          .insert(restaurantTables)
          .values({
            number,
            qrCode: `QR-TABLE-${number.replace(/\s+/g, "")}`,
            seats: Number(data.seats ?? 4),
          })
          .returning();
        await logAction(user, "creation_table", "table", row.id, number);
        return ok({ row });
      }
      if (action === "toggle") {
        const id = Number(data.id);
        const [row] = await db
          .update(restaurantTables)
          .set({ active: Boolean(data.active) })
          .where(eq(restaurantTables.id, id))
          .returning();
        return ok({ row });
      }
    }

    return fail("Action inconnue");
  } catch (error) {
    return handleError(error);
  }
}
