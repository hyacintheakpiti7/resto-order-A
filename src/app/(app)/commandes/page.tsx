"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, Empty, StatusBadge, inputClass } from "@/components/ui";
import { useLive } from "@/lib/client";
import type { OrderDTO } from "@/lib/orders";
import { dateTime, duration, money } from "@/lib/format";
import { ORDER_STATUSES, STATUS_SHORT, type OrderStatus } from "@/lib/constants";

export default function CommandesPage() {
  const { data } = useLive<{ orders: OrderDTO[] }>("/api/orders?limit=300", 6000);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");

  const orders = useMemo(() => {
    const list = data?.orders ?? [];
    return list.filter((o) => {
      const matchStatus = status === "all" || o.status === status;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        o.reference.toLowerCase().includes(q) ||
        o.tableNumber.toLowerCase().includes(q) ||
        (o.serverName ?? "").toLowerCase().includes(q) ||
        (o.cookName ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [data, search, status]);

  return (
    <div className="space-y-4">
      <Card
        title="Suivi & traçabilité des commandes"
        subtitle="Aucune commande n'est supprimée : historique intégral conservé"
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_16rem]">
          <input
            className={inputClass}
            placeholder="Rechercher par référence, table, serveur, cuisinier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
          >
            <option value="all">Tous les statuts</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_SHORT[s]}
              </option>
            ))}
          </select>
        </div>

        {orders.length === 0 ? (
          <Empty text="Aucune commande ne correspond à votre recherche." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2">Référence</th>
                  <th className="pb-2">Date &amp; heure</th>
                  <th className="pb-2">Table</th>
                  <th className="pb-2">Serveur</th>
                  <th className="pb-2">Cuisinier</th>
                  <th className="pb-2">Préparation</th>
                  <th className="pb-2">Statut</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-amber-50/40">
                    <td className="py-2.5 font-mono text-xs font-semibold">
                      <Link href={`/commandes/${o.id}`} className="text-amber-700 hover:underline">
                        {o.reference}
                      </Link>
                    </td>
                    <td className="py-2.5 text-xs text-slate-500">{dateTime(o.createdAt)}</td>
                    <td className="py-2.5">{o.tableNumber}</td>
                    <td className="py-2.5 text-xs">{o.serverName ?? "—"}</td>
                    <td className="py-2.5 text-xs">{o.cookName ?? "—"}</td>
                    <td className="py-2.5 text-xs">{duration(o.prepSeconds)}</td>
                    <td className="py-2.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-2.5 text-right font-semibold">{money(o.total)}</td>
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
