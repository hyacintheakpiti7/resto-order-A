"use client";

import { useMemo, useState } from "react";
import { Card, Empty, inputClass } from "@/components/ui";
import { useLive } from "@/lib/client";
import { dateTime } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/constants";

type LogRow = {
  id: number;
  userName: string | null;
  role: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
};

export default function JournalPage() {
  const { data } = useLive<{ logs: LogRow[] }>("/api/audit?limit=300", 8000);
  const [search, setSearch] = useState("");

  const logs = useMemo(() => {
    const list = data?.logs ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        (l.userName ?? "").toLowerCase().includes(q) ||
        (l.details ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <Card
      title="Journal d'audit"
      subtitle="Historique intégral des actions réalisées par les utilisateurs"
    >
      <input
        className={`${inputClass} mb-4`}
        placeholder="Rechercher une action, un utilisateur…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {logs.length === 0 ? (
        <Empty icon="🛡️" text="Aucune action enregistrée." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="pb-2">Horodatage</th>
                <th className="pb-2">Utilisateur</th>
                <th className="pb-2">Profil</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Objet</th>
                <th className="pb-2">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 text-xs text-slate-500">{dateTime(l.createdAt)}</td>
                  <td className="py-2 font-medium">{l.userName ?? "—"}</td>
                  <td className="py-2 text-xs text-slate-500">
                    {l.role ? (ROLE_LABELS[l.role as Role] ?? l.role) : "—"}
                  </td>
                  <td className="py-2">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {l.entity ? `${l.entity} #${l.entityId ?? "—"}` : "—"}
                  </td>
                  <td className="py-2 text-xs text-slate-600">{l.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
