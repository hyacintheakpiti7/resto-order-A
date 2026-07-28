"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Empty, StatCard, StatusBadge, Toast } from "@/components/ui";
import { apiSend, useLive } from "@/lib/client";
import type { OrderDTO } from "@/lib/orders";
import { clock, duration, elapsedSince, money } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants";

export default function ServeurPage() {
  const { data, refresh } = useLive<{ orders: OrderDTO[] }>(
    "/api/orders?scope=mine&today=1&limit=100",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const orders = data?.orders ?? [];

  const ready = orders.filter((o) => o.status === "prete");
  const active = orders.filter(
    (o) => !["livree", "annulee"].includes(o.status) && o.status !== "prete",
  );
  const done = orders.filter((o) => ["livree", "annulee"].includes(o.status));
  const revenue = orders
    .filter((o) => o.status !== "annulee")
    .reduce((sum, o) => sum + o.total, 0);
  const served = orders.filter((o) => o.serviceSeconds);
  const avgService = served.length
    ? Math.round(served.reduce((s, o) => s + (o.serviceSeconds ?? 0), 0) / served.length)
    : 0;

  async function deliver(id: number) {
    setBusy(id);
    setError("");
    try {
      await apiSend(`/api/orders/${id}`, { action: "deliver" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Commandes du jour" value={orders.length} icon="🧾" tone="sky" />
        <StatCard label="Chiffre d'affaires" value={money(revenue)} icon="💰" tone="emerald" />
        <StatCard label="Temps moyen de service" value={duration(avgService)} icon="⏱️" tone="violet" />
        <StatCard label="Prêtes à servir" value={ready.length} icon="🔔" tone="amber" />
      </div>

      {error && <Toast message={error} tone="error" />}

      <Card
        title="🔔 Plats prêts à livrer"
        subtitle="Notification automatique dès la fin de préparation en cuisine"
        action={
          <Link href="/serveur/nouvelle">
            <Button size="sm">➕ Nouvelle commande</Button>
          </Link>
        }
      >
        {ready.length === 0 ? (
          <Empty icon="⏳" text="Aucune commande prête pour le moment." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ready.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-emerald-900">{o.reference}</p>
                    <p className="text-sm text-emerald-800">
                      Table {o.tableNumber} • {o.guests} couvert(s)
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white">
                    PRÊTE
                  </span>
                </div>
                <p className="mt-2 text-xs text-emerald-700">
                  Disponible depuis {clock(o.readyAt)} • préparée par {o.cookName ?? "—"}
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-emerald-900">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.quantity} × {i.dishName}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-3 w-full"
                  variant="success"
                  disabled={busy === o.id}
                  onClick={() => deliver(o.id)}
                >
                  ✅ Confirmer la livraison au client
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Commandes en cours" subtitle="Suivi de l'état d'avancement en temps réel">
        {active.length === 0 ? (
          <Empty icon="🍽️" text="Aucune commande en cours." />
        ) : (
          <div className="space-y-2">
            {active.map((o) => (
              <Link
                key={o.id}
                href={`/commandes/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-amber-300 hover:bg-amber-50/40"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-slate-800">{o.reference}</p>
                  <p className="text-xs text-slate-500">
                    Table {o.tableNumber} • {o.items.length} article(s) • depuis{" "}
                    {elapsedSince(o.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">{money(o.total)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card title="Historique du jour" subtitle="Commandes livrées ou annulées">
        {done.length === 0 ? (
          <Empty text="Aucune commande clôturée aujourd'hui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2">Référence</th>
                  <th className="pb-2">Table</th>
                  <th className="pb-2">Statut</th>
                  <th className="pb-2">Service</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {done.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 font-mono text-xs">
                      <Link href={`/commandes/${o.id}`} className="hover:underline">
                        {o.reference}
                      </Link>
                    </td>
                    <td className="py-2">{o.tableNumber}</td>
                    <td className="py-2 text-xs text-slate-500">{STATUS_LABELS[o.status]}</td>
                    <td className="py-2 text-xs">{duration(o.serviceSeconds)}</td>
                    <td className="py-2 text-right font-semibold">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
