"use client";

import { useState } from "react";
import { Button, Card, Empty, PriorityBadge, StatCard, Toast } from "@/components/ui";
import { apiSend, useLive } from "@/lib/client";
import type { OrderDTO } from "@/lib/orders";
import { clock, duration, elapsedSince } from "@/lib/format";

export default function PreparationPage() {
  const { data, refresh } = useLive<{ orders: OrderDTO[] }>(
    "/api/orders?scope=mine&today=1&limit=100",
    3500,
  );
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const orders = data?.orders ?? [];
  const queue = orders.filter((o) => o.status === "assignee");
  const running = orders.filter((o) => o.status === "en_preparation");
  const finished = orders.filter((o) => ["prete", "livree"].includes(o.status));
  const avg = finished.filter((o) => o.prepSeconds).length
    ? Math.round(
        finished.reduce((s, o) => s + (o.prepSeconds ?? 0), 0) /
          finished.filter((o) => o.prepSeconds).length,
      )
    : 0;

  async function act(id: number, action: "start" | "ready") {
    setBusy(id);
    setError("");
    try {
      await apiSend(`/api/orders/${id}`, { action });
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
        <StatCard label="À démarrer" value={queue.length} icon="📋" tone="amber" />
        <StatCard label="En cours" value={running.length} icon="🔥" tone="violet" />
        <StatCard label="Terminées aujourd'hui" value={finished.length} icon="✅" tone="emerald" />
        <StatCard label="Temps moyen" value={duration(avg)} icon="⏱️" tone="sky" />
      </div>

      {error && <Toast message={error} tone="error" />}

      <Card title="🔥 Préparations en cours" subtitle="Cliquez sur « Commande prête » à la fin">
        {running.length === 0 ? (
          <Empty icon="🍳" text="Aucune préparation démarrée." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {running.map((o) => (
              <div key={o.id} className="rounded-2xl border-2 border-violet-300 bg-violet-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-violet-900">{o.reference}</p>
                    <p className="text-xs text-violet-700">
                      Table {o.tableNumber} • {o.guests} couvert(s)
                    </p>
                  </div>
                  <PriorityBadge priority={o.priority} />
                </div>
                <p className="mt-1 text-xs font-semibold text-violet-800">
                  ⏱️ En cours depuis {elapsedSince(o.startedAt)}
                </p>
                <ul className="mt-2 space-y-1 rounded-xl bg-white p-3 text-sm text-slate-800">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      <strong>{i.quantity}×</strong> {i.dishName}
                      {i.supplements.length > 0 && (
                        <em className="block text-xs text-amber-700">
                          + {i.supplements.map((s) => s.name).join(", ")}
                        </em>
                      )}
                      {i.notes && <em className="block text-xs text-slate-500">« {i.notes} »</em>}
                    </li>
                  ))}
                </ul>
                {o.notes && (
                  <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
                    Observation : {o.notes}
                  </p>
                )}
                <Button
                  className="mt-3 w-full"
                  variant="success"
                  disabled={busy === o.id}
                  onClick={() => act(o.id, "ready")}
                >
                  🔔 Commande prête
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="📋 Commandes qui me sont attribuées">
        {queue.length === 0 ? (
          <Empty text="Aucune commande en file d'attente." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {queue.map((o) => (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-800">{o.reference}</p>
                    <p className="text-xs text-slate-500">
                      Table {o.tableNumber} • attribuée à {clock(o.assignedAt)} par {o.chefName}
                    </p>
                  </div>
                  <PriorityBadge priority={o.priority} />
                </div>
                <ul className="mt-2 space-y-0.5 text-sm text-slate-700">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      <strong>{i.quantity}×</strong> {i.dishName}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-3 w-full"
                  disabled={busy === o.id}
                  onClick={() => act(o.id, "start")}
                >
                  ▶️ Démarrer la préparation
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Historique du jour">
        {finished.length === 0 ? (
          <Empty text="Aucune préparation terminée aujourd'hui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2">Référence</th>
                  <th className="pb-2">Table</th>
                  <th className="pb-2">Début</th>
                  <th className="pb-2">Fin</th>
                  <th className="pb-2 text-right">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finished.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 font-mono text-xs">{o.reference}</td>
                    <td className="py-2">{o.tableNumber}</td>
                    <td className="py-2 text-xs">{clock(o.startedAt)}</td>
                    <td className="py-2 text-xs">{clock(o.readyAt)}</td>
                    <td className="py-2 text-right font-semibold">{duration(o.prepSeconds)}</td>
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
