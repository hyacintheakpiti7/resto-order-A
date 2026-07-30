"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Empty, Toast, inputClass } from "@/components/ui";
import { apiSend, useLive } from "@/lib/client";
import type { OrderDTO } from "@/lib/orders";
import { money } from "@/lib/format";
import { ORDER_STATUSES, STATUS_SHORT, type OrderStatus } from "@/lib/constants";

type ColumnId = "waiting" | "preparing" | "ready" | "served";
type DateFilter = "today" | "yesterday" | "week" | "all" | "custom";

const COLUMNS: { id: ColumnId; title: string; subtitle: string; statuses: OrderStatus[]; target?: OrderStatus; tone: string }[] = [
  { id: "waiting", title: "En attente", subtitle: "Validation caisse", statuses: ["en_attente_validation"], tone: "border-amber-200 bg-amber-50/40" },
  { id: "preparing", title: "Préparation", subtitle: "En cuisine", statuses: ["validee", "assignee", "en_preparation"], target: "en_preparation", tone: "border-sky-200 bg-sky-50/35" },
  { id: "ready", title: "Prête", subtitle: "À servir", statuses: ["prete"], target: "prete", tone: "border-emerald-200 bg-emerald-50/35" },
  { id: "served", title: "Servie", subtitle: "Terminée", statuses: ["livree"], target: "livree", tone: "border-slate-200 bg-slate-50" },
];

function minutesSince(order: OrderDTO, now: number) {
  if (order.status === "livree" && order.serviceSeconds !== null) return Math.max(0, Math.round(order.serviceSeconds / 60));
  return Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60000));
}

function Timer({ order, now }: { order: OrderDTO; now: number }) {
  const minutes = minutesSince(order, now);
  const tone = minutes < 10 ? "bg-emerald-50 text-emerald-700" : minutes <= 20 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
  return <span className={`rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums ${tone}`}>⏱ {String(minutes).padStart(2, "0")} min</span>;
}

