"use client";

import Link from "next/link";
import { use } from "react";
import { Card, Empty, PriorityBadge, StatusBadge } from "@/components/ui";
import { useLive } from "@/lib/client";
import type { OrderDTO } from "@/lib/orders";
import { dateTime, duration, money } from "@/lib/format";
import { PAYMENT_LABELS, STATUS_LABELS, type PaymentMethod } from "@/lib/constants";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading } = useLive<{ order: OrderDTO }>(`/api/orders/${id}`, 5000);
  const order = data?.order;

  if (loading && !order) return <p className="text-sm text-slate-500">Chargement…</p>;
  if (!order) return <Empty text="Commande introuvable." />;

  const timeline: { label: string; at: string | null; who?: string | null; icon: string }[] = [
    { label: "Prise de commande", at: order.createdAt, who: order.serverName, icon: "🧾" },
    { label: "Validation caisse & encaissement", at: order.validatedAt, who: order.cashierName, icon: "💳" },
    { label: "Attribution en cuisine", at: order.assignedAt, who: order.chefName, icon: "👨‍🍳" },
    { label: "Début de préparation", at: order.startedAt, who: order.cookName, icon: "🔥" },
    { label: "Fin de préparation", at: order.readyAt, who: order.cookName, icon: "🔔" },
    { label: "Livraison au client", at: order.deliveredAt, who: order.serverName, icon: "✅" },
  ];
  if (order.cancelledAt) {
    timeline.push({ label: "Annulation", at: order.cancelledAt, who: order.cancelReason, icon: "🚫" });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="font-mono text-lg font-bold text-slate-900">{order.reference}</p>
          <p className="text-sm text-slate-500">
            {STATUS_LABELS[order.status]} • Table {order.tableNumber} • {order.guests} couvert(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={order.priority} />
          <StatusBadge status={order.status} />
          <Link
            href={`/impression/${order.id}?type=bon`}
            target="_blank"
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            🖨️ Bon de commande
          </Link>
          <Link
            href={`/impression/${order.id}?type=recu`}
            target="_blank"
            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
          >
            🧾 Reçu client
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Articles commandés" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2">Plat</th>
                  <th className="pb-2">Catégorie</th>
                  <th className="pb-2 text-center">Qté</th>
                  <th className="pb-2 text-right">P.U.</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">
                      <p className="font-medium text-slate-800">{i.dishName}</p>
                      {i.supplements.length > 0 && (
                        <p className="text-xs text-amber-700">
                          + {i.supplements.map((s) => `${s.name} (${money(s.price)})`).join(", ")}
                        </p>
                      )}
                      {i.notes && <p className="text-xs italic text-slate-500">« {i.notes} »</p>}
                    </td>
                    <td className="py-2 text-xs text-slate-500">{i.categoryName}</td>
                    <td className="py-2 text-center font-semibold">{i.quantity}</td>
                    <td className="py-2 text-right">{money(i.unitPrice)}</td>
                    <td className="py-2 text-right font-semibold">{money(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Sous-total</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Taxes</span>
              <span>{money(order.taxAmount)}</span>
            </div>
            {order.serviceAmount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Service</span>
                <span>{money(order.serviceAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
          </div>
          {order.notes && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Observations :</strong> {order.notes}
            </p>
          )}
        </Card>

        <Card title="Fiche de traçabilité">
          <Row label="Référence" value={order.reference} />
          <Row label="Date" value={dateTime(order.createdAt)} />
          <Row label="Serveur" value={order.serverName} />
          <Row label="Table" value={order.tableNumber} />
          <Row label="Nombre de clients" value={order.guests} />
          <Row label="Caissier" value={order.cashierName} />
          <Row
            label="Mode de paiement"
            value={
              order.paymentMethod ? PAYMENT_LABELS[order.paymentMethod as PaymentMethod] : "—"
            }
          />
          <Row label="Montant payé" value={money(order.paidAmount)} />
          <Row label="Chef de cuisine" value={order.chefName} />
          <Row label="Cuisinier responsable" value={order.cookName} />
          <Row label="Temps de préparation" value={duration(order.prepSeconds)} />
          <Row label="Temps total de service" value={duration(order.serviceSeconds)} />
          <Row label="Statut final" value={STATUS_LABELS[order.status]} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Cycle de vie de la commande">
          <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
            {timeline.map((step) => (
              <li key={step.label} className="relative">
                <span
                  className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full text-xs ring-4 ring-white ${
                    step.at ? "bg-emerald-100" : "bg-slate-100 grayscale"
                  }`}
                >
                  {step.icon}
                </span>
                <p
                  className={`text-sm font-semibold ${
                    step.at ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-500">
                  {step.at ? dateTime(step.at) : "En attente"}
                  {step.who ? ` • ${step.who}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Historique des paiements">
          {order.payments.length === 0 ? (
            <Empty icon="💳" text="Aucun paiement enregistré." />
          ) : (
            <div className="space-y-2">
              {order.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-700">{p.reference}</p>
                    <p className="text-xs text-slate-500">
                      {PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method} • {dateTime(p.createdAt)} •{" "}
                      {p.cashierName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{money(p.amount)}</p>
                    <span className="text-[11px] font-semibold uppercase text-emerald-600">
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
