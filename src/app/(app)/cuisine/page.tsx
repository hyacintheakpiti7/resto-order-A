"use client";

import { useState } from "react";
import { Button, Card, Empty, Modal, PriorityBadge, StatCard, StatusBadge, Toast, inputClass } from "@/components/ui";
import { apiSend, useLive } from "@/lib/client";
import type { OrderDTO } from "@/lib/orders";
import { clock, duration, elapsedSince } from "@/lib/format";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/constants";

type Cook = { id: number; fullName: string; code: string; active: boolean };

const ORDER_OF_PRIORITY: Record<string, number> = { urgente: 0, haute: 1, normale: 2, basse: 3 };

export default function CuisinePage() {
  const { data, refresh } = useLive<{ orders: OrderDTO[] }>(
    "/api/orders?status=validee,assignee,en_preparation,prete&limit=100",
    3500,
  );
  const { data: cooksData } = useLive<{ users: Cook[] }>("/api/users?role=cuisinier", 30000);
  const [target, setTarget] = useState<OrderDTO | null>(null);
  const [cookId, setCookId] = useState<number | "">("");
  const [priority, setPriority] = useState<Priority>("normale");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const orders = data?.orders ?? [];
  const cooks = (cooksData?.users ?? []).filter((c) => c.active);
  const toAssign = orders
    .filter((o) => o.status === "validee")
    .sort((a, b) => ORDER_OF_PRIORITY[a.priority] - ORDER_OF_PRIORITY[b.priority]);
  const running = orders.filter((o) => ["assignee", "en_preparation"].includes(o.status));
  const ready = orders.filter((o) => o.status === "prete");

  const prepDone = orders.filter((o) => o.prepSeconds);
  const avgPrep = prepDone.length
    ? Math.round(prepDone.reduce((s, o) => s + (o.prepSeconds ?? 0), 0) / prepDone.length)
    : 0;

  async function assign() {
    if (!target || !cookId) return setError("Sélectionnez un cuisinier");
    setBusy(true);
    setError("");
    try {
      await apiSend(`/api/orders/${target.id}`, { action: "assign", cookId, priority });
      setTarget(null);
      setCookId("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function changePriority(order: OrderDTO, value: string) {
    await apiSend(`/api/orders/${order.id}`, { action: "priority", priority: value });
    refresh();
  }

  const load = new Map<number, number>();
  for (const o of running) if (o.cookId) load.set(o.cookId, (load.get(o.cookId) ?? 0) + 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="À attribuer" value={toAssign.length} icon="📥" tone="amber" />
        <StatCard label="En préparation" value={running.length} icon="🔥" tone="violet" />
        <StatCard label="Prêtes à servir" value={ready.length} icon="🔔" tone="emerald" />
        <StatCard label="Temps moyen préparation" value={duration(avgPrep)} icon="⏱️" tone="sky" />
      </div>

      {error && !target && <Toast message={error} tone="error" />}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="📥 Nouvelles commandes validées" subtitle="Classées par priorité">
          {toAssign.length === 0 ? (
            <Empty icon="✅" text="Aucune commande en attente d'attribution." />
          ) : (
            <div className="space-y-3">
              {toAssign.map((o) => (
                <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-bold text-slate-800">{o.reference}</p>
                      <p className="text-xs text-slate-500">
                        Table {o.tableNumber} • validée à {clock(o.validatedAt)}
                      </p>
                    </div>
                    <PriorityBadge priority={o.priority} />
                  </div>
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
                    {o.items.map((i) => (
                      <li key={i.id}>
                        <strong>{i.quantity}×</strong> {i.dishName}
                        {i.supplements.length > 0 && (
                          <em className="text-amber-700">
                            {" "}
                            (+{i.supplements.map((s) => s.name).join(", ")})
                          </em>
                        )}
                        {i.notes && <em className="text-slate-500"> — {i.notes}</em>}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      value={o.priority}
                      onChange={(e) => changePriority(o, e.target.value)}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          Priorité {PRIORITY_LABELS[p]}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => {
                        setTarget(o);
                        setPriority(o.priority as Priority);
                        setError("");
                      }}
                    >
                      👨‍🍳 Attribuer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="🔥 Préparations en cours" className="xl:col-span-2">
          {running.length === 0 ? (
            <Empty icon="🍳" text="Aucune préparation en cours." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {running.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-violet-200 bg-violet-50/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-bold text-slate-800">{o.reference}</p>
                      <p className="text-xs text-slate-600">
                        Table {o.tableNumber} • {o.cookName}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Attribuée à {clock(o.assignedAt)}
                    {o.startedAt ? ` • démarrée depuis ${elapsedSince(o.startedAt)}` : ""}
                  </p>
                  <ul className="mt-2 text-xs text-slate-700">
                    {o.items.map((i) => (
                      <li key={i.id}>
                        {i.quantity}× {i.dishName}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {ready.length > 0 && (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Prêtes — en attente de service
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ready.map((o) => (
                  <span
                    key={o.id}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
                  >
                    {o.reference} • T{o.tableNumber} • {duration(o.prepSeconds)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Charge de travail des cuisiniers">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cooks.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">{c.fullName}</p>
              <p className="text-xs text-slate-500">{c.code}</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">{load.get(c.id) ?? 0}</p>
              <p className="text-xs text-slate-400">commande(s) en cours</p>
            </div>
          ))}
          {cooks.length === 0 && <p className="text-sm text-slate-400">Aucun cuisinier actif.</p>}
        </div>
      </Card>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={`Attribuer ${target?.reference ?? ""}`}
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cuisinier
            </span>
            <select
              className={inputClass}
              value={cookId}
              onChange={(e) => setCookId(Number(e.target.value))}
            >
              <option value="">— Sélectionner —</option>
              {cooks.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({load.get(c.id) ?? 0} en cours)
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Priorité
            </span>
            <select
              className={inputClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          {error && <Toast message={error} tone="error" />}
          <Button className="w-full" onClick={assign} disabled={busy}>
            Confirmer l&apos;attribution
          </Button>
        </div>
      </Modal>
    </div>
  );
}
