"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLive } from "@/lib/client";
import { elapsedSince, money } from "@/lib/format";
import type { OrderDTO } from "@/lib/orders";
import type { ReportData } from "@/lib/reports";

type Period = "today" | "week" | "month";
type Payload = {
  report: ReportData;
  live: OrderDTO[];
  settings: { currency: string; restaurantName: string };
  user: { fullName: string; role: string; code: string };
  kitchen: { preparing: number; ready: number; late: number; pending: number };
  tables: { occupied: number; total: number };
  alerts: { tone: "amber" | "rose"; title: string; message: string }[];
  series: { label: string; revenue: number; orders: number }[];
  activity: { id: number; action: string; entity: string | null; details: string | null; userName: string | null; createdAt: string }[];
};

const ACTIVITY_LABELS: Record<string, string> = {
  connexion: "Connexion à l’espace de travail",
  create: "Commande créée",
  validate: "Paiement reçu et commande envoyée en cuisine",
  ready: "Commande prête à servir",
  deliver: "Commande servie",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <time dateTime={now.toISOString()} className="font-semibold tabular-nums text-slate-800">{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</time>;
}

function RevenueChart({ series, currency }: { series: Payload["series"]; currency: string }) {
  const max = Math.max(1, ...series.map((point) => point.revenue));
  const total = series.reduce((sum, point) => sum + point.revenue, 0);
  return (
    <div className="mt-6">
      <div className="flex h-52 items-end gap-1.5 border-b border-slate-100 pb-1 sm:h-64 sm:gap-2">
        {series.map((point) => {
          const height = point.revenue ? Math.max(5, (point.revenue / max) * 100) : 2;
          return (
            <div key={point.label} className="group relative flex h-full min-w-0 flex-1 items-end">
              <div className="absolute bottom-[calc(100%+8px)] left-1/2 z-10 hidden w-max max-w-40 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block">
                {point.label} · {money(point.revenue, currency)}
              </div>
              <div className="w-full rounded-t-md bg-gradient-to-t from-[#d9a404] to-[#f4c430] transition-all duration-500 group-hover:from-amber-600 group-hover:to-amber-300" style={{ height: `${height}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-1 overflow-hidden text-[10px] font-medium text-slate-400">
        {series.map((point, index) => <span key={`${point.label}-${index}`} className={series.length > 12 && index % 3 !== 0 ? "hidden sm:block" : "truncate"}>{point.label}</span>)}
      </div>
      <p className="mt-4 text-xs text-slate-500">{series.reduce((sum, point) => sum + point.orders, 0)} commande(s) · <strong className="text-slate-700">{money(total, currency)}</strong></p>
    </div>
  );
}

function KitchenStatus({ kitchen }: { kitchen: Payload["kitchen"] }) {
  const rows = [
    ["En préparation", kitchen.preparing, "bg-amber-400", "text-amber-700"],
    ["Prêtes à servir", kitchen.ready, "bg-emerald-500", "text-emerald-700"],
    ["En retard", kitchen.late, "bg-rose-500", "text-rose-700"],
  ];
  return <div className="space-y-4">{rows.map(([label, value, dot, text]) => <div key={String(label)} className="flex items-center justify-between"><span className="flex items-center gap-2.5 text-sm text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</span><strong className={`text-xl ${text}`}>{value}</strong></div>)}</div>;
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("today");
  const { data, loading } = useLive<Payload>(`/api/dashboard?period=${period}`, 6000);
  const report = data?.report;
  const currency = data?.settings.currency ?? "FCFA";
  const kitchen = data?.kitchen ?? { preparing: 0, ready: 0, late: 0, pending: 0 };
  const topDishes = useMemo(() => report?.byDish.slice(0, 5) ?? [], [report]);
  const maxDish = Math.max(1, ...topDishes.map((dish) => dish.quantity));
  const greetingName = data?.user.fullName?.split(" ")[0] ?? "";

  const kpis = [
    { href: "/admin/rapports", icon: "💰", label: "Recettes", value: money(report?.totals.revenue ?? 0, currency), hint: `${report?.totals.paidOrders ?? 0} paiements aujourd’hui`, accent: "bg-emerald-50 text-emerald-700" },
    { href: "/commandes", icon: "🧾", label: "Commandes", value: report?.totals.orders ?? 0, hint: `${report?.totals.deliveredOrders ?? 0} servie(s)`, accent: "bg-sky-50 text-sky-700" },
    { href: "/cuisine", icon: "👨‍🍳", label: "Cuisine", value: kitchen.preparing, hint: `${kitchen.pending} en attente caisse`, accent: "bg-amber-50 text-amber-700" },
    { href: "/commandes", icon: "🍽️", label: "Tables", value: `${data?.tables.occupied ?? 0} / ${data?.tables.total ?? 0}`, hint: "occupées actuellement", accent: "bg-violet-50 text-violet-700" },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-8">
      <header className="flex flex-col gap-5 rounded-3xl border border-amber-100 bg-[linear-gradient(120deg,#fffaf0,#ffffff_55%,#fffbeb)] p-5 shadow-sm sm:p-7 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#b77d00]">SUYA Food · Tableau de bord</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Bonjour{greetingName ? `, ${greetingName}` : ""} <span aria-hidden="true">👋</span></h1>
          <p className="mt-2 text-sm text-slate-600">Bienvenue chez <strong>SUYA Food</strong> · Le goût authentique, servi rapidement.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <div className="hidden border-r border-slate-100 pr-4 text-right sm:block"><p className="text-xs font-medium capitalize text-slate-500">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p><LiveClock /></div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#121212] text-xs font-bold text-[#f4c430]">{initials(data?.user.fullName ?? "SUYA Food")}</div>
          <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{data?.user.fullName ?? "Chargement…"}</p><p className="text-xs text-slate-500">{data?.user.role ?? "Gestionnaire"} · {data?.user.code ?? ""}</p></div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => <Link key={kpi.label} href={kpi.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#f4c430] hover:shadow-md"><div className="flex items-start justify-between"><p className="text-sm font-semibold text-slate-500">{kpi.label}</p><span className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${kpi.accent}`}>{kpi.icon}</span></div><p className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{kpi.value}</p><p className="mt-1.5 text-xs text-slate-500">{kpi.hint}</p></Link>)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Évolution du chiffre d’affaires</h2><p className="mt-1 text-sm text-slate-500">Ventes encaissées sur la période sélectionnée.</p></div><div className="inline-flex self-start rounded-xl bg-slate-100 p-1">{([ ["today", "Aujourd’hui"], ["week", "7 jours"], ["month", "30 jours"] ] as const).map(([value, label]) => <button key={value} onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${period === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div></div>
          <RevenueChart series={data?.series ?? []} currency={currency} />
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">État de la cuisine</h2><p className="mt-1 text-sm text-slate-500">Mise à jour en continu.</p></div><Link href="/cuisine" className="text-xs font-bold text-amber-700 hover:underline">Ouvrir →</Link></div><div className="mt-7"><KitchenStatus kitchen={kitchen} /></div><div className="mt-7 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600"><strong className="text-slate-800">{(data?.live ?? []).length} commandes</strong> sont actuellement suivies par les équipes.</div></article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[.95fr_1.05fr_.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Activité en temps réel</h2><p className="mt-1 text-sm text-slate-500">Dernières actions enregistrées.</p></div><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" /></div><div className="mt-5 space-y-4">{(data?.activity ?? []).length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Aucune activité récente.</p> : data?.activity.slice(0, 5).map((item) => <div key={item.id} className="flex gap-3"><time className="w-9 pt-0.5 text-xs font-bold tabular-nums text-slate-400">{new Date(item.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</time><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f4c430]" /><div><p className="text-sm font-medium text-slate-700">{item.details || ACTIVITY_LABELS[item.action] || item.action}</p><p className="mt-0.5 text-xs text-slate-400">{item.userName ?? "Système"}</p></div></div>)}</div></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Produits les plus vendus</h2><p className="mt-1 text-sm text-slate-500">Classement du jour.</p></div><Link href="/admin/rapports" className="text-xs font-bold text-amber-700 hover:underline">Rapport →</Link></div><div className="mt-5 space-y-4">{topDishes.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Les ventes du jour apparaîtront ici.</p> : topDishes.map((dish, index) => <div key={dish.key}><div className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium text-slate-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-amber-50 text-xs font-bold text-amber-700">{index + 1}</span><span className="truncate">{dish.label}</span></span><span className="shrink-0 text-xs font-bold text-slate-500">{dish.quantity}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#f4c430] transition-all duration-500" style={{ width: `${(dish.quantity / maxDish) * 100}%` }} /></div></div>)}</div></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Raccourcis</h2><p className="mt-1 text-sm text-slate-500">Accédez rapidement à l’essentiel.</p><div className="mt-5 grid grid-cols-2 gap-2.5">{[{ href: "/serveur/nouvelle", icon: "➕", label: "Nouvelle commande" }, { href: "/admin/menu", icon: "🍽️", label: "Menu" }, { href: "/caisse", icon: "💳", label: "Caisse" }, { href: "/admin/rapports", icon: "📊", label: "Rapports" }, { href: "/admin/utilisateurs", icon: "👥", label: "Utilisateurs" }, { href: "/admin/parametres", icon: "⚙️", label: "Paramètres" }].map((shortcut) => <Link key={shortcut.label} href={shortcut.href} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-center transition hover:border-amber-200 hover:bg-amber-50"><span className="block text-xl">{shortcut.icon}</span><span className="mt-1.5 block text-xs font-bold text-slate-700">{shortcut.label}</span></Link>)}</div></article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Alertes à traiter</h2><p className="mt-1 text-sm text-slate-500">Les priorités opérationnelles de la journée.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{data?.alerts.length ?? 0} alerte(s)</span></div><div className="mt-5 grid gap-3 md:grid-cols-3">{loading ? <div className="col-span-full py-4 text-center text-sm text-slate-400">Mise à jour du tableau de bord…</div> : (data?.alerts ?? []).length === 0 ? <div className="col-span-full rounded-2xl bg-emerald-50 px-4 py-5 text-center text-sm font-medium text-emerald-700">✓ Tout est sous contrôle pour le moment.</div> : data?.alerts.map((alert) => <div key={alert.title} className={`rounded-2xl border p-4 ${alert.tone === "rose" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}><p className={`text-sm font-bold ${alert.tone === "rose" ? "text-rose-800" : "text-amber-800"}`}>⚠ {alert.title}</p><p className={`mt-1 text-xs leading-5 ${alert.tone === "rose" ? "text-rose-700" : "text-amber-700"}`}>{alert.message}</p></div>)}</div></section>
    </div>
  );
}
