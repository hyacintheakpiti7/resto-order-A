import type { DashboardPayload } from "./types";

const ACTIVITY_MESSAGES: Record<string, string> = { connexion: "Connexion à l’espace de travail", create: "Commande créée", validate: "Paiement reçu et commande envoyée en cuisine", ready: "Commande prête à servir", deliver: "Commande servie" };
const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Porto-Novo" });

export function DashboardActivity({ activity }: { activity: DashboardPayload["activity"] }) {
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Activité en temps réel</h2><p className="mt-1 text-sm text-slate-500">Dernières actions enregistrées.</p></div><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" /></div><div className="mt-5 space-y-4">{activity.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Aucune activité récente.</p> : activity.slice(0, 5).map((item) => <div key={item.id} className="flex gap-3"><time className="w-9 pt-0.5 text-xs font-bold tabular-nums text-slate-400">{TIME_FORMATTER.format(new Date(item.createdAt))}</time><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f4c430]" /><div><p className="text-sm font-medium text-slate-700">{item.details || ACTIVITY_MESSAGES[item.action] || item.action}</p><p className="mt-0.5 text-xs text-slate-400">{item.userName ?? "Système"}</p></div></div>)}</div></article>;
}
