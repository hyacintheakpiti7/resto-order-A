"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Empty, Field, Modal, StatCard, StatusBadge, Toast, inputClass } from "@/components/ui";
import { apiSend, useLive } from "@/lib/client";
import type { OrderDTO } from "@/lib/orders";
import { clock, elapsedSince, money } from "@/lib/format";
import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";

type PayLine = { method: PaymentMethod; amount: number };

export default function CaissePage() {
  const { data, refresh } = useLive<{ orders: OrderDTO[] }>("/api/orders?today=1&limit=150", 4000);
  const [target, setTarget] = useState<OrderDTO | null>(null);
  const [lines, setLines] = useState<PayLine[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OrderDTO | null>(null);
  const [reason, setReason] = useState("");

  const orders = data?.orders ?? [];
  const pending = orders.filter((o) => o.status === "en_attente_validation");
  const validated = orders.filter(
    (o) => !["en_attente_validation", "annulee"].includes(o.status),
  );
  const cashed = orders
    .filter((o) => o.paymentStatus === "paye")
    .reduce((s, o) => s + o.paidAmount, 0);

  function openPayment(order: OrderDTO) {
    setTarget(order);
    setLines([{ method: "especes", amount: order.total }]);
    setError("");
  }

  async function validate() {
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      await apiSend(`/api/orders/${target.id}`, { action: "validate", payments: lines });
      setMsg(`Commande ${target.reference} validée et envoyée en cuisine.`);
      setTarget(null);
      await refresh();
      setTimeout(() => setMsg(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      await apiSend(`/api/orders/${cancelTarget.id}`, { action: "cancel", reason });
      setCancelTarget(null);
      setReason("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const totalLines = lines.reduce((s, l) => s + Number(l.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="À valider" value={pending.length} icon="⏳" tone="amber" />
        <StatCard label="Commandes du jour" value={orders.length} icon="🧾" tone="sky" />
        <StatCard label="Encaissé aujourd'hui" value={money(cashed)} icon="💰" tone="emerald" />
        <StatCard
          label="Annulées"
          value={orders.filter((o) => o.status === "annulee").length}
          icon="🚫"
          tone="rose"
        />
      </div>

      {msg && <Toast message={msg} tone="success" />}
      {error && !target && <Toast message={error} tone="error" />}

      <Card
        title="Commandes en attente de validation"
        subtitle="Vérifiez les articles, encaissez puis envoyez en cuisine"
      >
        {pending.length === 0 ? (
          <Empty icon="✅" text="Aucune commande en attente de validation." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((o) => (
              <div key={o.id} className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-800">{o.reference}</p>
                    <p className="text-xs text-slate-600">
                      Table {o.tableNumber} • {o.guests} couvert(s) • {o.serverName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Reçue à {clock(o.createdAt)} • il y a {elapsedSince(o.createdAt)}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{money(o.total)}</span>
                </div>
                <ul className="mt-3 space-y-1 rounded-xl bg-white p-3 text-xs text-slate-700">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span>
                        {i.quantity} × {i.dishName}
                        {i.supplements.length > 0 && (
                          <em className="text-amber-700">
                            {" "}
                            (+{i.supplements.map((s) => s.name).join(", ")})
                          </em>
                        )}
                      </span>
                      <span className="font-semibold">{money(i.lineTotal)}</span>
                    </li>
                  ))}
                  {o.notes && <li className="pt-1 italic text-slate-500">Note : {o.notes}</li>}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openPayment(o)}>
                    💳 Valider &amp; encaisser
                  </Button>
                  <Link href={`/commandes/${o.id}`}>
                    <Button size="sm" variant="outline">
                      Détails
                    </Button>
                  </Link>
                  <Button size="sm" variant="danger" onClick={() => setCancelTarget(o)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Commandes traitées aujourd'hui">
        {validated.length === 0 ? (
          <Empty text="Aucune commande traitée." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2">Référence</th>
                  <th className="pb-2">Table</th>
                  <th className="pb-2">Serveur</th>
                  <th className="pb-2">Règlement</th>
                  <th className="pb-2">Statut</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Reçu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validated.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 font-mono text-xs">
                      <Link href={`/commandes/${o.id}`} className="hover:underline">
                        {o.reference}
                      </Link>
                    </td>
                    <td className="py-2">{o.tableNumber}</td>
                    <td className="py-2 text-xs text-slate-500">{o.serverName}</td>
                    <td className="py-2 text-xs">
                      {o.paymentMethod
                        ? PAYMENT_LABELS[o.paymentMethod as PaymentMethod]
                        : "—"}
                    </td>
                    <td className="py-2">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-2 text-right font-semibold">{money(o.total)}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/impression/${o.id}?type=recu`}
                        target="_blank"
                        className="text-xs font-semibold text-amber-600 hover:underline"
                      >
                        🖨️ Imprimer
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target ? `Encaissement — ${target.reference}` : ""}
        wide
      >
        {target && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Sous-total</span>
                <span>{money(target.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Taxes</span>
                <span>{money(target.taxAmount)}</span>
              </div>
              {target.serviceAmount > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Service</span>
                  <span>{money(target.serviceAmount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-bold text-slate-900">
                <span>Total à payer</span>
                <span>{money(target.total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Modes de paiement (plusieurs lignes = paiement mixte)
              </p>
              {lines.map((line, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1">
                    <select
                      className={inputClass}
                      value={line.method}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, method: e.target.value as PaymentMethod } : l,
                          ),
                        )
                      }
                    >
                      {PAYMENT_METHODS.filter((m) => m !== "mixte").map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-36">
                    <input
                      type="number"
                      className={inputClass}
                      value={line.amount}
                      min={0}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, amount: Number(e.target.value) } : l,
                          ),
                        )
                      }
                    />
                  </div>
                  {lines.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    {
                      method: "carte",
                      amount: Math.max(0, target.total - prev.reduce((s, l) => s + l.amount, 0)),
                    },
                  ])
                }
              >
                ➕ Ajouter un règlement
              </Button>
            </div>

            <div className="flex justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <span>Total encaissé</span>
              <span>{money(totalLines)}</span>
            </div>
            {totalLines > target.total && (
              <p className="text-xs text-slate-500">
                Monnaie à rendre : <strong>{money(totalLines - target.total)}</strong>
              </p>
            )}

            {error && <Toast message={error} tone="error" />}
            <div className="flex flex-wrap gap-2">
              <Button onClick={validate} disabled={busy} variant="success">
                {busy ? "Traitement…" : "✅ Valider, encaisser & envoyer en cuisine"}
              </Button>
              <Button variant="ghost" onClick={() => setTarget(null)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={`Annuler la commande ${cancelTarget?.reference ?? ""}`}
      >
        <div className="space-y-3">
          <Field label="Motif d'annulation">
            <input
              className={inputClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Client parti, erreur de saisie…"
            />
          </Field>
          <p className="text-xs text-slate-500">
            La commande est conservée dans l&apos;historique : la traçabilité reste complète.
          </p>
          <Button variant="danger" onClick={cancel} disabled={busy}>
            Confirmer l&apos;annulation
          </Button>
        </div>
      </Modal>
    </div>
  );
}
