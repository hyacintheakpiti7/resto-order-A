import type { Role } from "./roles";

export const ROUTES = { dashboard: "/admin", orders: "/commandes", kitchen: "/cuisine", cash: "/caisse" } as const;
export const ROLE_HOME: Record<Role, string> = { admin: ROUTES.dashboard, serveur: "/serveur", caissier: ROUTES.cash, chef: ROUTES.kitchen, cuisinier: "/preparation" };