function OrderCard({ order, now, moving, onCancel }: { order: OrderDTO; now: number; moving: boolean; onCancel: (order: OrderDTO) => void }) {
  const print = (type: "bon" | "recu") => window.open(`/impression/${order.id}?type=${type}`, "_blank", "noopener,noreferrer");
  return (
    <article draggable={!moving && !["livree", "annulee"].includes(order.status)} data-order-id={order.id} className={`group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:border-amber-300 hover:shadow-md ${moving ? "pointer-events-none opacity-50" : "cursor-grab active:cursor-grabbing"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><Link href={`/commandes/${order.id}`} className="font-mono text-sm font-bold text-slate-900 hover:text-amber-700 hover:underline">{order.reference}</Link><p className="mt-0.5 text-xs text-slate-500">🪑 Table {order.tableNumber} · {order.serverName ?? "Service"}</p></div>
        <Timer order={order} now={now} />
      </div>
      <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        {order.items.slice(0, 3).map((item) => <p key={item.id} className="truncate"><strong className="text-slate-800">{item.quantity} ×</strong> {item.dishName}</p>)}
        {order.items.length > 3 && <p className="text-slate-400">+ {order.items.length - 3} autre(s) article(s)</p>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2"><span className="text-[11px] text-slate-400">{new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span><strong className="text-sm text-slate-900">{money(order.total)}</strong></div>
      <div className="mt-3 grid grid-cols-4 gap-1 border-t border-slate-100 pt-3 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
        <Link href={`/commandes/${order.id}`} className="rounded-lg py-1.5 text-center text-[10px] font-bold text-slate-600 hover:bg-slate-100" title="Voir et modifier">👁 Voir</Link>
        <button onClick={() => print("bon")} className="rounded-lg py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100" title="Imprimer le ticket cuisine">🖨 Ticket</button>
        {order.status === "en_attente_validation" ? <Link href="/caisse" className="rounded-lg py-1.5 text-center text-[10px] font-bold text-amber-700 hover:bg-amber-50" title="Encaisser">💳 Caisse</Link> : <button onClick={() => print("recu")} className="rounded-lg py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100" title="Imprimer le reçu">🧾 Reçu</button>}
        {! ["livree", "annulee"].includes(order.status) ? <button onClick={() => onCancel(order)} className="rounded-lg py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50" title="Annuler">✕</button> : <span />}
      </div>
    </article>
  );
}

export default function CommandesPage() {
  const { data, refresh, loading } = useLive<{ orders: OrderDTO[] }>("/api/orders?limit=300", 5000);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [server, setServer] = useState("all");
  const [table, setTable] = useState("");
  const [payment, setPayment] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [mobileColumn, setMobileColumn] = useState<ColumnId>("waiting");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!message && !error) return; const timer = window.setTimeout(() => { setMessage(""); setError(""); }, 4000); return () => window.clearTimeout(timer); }, [message, error]);

  const allOrders = data?.orders ?? [];
  const servers = useMemo(() => [...new Map(allOrders.filter((order) => order.serverName).map((order) => [order.serverName!, order.serverName!])).values()], [allOrders]);
  const tables = useMemo(() => [...new Set(allOrders.map((order) => order.tableNumber))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [allOrders]);

  const orders = useMemo(() => {
    const current = new Date(); current.setHours(0, 0, 0, 0);
    const yesterday = new Date(current); yesterday.setDate(current.getDate() - 1);
    const week = new Date(current); week.setDate(current.getDate() - ((current.getDay() + 6) % 7));
    const to = new Date(current); to.setDate(current.getDate() + 1);
    const matchesDate = (order: OrderDTO) => {
      const date = new Date(order.createdAt);
      if (dateFilter === "today") return date >= current && date < to;
      if (dateFilter === "yesterday") return date >= yesterday && date < current;
      if (dateFilter === "week") return date >= week;
      if (dateFilter === "custom") return (!customFrom || date >= new Date(`${customFrom}T00:00:00`)) && (!customTo || date <= new Date(`${customTo}T23:59:59`));
      return true;
    };
    const query = search.trim().toLowerCase();
    return allOrders.filter((order) => {
      const text = [order.reference, order.tableNumber, order.serverName, order.cookName].filter(Boolean).join(" ").toLowerCase();
      return (status === "all" || order.status === status) && (server === "all" || order.serverName === server) && (!table || order.tableNumber === table) && (payment === "all" || (payment === "paid" ? order.paymentStatus === "paye" : order.paymentStatus !== "paye")) && matchesDate(order) && (!query || text.includes(query));
    });
  }, [allOrders, search, status, server, table, payment, dateFilter, customFrom, customTo]);

  const counts = useMemo(() => Object.fromEntries(COLUMNS.map((column) => [column.id, orders.filter((order) => column.statuses.includes(order.status)).length])) as Record<ColumnId, number>, [orders]);

  async function moveOrder(target: OrderStatus) {
    if (!draggedId) return;
    const order = allOrders.find((item) => item.id === draggedId);
    setDraggedId(null);
    if (!order || order.status === target) return;
    setMovingId(order.id); setError("");
    try { await apiSend(`/api/orders/${order.id}`, { action: "move-status", status: target }); setMessage(`${order.reference} mis à jour.`); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Mise à jour impossible"); }
    finally { setMovingId(null); }
  }

  async function cancel(order: OrderDTO) {
    if (!window.confirm(`Annuler ${order.reference} ? Cette action reste tracée.`)) return;
    setMovingId(order.id); setError("");
    try { await apiSend(`/api/orders/${order.id}`, { action: "cancel", reason: "Annulation depuis le tableau Kanban" }); setMessage(`${order.reference} annulée.`); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Annulation impossible"); }
    finally { setMovingId(null); }
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 pb-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-700">SUYA Food · Opérations</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Commandes</h1><p className="mt-1 text-sm text-slate-500">Suivez le service en temps réel, de la caisse à la livraison.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => refresh()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">↻ Rafraîchir</button><Link href="/serveur/nouvelle" className="rounded-xl bg-[#f4c430] px-4 py-2.5 text-sm font-bold text-[#121212] transition hover:bg-[#d9a404]">＋ Nouvelle commande</Link></div></header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[...COLUMNS.map((column) => ({ label: column.title, value: counts[column.id], tone: column.id })), { label: "Total", value: orders.length, tone: "total" }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{item.value}</p></div>)}</section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_11rem_11rem]"><label className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">⌕</span><input className={`${inputClass} pl-9`} placeholder="Référence, table, serveur ou cuisinier…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | "all")}><option value="all">Tous les statuts</option>{ORDER_STATUSES.map((value) => <option key={value} value={value}>{STATUS_SHORT[value]}</option>)}</select><select className={inputClass} value={server} onChange={(event) => setServer(event.target.value)}><option value="all">Tous les serveurs</option>{servers.map((name) => <option key={name} value={name}>{name}</option>)}</select><select className={inputClass} value={table} onChange={(event) => setTable(event.target.value)}><option value="">Toutes les tables</option>{tables.map((value) => <option key={value} value={value}>Table {value}</option>)}</select><select className={inputClass} value={payment} onChange={(event) => setPayment(event.target.value)}><option value="all">Tous paiements</option><option value="paid">Payées</option><option value="unpaid">Non payées</option></select></div><div className="mt-3 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold text-slate-500">Période :</span>{([ ["today", "Aujourd’hui"], ["yesterday", "Hier"], ["week", "Cette semaine"], ["all", "Toutes"], ["custom", "Personnalisée"] ] as const).map(([value, label]) => <button key={value} onClick={() => setDateFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${dateFilter === value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}{dateFilter === "custom" && <><input type="date" aria-label="Du" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs" /><input type="date" aria-label="Au" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs" /></>}</div></section>

      {message && <Toast message={message} tone="success" />}{error && <Toast message={error} tone="error" />}

      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">{COLUMNS.map((column) => <button key={column.id} onClick={() => setMobileColumn(column.id)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${mobileColumn === column.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{column.title} · {counts[column.id]}</button>)}</div>
      <section className="grid gap-4 lg:grid-cols-4">{COLUMNS.map((column) => { const columnOrders = orders.filter((order) => column.statuses.includes(order.status)); const visible = mobileColumn === column.id; return <div key={column.id} onDragOver={(event) => { if (column.target) event.preventDefault(); }} onDrop={() => column.target && moveOrder(column.target)} className={`${column.tone} ${visible ? "block" : "hidden"} min-h-[330px] rounded-3xl border p-3 lg:block`}><div className="mb-3 flex items-center justify-between px-1"><div><h2 className="font-bold text-slate-800">{column.title}</h2><p className="text-[11px] text-slate-500">{column.subtitle}</p></div><span className="grid h-7 min-w-7 place-items-center rounded-lg bg-white px-1 text-xs font-bold text-slate-600 shadow-sm">{columnOrders.length}</span></div><div className="space-y-3">{columnOrders.map((order) => <div key={order.id} onDragStart={() => setDraggedId(order.id)}><OrderCard order={order} now={now} moving={movingId === order.id} onCancel={cancel} /></div>)}{columnOrders.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-3 py-8 text-center text-xs text-slate-400">Aucune commande</div>}</div></div>; })}</section>
      {(status === "annulee" || (status === "all" && dateFilter !== "today")) && orders.some((order) => order.status === "annulee") && <section className="rounded-3xl border border-rose-100 bg-rose-50/40 p-4"><h2 className="text-sm font-bold text-rose-800">Commandes annulées</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{orders.filter((order) => order.status === "annulee").map((order) => <OrderCard key={order.id} order={order} now={now} moving={false} onCancel={cancel} />)}</div></section>}
      {!loading && orders.length === 0 && <Empty text="Aucune commande ne correspond aux filtres sélectionnés." />}
    </div>
  );
}
