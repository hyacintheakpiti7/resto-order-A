"use client";

import Link from "next/link";
import { Card, Empty, StatCard, StatusBadge } from "@/components/ui";
import { useLive } from "@/lib/client";
import type { OrderDTO } from "@/lib/orders";
import type { ReportData } from "@/lib/reports";
import { clock, duration, elapsedSince, money } from "@/lib/format";
import { STATUS_SHORT, type OrderStatus } from "@/lib/constants";

type Payload = {
  report: ReportData;
  live: OrderDTO[];
  settings: { currency: string; restaurantName: string };
};

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AdminDashboard() {
  const { data } = useLive<Payload>("/api/dashboard", 5000);
  const report = data?.report;
  const live = data?.live ?? [];
  const currency = data?.settings.currency ?? "FCFA";

  const maxDish = Math.max(1, ...(report?.byDish ?? []).map((d) => d.quantity));
  const maxHour = Math.max(1, ...(report?.byHour ?? []).map((h) => h.orders));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Commandes du jour"
          value={report?.totals.orders ?? 0}
          hint={`${report?.totals.deliveredOrders ?? 0} livrées`}
          icon="🧾"
          tone="sky"
        />
        <StatCard
          label="Chiffre d'affaires"
          value={money(report?.totals.revenue ?? 0, currency)}
          hint={`Ticket moyen ${money(report?.totals.averageTicket ?? 0, currency)}`}
          icon="💰"
          tone="emerald"
        />
        <StatCard
          label="Temps moyen préparation"
          value={duration(report?.totals.averagePrepSeconds ?? 0)}
          icon="⏱️"
          tone="violet"
        />
        <StatCard
          label="Commandes en cours"
          value={live.length}
          hint={`${report?.totals.cancelledOrders ?? 0} annulée(s)`}
          icon="🔥"
          tone="amber"
        />
      </div>

      <Card
        title="État des commandes en temps réel"
        subtitle="Actualisation automatique toutes les 5 secondes"
        action={
          <Link href="/commandes" className="text-xs font-semibold text-amber-600 hover:underline">
            Voir toute la traçabilité →
          </Link>
        }
      >
        {live.length === 0 ? (
          <Empty icon="😴" text="Aucune commande active pour le moment." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {live.map((o) => (
              <Link
                key={o.id}
                href={`/commandes/${o.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-800">{o.reference}</p>
                    <p className="text-xs text-slate-500">
                      Table {o.tableNumber} • {o.serverName}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Ouverte à {clock(o.createdAt)} • depuis {elapsedSince(o.createdAt)}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">{money(o.total, currency)}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Performance des serveurs" subtitle="Commandes, CA et temps moyen de service">
          {(report?.byServer ?? []).length === 0 ? (
            <Empty text="Aucune donnée." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2">Serveur</th>
                  <th className="pb-2 text-center">Commandes</th>
                  <th className="pb-2 text-right">CA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report?.byServer.map((s) => (
                  <tr key={s.key}>
                    <td className="py-2 font-medium">{s.label}</td>
                    <td className="py-2 text-center">{s.orders}</td>
                    <td className="py-2 text-right font-semibold">{money(s.revenue, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Temps moyen de service global :{" "}
            <strong>{duration(report?.totals.averageServiceSeconds ?? 0)}</strong>
          </p>
        </Card>

        <Card title="Performance cuisine" subtitle="Commandes préparées et durée moyenne">
          {(report?.byCook ?? []).length === 0 ? (
            <Empty text="Aucune donnée." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2">Cuisinier</th>
                  <th className="pb-2 text-center">Préparées</th>
                  <th className="pb-2 text-right">Temps moyen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report?.byCook.map((c) => (
                  <tr key={c.key}>
                    <td className="py-2 font-medium">{c.label}</td>
                    <td className="py-2 text-center">{c.orders}</td>
                    <td className="py-2 text-right font-semibold">{duration(c.avgPrep)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(report?.statusCounts ?? {}).map(([status, count]) => (
              <span
                key={status}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
              >
                {STATUS_SHORT[status as OrderStatus] ?? status} : {count}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Plats les plus vendus">
          {(report?.byDish ?? []).length === 0 ? (
            <Empty text="Aucune vente enregistrée." />
          ) : (
            <div className="space-y-3">
              {report?.byDish.slice(0, 8).map((d) => (
                <div key={d.key}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{d.label}</span>
                    <span className="text-slate-500">
                      {d.quantity} vendu(s) • {money(d.revenue, currency)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Bar value={d.quantity} max={maxDish} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Heures de forte activité">
          {(report?.byHour ?? []).length === 0 ? (
            <Empty text="Aucune activité aujourd'hui." />
          ) : (
            <div className="flex h-48 items-end gap-1.5">
              {report?.byHour.map((h) => (
                <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-amber-400"
                    style={{ height: `${(h.orders / maxHour) * 100}%`, minHeight: "6px" }}
                    title={`${h.orders} commande(s) — ${money(h.revenue, currency)}`}
                  />
                  <span className="text-[10px] text-slate-400">{h.hour}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
