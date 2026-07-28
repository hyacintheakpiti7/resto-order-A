"use client";

import { useState } from "react";
import { Button, Card, Empty, StatCard, Toast } from "@/components/ui";
import { apiSend, useLive } from "@/lib/client";
import type { ReportData } from "@/lib/reports";
import { dateTime, money } from "@/lib/format";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/constants";

type Closure = {
  id: number;
  businessDate: string;
  cashierName: string | null;
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  revenue: string;
  cashed: string;
  balance: string;
  breakdown: Record<string, number>;
  createdAt: string;
};

export default function CloturePage() {
  const { data, refresh } = useLive<{ closures: Closure[]; preview: ReportData }>(
    "/api/closures",
    8000,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const preview = data?.preview;

  async function close() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await apiSend("/api/closures", {});
      setMsg("Clôture de caisse enregistrée avec succès.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Commandes du jour" value={preview?.totals.orders ?? 0} icon="🧾" tone="sky" />
        <StatCard
          label="Chiffre d'affaires"
          value={money(preview?.totals.revenue ?? 0)}
          icon="💰"
          tone="emerald"
        />
        <StatCard
          label="Total encaissé"
          value={money(preview?.totals.cashed ?? 0)}
          icon="🏦"
          tone="violet"
        />
        <StatCard
          label="Solde de caisse"
          value={money((preview?.totals.cashed ?? 0) - (preview?.totals.revenue ?? 0))}
          icon="⚖️"
          tone="amber"
        />
      </div>

      {msg && <Toast message={msg} tone="success" />}
      {error && <Toast message={error} tone="error" />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Clôture journalière"
          subtitle="Synthèse de la journée en cours avant validation"
          action={
            <Button onClick={close} disabled={busy}>
              {busy ? "Clôture…" : "🔒 Clôturer la caisse"}
            </Button>
          }
        >
          <dl className="space-y-2 text-sm">
            {[
              ["Nombre total de commandes", preview?.totals.orders ?? 0],
              ["Commandes payées", preview?.totals.paidOrders ?? 0],
              ["Commandes annulées", preview?.totals.cancelledOrders ?? 0],
              ["Commandes en attente", preview?.totals.pendingOrders ?? 0],
              ["Chiffre d'affaires total", money(preview?.totals.revenue ?? 0)],
              ["Montant total encaissé", money(preview?.totals.cashed ?? 0)],
              [
                "Solde de caisse",
                money((preview?.totals.cashed ?? 0) - (preview?.totals.revenue ?? 0)),
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex justify-between border-b border-slate-100 pb-2 last:border-0"
              >
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Répartition par mode de règlement">
          {(preview?.byPaymentMethod ?? []).length === 0 ? (
            <Empty icon="💳" text="Aucun encaissement aujourd'hui." />
          ) : (
            <div className="space-y-2">
              {preview?.byPaymentMethod.map((m) => (
                <div
                  key={m.key}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {PAYMENT_LABELS[m.key as PaymentMethod] ?? m.label}
                    </p>
                    <p className="text-xs text-slate-500">{m.count} opération(s)</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{money(m.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Historique des clôtures">
        {(data?.closures ?? []).length === 0 ? (
          <Empty text="Aucune clôture enregistrée." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Responsable</th>
                  <th className="pb-2 text-center">Commandes</th>
                  <th className="pb-2 text-center">Payées</th>
                  <th className="pb-2 text-center">Annulées</th>
                  <th className="pb-2 text-right">CA</th>
                  <th className="pb-2 text-right">Encaissé</th>
                  <th className="pb-2 text-right">Clôturée le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.closures.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 font-semibold">{c.businessDate}</td>
                    <td className="py-2 text-xs">{c.cashierName}</td>
                    <td className="py-2 text-center">{c.totalOrders}</td>
                    <td className="py-2 text-center">{c.paidOrders}</td>
                    <td className="py-2 text-center">{c.cancelledOrders}</td>
                    <td className="py-2 text-right">{money(c.revenue)}</td>
                    <td className="py-2 text-right font-semibold">{money(c.cashed)}</td>
                    <td className="py-2 text-right text-xs text-slate-500">
                      {dateTime(c.createdAt)}
                    </td>
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
