"use client";

import { useState } from "react";
import { Button, Card, Empty, Field, Modal, Toast, inputClass } from "@/components/ui";
import { apiSend, useLive } from "@/lib/client";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";
import { shortDate } from "@/lib/format";

type UserRow = {
  id: number;
  code: string;
  fullName: string;
  role: Role;
  phone: string | null;
  active: boolean;
  createdAt: string;
};

type Form = {
  id?: number;
  code: string;
  fullName: string;
  role: Role;
  phone: string;
  password: string;
  active: boolean;
};

const empty: Form = {
  code: "",
  fullName: "",
  role: "serveur",
  phone: "",
  password: "passer123",
  active: true,
};

export default function UtilisateursPage() {
  const { data, refresh } = useLive<{ users: UserRow[] }>("/api/users", 15000);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const users = data?.users ?? [];

  async function save() {
    if (!form) return;
    setError("");
    try {
      await apiSend("/api/users", { action: form.id ? "update" : "create", ...form });
      setForm(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function toggle(u: UserRow) {
    await apiSend("/api/users", { action: "toggle", id: u.id, active: !u.active });
    refresh();
  }

  return (
    <div className="space-y-4">
      {error && <Toast message={error} tone="error" />}
      <Card
        title="Gestion des utilisateurs"
        subtitle="Rôles, autorisations et identifiants personnels"
        action={
          <Button size="sm" onClick={() => setForm(empty)}>
            ➕ Nouvel utilisateur
          </Button>
        }
      >
        {users.length === 0 ? (
          <Empty text="Aucun utilisateur." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2">Identifiant</th>
                  <th className="pb-2">Nom complet</th>
                  <th className="pb-2">Profil</th>
                  <th className="pb-2">Téléphone</th>
                  <th className="pb-2">Créé le</th>
                  <th className="pb-2">Statut</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 font-mono text-xs font-semibold">{u.code}</td>
                    <td className="py-2.5 font-medium">{u.fullName}</td>
                    <td className="py-2.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-slate-500">{u.phone || "—"}</td>
                    <td className="py-2.5 text-xs text-slate-500">{shortDate(u.createdAt)}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => toggle(u)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          u.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {u.active ? "Actif" : "Désactivé"}
                      </button>
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setForm({
                            id: u.id,
                            code: u.code,
                            fullName: u.fullName,
                            role: u.role,
                            phone: u.phone ?? "",
                            password: "",
                            active: u.active,
                          })
                        }
                      >
                        Modifier
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Matrice des autorisations">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="text-left uppercase tracking-wide text-slate-400">
              <tr>
                <th className="pb-2">Fonctionnalité</th>
                {ROLES.map((r) => (
                  <th key={r} className="pb-2 text-center">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ["Prise de commande", ["serveur", "admin"]],
                ["Validation & encaissement", ["caissier", "admin"]],
                ["Attribution en cuisine", ["chef", "admin"]],
                ["Préparation des plats", ["cuisinier", "chef", "admin"]],
                ["Confirmation de livraison", ["serveur", "admin"]],
                ["Clôture de caisse", ["caissier", "admin"]],
                ["Rapports comptables", ["caissier", "admin"]],
                ["Gestion des menus", ["admin"]],
                ["Gestion des utilisateurs", ["admin"]],
                ["Journal d'audit", ["admin"]],
              ].map(([label, allowed]) => (
                <tr key={label as string}>
                  <td className="py-2 font-medium text-slate-700">{label as string}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="py-2 text-center">
                      {(allowed as string[]).includes(r) ? "✅" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
      >
        {form && (
          <div className="space-y-3">
            {!form.id && (
              <Field label="Identifiant personnel" hint="Ex : SRV-03, CUI-04">
                <input
                  className={inputClass}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </Field>
            )}
            <Field label="Nom complet">
              <input
                className={inputClass}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field label="Profil / rôle">
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Téléphone">
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field
              label="Mot de passe"
              hint={form.id ? "Laisser vide pour conserver le mot de passe actuel" : undefined}
            >
              <input
                className={inputClass}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Button className="w-full" onClick={save}>
              Enregistrer
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
