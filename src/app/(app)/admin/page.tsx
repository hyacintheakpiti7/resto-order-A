"use client";

import { useState } from "react";
import { DashboardActivity } from "@/components/dashboard/DashboardActivity";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardKitchen } from "@/components/dashboard/DashboardKitchen";
import { DashboardKPIGrid } from "@/components/dashboard/DashboardKPIGrid";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardRevenue } from "@/components/dashboard/DashboardRevenue";
import { DashboardTopDishes } from "@/components/dashboard/DashboardTopDishes";
import { useDashboard } from "@/hooks/useDashboard";

type Period = "today" | "week" | "month";
const EMPTY_KITCHEN = { preparing: 0, ready: 0, late: 0, pending: 0 };

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("today");
  const { data, loading } = useDashboard(period);
  const currency = data?.settings.currency ?? "FCFA";
  const kitchen = data?.kitchen ?? EMPTY_KITCHEN;

  return <div className="mx-auto max-w-[1500px] space-y-6 pb-8">
    <DashboardHeader user={data?.user} />
    <DashboardKPIGrid report={data?.report} currency={currency} kitchen={kitchen} tables={data?.tables} />
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Évolution du chiffre d’affaires</h2><p className="mt-1 text-sm text-slate-500">Ventes encaissées sur la période sélectionnée.</p></div><div className="inline-flex self-start rounded-xl bg-slate-100 p-1">{([ ["today", "Aujourd’hui"], ["week", "7 jours"], ["month", "30 jours"] ] as const).map(([value, label]) => <button key={value} onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${period === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div></div><DashboardRevenue series={data?.series ?? []} currency={currency} /></article>
      <DashboardKitchen kitchen={kitchen} liveCount={data?.live.length ?? 0} />
    </section>
    <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[.95fr_1.05fr_.9fr]"><DashboardActivity activity={data?.activity ?? []} /><DashboardTopDishes report={data?.report} /><DashboardQuickActions /></section>
    <DashboardAlerts alerts={data?.alerts ?? []} loading={loading} />
  </div>;
}
