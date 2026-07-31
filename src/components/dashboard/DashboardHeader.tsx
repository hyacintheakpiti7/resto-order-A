"use client";

import { useEffect, useState } from "react";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Africa/Porto-Novo",
});
const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Porto-Novo",
});

function initials(name?: string) {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "SF";
}

function LiveDateTime() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!now) return <div className="text-right"><p className="text-xs text-slate-400">—</p><p className="font-semibold tabular-nums text-slate-400">--:--</p></div>;
  return <div className="text-right"><p className="text-xs font-medium capitalize text-slate-500">{DATE_FORMATTER.format(now)}</p><time dateTime={now.toISOString()} className="font-semibold tabular-nums text-slate-800">{TIME_FORMATTER.format(now)}</time></div>;
}

export function DashboardHeader({ user }: { user?: { fullName: string; role: string; code: string } }) {
  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? "";
  return <header className="flex flex-col gap-5 rounded-3xl border border-amber-100 bg-[linear-gradient(120deg,#fffaf0,#ffffff_55%,#fffbeb)] p-5 shadow-sm sm:p-7 xl:flex-row xl:items-center xl:justify-between">
    <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#b77d00]">SUYA Food · Tableau de bord</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Bonjour{firstName ? `, ${firstName}` : ""} <span aria-hidden="true">👋</span></h1><p className="mt-2 text-sm text-slate-600">Bienvenue chez <strong>SUYA Food</strong> · Le goût authentique, servi rapidement.</p></div>
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"><div className="hidden border-r border-slate-100 pr-4 sm:block"><LiveDateTime /></div><div className="grid h-10 w-10 place-items-center rounded-full bg-[#121212] text-xs font-bold text-[#f4c430]">{initials(user?.fullName)}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{user?.fullName ?? "Chargement…"}</p><p className="text-xs text-slate-500">{user?.role ?? "Gestionnaire"} · {user?.code ?? ""}</p></div></div>
  </header>;
}
