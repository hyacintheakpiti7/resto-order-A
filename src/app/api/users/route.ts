import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { fail, handleError, ok } from "@/lib/api";
import { hashPassword, logAction, requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const current = await requireUser();
    const role = new URL(request.url).searchParams.get("role");
    // Le chef doit pouvoir lister les cuisiniers pour l'attribution.
    if (current.role !== "admin" && !(current.role === "chef" && role === "cuisinier")) {
      if (current.role !== "chef") return fail("Accès non autorisé", 403);
    }
    const rows = await db
      .select({
        id: users.id,
        code: users.code,
        fullName: users.fullName,
        role: users.role,
        phone: users.phone,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.role), asc(users.fullName));
    return ok({ users: role ? rows.filter((r) => r.role === role) : rows });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireUser(["admin"]);
    const body = await request.json();
    const action = String(body.action ?? "create");

    if (action === "create") {
      const code = String(body.code ?? "").trim().toUpperCase();
      const role = String(body.role ?? "");
      if (!code) return fail("Identifiant obligatoire");
      if (!ROLES.includes(role as (typeof ROLES)[number])) return fail("Rôle invalide");
      const existing = await db.select().from(users).where(eq(users.code, code)).limit(1);
      if (existing.length) return fail("Cet identifiant existe déjà");
      const [row] = await db
        .insert(users)
        .values({
          code,
          fullName: String(body.fullName ?? code),
          role,
          phone: String(body.phone ?? ""),
          passwordHash: hashPassword(String(body.password || "passer123")),
        })
        .returning();
      await logAction(admin, "creation_utilisateur", "user", row.id, `${row.code} (${row.role})`);
      return ok({ id: row.id });
    }

    if (action === "update") {
      const id = Number(body.id);
      const update: Record<string, unknown> = {
        fullName: String(body.fullName ?? ""),
        role: String(body.role ?? ""),
        phone: String(body.phone ?? ""),
        active: body.active === undefined ? true : Boolean(body.active),
      };
      if (body.password) update.passwordHash = hashPassword(String(body.password));
      await db.update(users).set(update).where(eq(users.id, id));
      await logAction(admin, "modification_utilisateur", "user", id, String(body.fullName ?? ""));
      return ok({ success: true });
    }

    if (action === "toggle") {
      const id = Number(body.id);
      await db.update(users).set({ active: Boolean(body.active) }).where(eq(users.id, id));
      await logAction(admin, "statut_utilisateur", "user", id, body.active ? "actif" : "désactivé");
      return ok({ success: true });
    }

    if (action === "delete") {
      const id = Number(body.id);
      if (id === admin.id) return fail("Impossible de supprimer votre propre compte");
      // Désactivation logique : la traçabilité des commandes est préservée.
      await db.update(users).set({ active: false }).where(eq(users.id, id));
      await logAction(admin, "suppression_utilisateur", "user", id);
      return ok({ success: true });
    }

    return fail("Action inconnue");
  } catch (error) {
    return handleError(error);
  }
}
