export const ROLES = ["admin", "serveur", "caissier", "chef", "cuisinier"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = { admin: "Administrateur", serveur: "Serveur", caissier: "Caissier", chef: "Chef de cuisine", cuisinier: "Cuisinier" };
