export const PRIORITIES = ["basse", "normale", "haute", "urgente"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABELS: Record<Priority, string> = { basse: "Basse", normale: "Normale", haute: "Haute", urgente: "Urgente" };
export const PRIORITY_STYLES: Record<Priority, string> = { basse: "bg-slate-100 text-slate-600 ring-slate-200", normale: "bg-sky-100 text-sky-700 ring-sky-200", haute: "bg-orange-100 text-orange-700 ring-orange-200", urgente: "bg-rose-100 text-rose-700 ring-rose-200" };
