import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import type { Role } from "@/lib/constants";

const SECRET = process.env.SESSION_SECRET ?? "resto-flow-dev-secret-key";
export const SESSION_COOKIE = "resto_session";

export type SessionUser = {
  id: number;
  code: string;
  fullName: string;
  role: Role;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== derived.length) return false;
  return timingSafeEqual(derived, keyBuffer);
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createToken(user: SessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({ ...user, iat: Date.now() }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (sign(payload) !== signature) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.id || !data?.role) return null;
    return { id: data.id, code: data.code, fullName: data.fullName, role: data.role };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return readToken(store.get(SESSION_COOKIE)?.value);
}

/** Session validated against the database (ensures the account is still active). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  const [row] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  if (!row || !row.active) return null;
  return { id: row.id, code: row.code, fullName: row.fullName, role: row.role as Role };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Authentification requise", 401);
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    throw new AuthError("Accès non autorisé pour ce profil", 403);
  }
  return user;
}

export async function logAction(
  user: SessionUser | null,
  action: string,
  entity?: string,
  entityId?: string | number,
  details?: string,
): Promise<void> {
  await db.insert(auditLogs).values({
    userId: user?.id ?? null,
    userName: user?.fullName ?? "système",
    role: user?.role ?? null,
    action,
    entity: entity ?? null,
    entityId: entityId !== undefined ? String(entityId) : null,
    details: details ?? null,
  });
}
