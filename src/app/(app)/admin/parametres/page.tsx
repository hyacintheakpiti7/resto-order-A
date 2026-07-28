"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Toast, inputClass } from "@/components/ui";
import { apiGet, apiSend } from "@/lib/client";

type SettingsRow = {
  restaurantName: string;
  currency: string;
  taxRate: string;
  serviceRate: string;
  address: string | null;
  phone: string | null;
  openingHours: string | null;
  receiptFooter: string | null;
  cashierCanEditOrders: boolean;
};

export default function ParametresPage() {
  const [form, setForm] = useState<SettingsRow | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ settings: SettingsRow }>("/api/settings").then((res) => setForm(res.settings));
  }, []);

  async function save() {
    if (!form) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await apiSend("/api/settings", form, "PUT");
      setMsg("Paramètres enregistrés.");
      setTimeout(() => setMsg(""), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (!form) return <p className="text-sm text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      {msg && <Toast message={msg} tone="success" />}
      {error && <Toast message={error} tone="error" />}

      <Card title="Paramètres du restaurant" subtitle="Devise, taxes, horaires et identité">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du restaurant">
            <input
              className={inputClass}
              value={form.restaurantName}
              onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
            />
          </Field>
          <Field label="Devise">
            <input
              className={inputClass}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </Field>
          <Field label="Taux de taxe (%)">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.taxRate}
              onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
            />
          </Field>
          <Field label="Frais de service (%)">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.serviceRate}
              onChange={(e) => setForm({ ...form, serviceRate: e.target.value })}
            />
          </Field>
          <Field label="Adresse">
            <input
              className={inputClass}
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <Field label="Téléphone">
            <input
              className={inputClass}
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Horaires d'ouverture">
            <input
              className={inputClass}
              value={form.openingHours ?? ""}
              onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
            />
          </Field>
          <Field label="Pied de page des reçus">
            <input
              className={inputClass}
              value={form.receiptFooter ?? ""}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
            />
          </Field>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-amber-500"
            checked={form.cashierCanEditOrders}
            onChange={(e) => setForm({ ...form, cashierCanEditOrders: e.target.checked })}
          />
          Autoriser la caisse à modifier les articles d&apos;une commande avant validation
        </label>

        <Button className="mt-4" onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "💾 Enregistrer les paramètres"}
        </Button>
      </Card>

      <Card title="Sauvegarde & restauration" subtitle="Export des données d'exploitation">
        <p className="text-sm text-slate-600">
          Les données de vente et la comptabilité peuvent être exportées à tout moment aux formats
          CSV et Excel depuis le module de rapports. La suppression des commandes est volontairement
          désactivée afin de garantir une traçabilité intégrale.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/reports?period=year&format=csv">
            <Button variant="outline" size="sm">
              ⬇️ Export annuel CSV
            </Button>
          </a>
          <a href="/api/reports?period=month&format=csv&excel=1">
            <Button variant="outline" size="sm">
              ⬇️ Export mensuel Excel
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
