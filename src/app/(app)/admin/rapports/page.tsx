"use client";

import { useEffect, useState } from "react";
import { Button, Card, Empty, StatCard, inputClass } from "@/components/ui";
import { apiGet } from "@/lib/client";
import type { ReportData } from "@/lib/reports";
import { duration, money, todayKey } from "@/lib/format";

const PERIODS = [
  { key: "day", label: "Journalier" },
  { key: "week", label: "Hebdomadaire" },
  { key: "month", label: "Mensuel" },
  { key: "year", label: "Annuel" },
];

export default function RapportsPage() {
  const [period, setPeriod] = useState("day");
  const [date, setDate] = useState(todayKey());
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<{ report: ReportData }>(`/api/reports?period=${period}&date=${date}`)
      .then((res) => alive && setReport(res.report))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [period, date]);

  const exportUrl = (excel: boolean) =>
    `/api/reports?period=${period}&date=${date}&format=csv${excel ? "&excel=1" : ""}`;

  return (
    <div className="space-y-5">
      <Card
        title="Rapports comptables automatiques"
        subtitle="Journalier · Hebdomadaire · Mensuel · Annuel"
        action={
          <div className="flex flex-wrap gap-2">
            <a href={exportUrl(false)}>
              <Button size="sm" variant="outline">
                ⬇️ CSV
              </Button>
            </a>
            <a href={exportUrl(true)}>
              <Button size="sm" variant="outline">
                ⬇️ Excel
              </Button>
            </a>
            <Button size="sm" onClick={() => window.print()}>
              🖨️ PDF / Imprimer
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  period === p.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="w-44">
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {loading && !report && <p className="text-sm text-slate-500">Calcul du rapport…</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Commandes" value={report.totals.orders} icon="🧾" tone="sky" />
            <StatCard
              label="Chiffre d'affaires"
              value={money(report.totals.revenue)}
              icon="💰"
              tone="emerald"
            />
            <StatCard
              label="Montant encaissé"
              value={money(report.totals.cashed)}
              icon="🏦"
              tone="violet"
            />
            <StatCard
              label="Ticket moyen"
              value={money(report.totals.averageTicket)}
              icon="🎫"
              tone="amber"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Commandes payées" value={report.totals.paidOrders} tone="emerald" />
            <StatCard label="Commandes annulées" value={report.totals.cancelledOrders} tone="rose" />
            <StatCard label="Commandes en attente" value={report.totals.pendingOrders} tone="amber" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Ventes par serveur">
              <ReportTable
                rows={report.byServer.map((s) => [s.label, String(s.orders), money(s.revenue)])}
                headers={["Serveur", "Commandes", "CA"]}
              />
            </Card>
            <Card title="Production par cuisinier">
              <ReportTable
                rows={report.byCook.map((c) => [c.label, String(c.orders), duration(c.avgPrep)])}
                headers={["Cuisinier", "Commandes", "Temps moyen"]}
              />
            </Card>
            <Card title="Ventes par plat">
              <ReportTable
                rows={report.byDish.map((d) => [d.label, String(d.quantity), money(d.revenue)])}
                headers={["Plat", "Quantité", "CA"]}
              />
            </Card>
            <Card title="Ventes par catégorie">
              <ReportTable
                rows={report.byCategory.map((c) => [c.label, String(c.quantity), money(c.revenue)])}
                headers={["Catégorie", "Quantité", "CA"]}
              />
            </Card>
            <Card title="Répartition par mode de règlement" className="lg:col-span-2">
              <ReportTable
                rows={report.byPaymentMethod.map((p) => [
                  p.label,
                  String(p.count),
                  money(p.amount),
                ])}
                headers={["Mode de paiement", "Opérations", "Montant"]}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function ReportTable({ rows, headers }: { rows: string[][]; headers: string[] }) {
  if (rows.length === 0) return <Empty text="Aucune donnée sur la période." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
          <tr>
            {headers.map((h, i) => (
              <th key={h} className={`pb-2 ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, i) => (
                <td key={i} className={`py-2 ${i > 0 ? "text-right" : "font-medium"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
