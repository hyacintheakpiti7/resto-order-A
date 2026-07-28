import { cookies } from "next/headers";
import { SESSION_COOKIE, getSession, logAction } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function POST() {
  try {
    const session = await getSession();
    if (session) await logAction(session, "deconnexion", "user", session.id);
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
