"use client";

import { useDeferredValue, useMemo } from "react";
import { money } from "@/lib/format";
import type { DashboardPayload } from "./types";

export function DashboardRevenue({ series, currency }: { series: DashboardPayload["series"]; currency: string }) {
  const deferredSeries = useDeferredValue(series);
  const stats = useMemo(() => deferredSeries.reduce((acc, point) => ({ total: acc.total + point.revenue, orders: acc.orders + point.orders, max: Math.max(acc.max, point.revenue) }), { total: 0, orders: 0, max: 1 }), [deferredSeries]);
  return <div className="mt-6"><div className="flex h-52 items-end gap-1.5 border-b border-slate-100 pb-1 sm:h-64 sm:gap-2">{deferredSeries.map((point) => { const height = point.revenue ? Math.max(5, (point.revenue / stats.max) * 100) : 2; return <div key={point.label} className="group relative flex h-full min-w-0 flex-1 items-end"><div className="absolute bottom-[calc(100%+8px)] left-1/2 z-10 hidden w-max max-w-40 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block">{point.label} · {money(point.revenue, currency)}</div><div className="w-full rounded-t-md bg-gradient-to-t from-[#d9a404] to-[#f4c430] transition-all duration-500 group-hover:from-amber-600 group-hover:to-amber-300" style={{ height: `${height}%` }} /></div>; })}</div><div className="mt-2 flex justify-between gap-1 overflow-hidden text-[10px] font-medium text-slate-400">{deferredSeries.map((point, index) => <span key={`${point.label}-${index}`} className={deferredSeries.length > 12 && index % 3 !== 0 ? "hidden sm:block" : "truncate"}>{point.label}</span>)}</div><p className="mt-4 text-xs text-slate-500">{stats.orders} commande(s) · <strong className="text-slate-700">{money(stats.total, currency)}</strong></p></div>;
}
