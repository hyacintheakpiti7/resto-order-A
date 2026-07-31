import Link from "next/link";
import { useMemo } from "react";
import type { DashboardPayload } from "./types";

export function DashboardTopDishes({ report }: { report?: DashboardPayload["report"] }) {
  const dishes = useMemo(() => report?.byDish.slice(0, 5) ?? [], [report]);
  const max = useMemo(() => Math.max(1, ...dishes.map((dish) => dish.quantity)), [dishes]);
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Produits les plus vendus</h2><p className="mt-1 text-sm text-slate-500">Classement du jour.</p></div><Link href="/admin/rapports" className="text-xs font-bold text-amber-700 hover:underline">Rapport →</Link></div><div className="mt-5 space-y-4">{dishes.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Les ventes du jour apparaîtront ici.</p> : dishes.map((dish, index) => <div key={dish.key}><div className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium text-slate-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-amber-50 text-xs font-bold text-amber-700">{index + 1}</span><span className="truncate">{dish.label}</span></span><span className="shrink-0 text-xs font-bold text-slate-500">{dish.quantity}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#f4c430] transition-all duration-500" style={{ width: `${(dish.quantity / max) * 100}%` }} /></div></div>)}</div></article>;
}
