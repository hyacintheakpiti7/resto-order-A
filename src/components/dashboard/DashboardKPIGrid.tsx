import Link from "next/link";
import { useMemo } from "react";
import { money } from "@/lib/format";
import type { DashboardPayload } from "./types";

export function DashboardKPIGrid({ report, currency, kitchen, tables }: { report?: DashboardPayload["report"]; currency: string; kitchen: DashboardPayload["kitchen"]; tables?: DashboardPayload["tables"] }) {
  const kpis = useMemo(() => [
    { href: "/admin/rapports", icon: "💰", label: "Recettes", value: money(report?.totals.revenue ?? 0, currency), hint: `${report?.totals.paidOrders ?? 0} paiements aujourd’hui`, accent: "bg-emerald-50 text-emerald-700" },
    { href: "/commandes", icon: "🧾", label: "Commandes", value: report?.totals.orders ?? 0, hint: `${report?.totals.deliveredOrders ?? 0} servie(s)`, accent: "bg-sky-50 text-sky-700" },
    { href: "/cuisine", icon: "👨‍🍳", label: "Cuisine", value: kitchen.preparing, hint: `${kitchen.pending} en attente caisse`, accent: "bg-amber-50 text-amber-700" },
    { href: "/commandes", icon: "🍽️", label: "Tables", value: `${tables?.occupied ?? 0} / ${tables?.total ?? 0}`, hint: "occupées actuellement", accent: "bg-violet-50 text-violet-700" },
  ], [report, currency, kitchen, tables]);
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((kpi) => <Link key={kpi.label} href={kpi.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#f4c430] hover:shadow-md"><div className="flex items-start justify-between"><p className="text-sm font-semibold text-slate-500">{kpi.label}</p><span className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${kpi.accent}`}>{kpi.icon}</span></div><p className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{kpi.value}</p><p className="mt-1.5 text-xs text-slate-500">{kpi.hint}</p></Link>)}</section>;
}
