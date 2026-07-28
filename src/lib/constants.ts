export const ROLES = ["admin", "serveur", "caissier", "chef", "cuisinier"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  serveur: "Serveur",
  caissier: "Caissier",
  chef: "Chef de cuisine",
  cuisinier: "Cuisinier",
};

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  serveur: "/serveur",
  caissier: "/caisse",
  chef: "/cuisine",
  cuisinier: "/preparation",
};

export const ORDER_STATUSES = [
  "en_attente_validation",
  "validee",
  "assignee",
  "en_preparation",
  "prete",
  "livree",
  "annulee",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente_validation: "En attente de validation caisse",
  validee: "Validée — envoyée en cuisine",
  assignee: "Attribuée à un cuisinier",
  en_preparation: "En préparation",
  prete: "Prête à servir",
  livree: "Livrée",
  annulee: "Annulée",
};

export const STATUS_SHORT: Record<OrderStatus, string> = {
  en_attente_validation: "Attente caisse",
  validee: "En cuisine",
  assignee: "Attribuée",
  en_preparation: "En préparation",
  prete: "Prête",
  livree: "Livrée",
  annulee: "Annulée",
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  en_attente_validation: "bg-amber-100 text-amber-800 ring-amber-200",
  validee: "bg-sky-100 text-sky-800 ring-sky-200",
  assignee: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  en_preparation: "bg-violet-100 text-violet-800 ring-violet-200",
  prete: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  livree: "bg-slate-200 text-slate-700 ring-slate-300",
  annulee: "bg-rose-100 text-rose-700 ring-rose-200",
};

export const PAYMENT_METHODS = [
  "especes",
  "carte",
  "mobile_money",
  "virement",
  "mixte",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  especes: "Espèces",
  carte: "Carte bancaire",
  mobile_money: "Mobile Money",
  virement: "Virement bancaire",
  mixte: "Paiement mixte",
};

export const PRIORITIES = ["basse", "normale", "haute", "urgente"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

export const PRIORITY_STYLES: Record<Priority, string> = {
  basse: "bg-slate-100 text-slate-600 ring-slate-200",
  normale: "bg-sky-100 text-sky-700 ring-sky-200",
  haute: "bg-orange-100 text-orange-700 ring-orange-200",
  urgente: "bg-rose-100 text-rose-700 ring-rose-200",
};
