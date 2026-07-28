import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrder, getSettings } from "@/lib/orders";
import { dateTime, duration, money } from "@/lib/format";
import { PAYMENT_LABELS, STATUS_LABELS, type PaymentMethod } from "@/lib/constants";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { type } = await searchParams;
  const order = await getOrder(Number(id));
  const config = await getSettings();
  if (!order) return <p className="p-8">Commande introuvable.</p>;

  const isReceipt = type !== "bon";
  const currency = config.currency;

  return (
    <div className="mx-auto max-w-[80mm] bg-white p-6 text-slate-900 print:max-w-full print:p-0">
      <style>{`@media print { .no-print { display:none !important; } body { background:#fff; } }`}</style>

      <div className="no-print mb-4 flex justify-between gap-2">
        <PrintButton />
        <a
          href={`/commandes/${order.id}`}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"
        >
          Retour
        </a>
      </div>

      <div className="text-center">
        <p className="text-lg font-bold uppercase">{config.restaurantName}</p>
        <p className="text-[11px] text-slate-600">{config.address}</p>
        <p className="text-[11px] text-slate-600">Tél. {config.phone}</p>
        <p className="mt-2 border-y border-dashed border-slate-400 py-1 text-sm font-bold uppercase">
          {isReceipt ? "Reçu client" : "Bon de commande — cuisine"}
        </p>
      </div>

      <div className="mt-3 space-y-0.5 text-[12px]">
        <p>
          <strong>Réf. :</strong> {order.reference}
        </p>
        <p>
          <strong>Date :</strong> {dateTime(order.createdAt)}
        </p>
        <p>
          <strong>Table :</strong> {order.tableNumber} — {order.guests} couvert(s)
        </p>
        <p>
          <strong>Serveur :</strong> {order.serverName ?? "—"}
        </p>
        {isReceipt && (
          <p>
            <strong>Caissier :</strong> {order.cashierName ?? "—"}
          </p>
        )}
        {!isReceipt && (
          <p>
            <strong>Cuisinier :</strong> {order.cookName ?? "à attribuer"}
          </p>
        )}
      </div>

      <table className="mt-3 w-full border-t border-dashed border-slate-400 pt-2 text-[12px]">
        <thead>
          <tr className="text-left">
            <th className="py-1">Article</th>
            <th className="py-1 text-center">Qté</th>
            {isReceipt && <th className="py-1 text-right">Montant</th>}
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="align-top">
              <td className="py-1">
                {i.dishName}
                {i.supplements.length > 0 && (
                  <em className="block text-[10px]">+ {i.supplements.map((s) => s.name).join(", ")}</em>
                )}
                {i.notes && <em className="block text-[10px]">« {i.notes} »</em>}
              </td>
              <td className="py-1 text-center">{i.quantity}</td>
              {isReceipt && <td className="py-1 text-right">{money(i.lineTotal, currency)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {isReceipt ? (
        <div className="mt-3 space-y-0.5 border-t border-dashed border-slate-400 pt-2 text-[12px]">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span>{money(order.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxes ({config.taxRate}%)</span>
            <span>{money(order.taxAmount, currency)}</span>
          </div>
          {order.serviceAmount > 0 && (
            <div className="flex justify-between">
              <span>Service</span>
              <span>{money(order.serviceAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-400 pt-1 text-sm font-bold">
            <span>TOTAL</span>
            <span>{money(order.total, currency)}</span>
          </div>
          <div className="mt-2">
            {order.payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>
                  {PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method} — {p.reference}
                </span>
                <span>{money(p.amount, currency)}</span>
              </div>
            ))}
          </div>
          {order.paidAmount > order.total && (
            <div className="flex justify-between font-semibold">
              <span>Monnaie rendue</span>
              <span>{money(order.paidAmount - order.total, currency)}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 border-t border-dashed border-slate-400 pt-2 text-[12px]">
          <p>
            <strong>Priorité :</strong> {order.priority}
          </p>
          <p>
            <strong>Statut :</strong> {STATUS_LABELS[order.status]}
          </p>
          {order.notes && (
            <p>
              <strong>Observations :</strong> {order.notes}
            </p>
          )}
          <p>
            <strong>Temps de préparation :</strong> {duration(order.prepSeconds)}
          </p>
        </div>
      )}

      <p className="mt-4 border-t border-dashed border-slate-400 pt-2 text-center text-[11px]">
        {config.receiptFooter}
      </p>
      <p className="text-center text-[10px] text-slate-500">
        Document généré par RestoFlow — {dateTime(new Date())}
      </p>
    </div>
  );
}
