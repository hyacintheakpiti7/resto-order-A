import Link from "next/link";
import type { DashboardPayload } from "./types";

export function DashboardKitchen({ kitchen, liveCount }: { kitchen: DashboardPayload["kitchen"]; liveCount: number }) {
  const rows = [["En préparation", kitchen.preparing, "bg-amber-400", "text-amber-700"], ["Prêtes à servir", kitchen.ready, "bg-emerald-500", "text-emerald-700"], ["En retard", kitchen.late, "bg-rose-500", "text-rose-700"]] as const;
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">État de la cuisine</h2><p className="mt-1 text-sm text-slate-500">Mise à jour en continu.</p></div><Link href="/cuisine" className="text-xs font-bold text-amber-700 hover:underline">Ouvrir →</Link></div><div className="mt-7 space-y-4">{rows.map(([label, value, dot, text]) => <div key={label} className="flex items-center justify-between"><span className="flex items-center gap-2.5 text-sm text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</span><strong className={`text-xl ${text}`}>{value}</strong></div>)}</div><div className="mt-7 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600"><strong className="text-slate-800">{liveCount} commandes</strong> sont actuellement suivies par les équipes.</div></article>;
}
