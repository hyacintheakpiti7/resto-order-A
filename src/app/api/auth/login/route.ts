import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SESSION_COOKIE, createToken, logAction, verifyPassword } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { ensureSeed } from "@/lib/seed";
import type { Role } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    await ensureSeed();
    const body = await request.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    const password = String(body.password ?? "");
    if (!code || !password) return fail("Identifiant et mot de passe requis");

    const [user] = await db.select().from(users).where(eq(users.code, code)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return fail("Identifiant ou mot de passe incorrect", 401);
    }
    if (!user.active) return fail("Ce compte est désactivé. Contactez l'administrateur.", 403);

    const session = {
      id: user.id,
      code: user.code,
      fullName: user.fullName,
      role: user.role as Role,
    };
    const store = await cookies();
    store.set(SESSION_COOKIE, createToken(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    await logAction(session, "connexion", "user", user.id, `Connexion de ${user.fullName}`);
    return ok({ user: session });
  } catch (error) {
    return handleError(error);
  }
}
