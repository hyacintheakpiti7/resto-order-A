"use client";

import { useState } from "react";
import { Button, Card, Empty, Field, Modal, Toast, inputClass } from "@/components/ui";
import { apiSend, useLive } from "@/lib/client";
import { money } from "@/lib/format";

type Category = { id: number; name: string; description: string | null; position: number; active: boolean };
type Dish = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: string;
  available: boolean;
  emoji: string | null;
};
type Supplement = { id: number; name: string; price: string; active: boolean };
type LinkRow = { dishId: number; supplementId: number };
type TableRow = { id: number; number: string; qrCode: string; seats: number; active: boolean };

type MenuPayload = {
  categories: Category[];
  dishes: Dish[];
  supplements: Supplement[];
  links: LinkRow[];
  tables: TableRow[];
};

type DishForm = {
  id?: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  emoji: string;
  available: boolean;
  supplementIds: number[];
};

const emptyDish = (categoryId: number): DishForm => ({
  categoryId,
  name: "",
  description: "",
  price: 0,
  emoji: "🍽️",
  available: true,
  supplementIds: [],
});

export default function MenuAdminPage() {
  const { data, refresh } = useLive<MenuPayload>("/api/menu", 20000);
  const [tab, setTab] = useState<"plats" | "categories" | "supplements" | "tables">("plats");
  const [dishForm, setDishForm] = useState<DishForm | null>(null);
  const [catForm, setCatForm] = useState<Partial<Category> | null>(null);
  const [supForm, setSupForm] = useState<Partial<Supplement> | null>(null);
  const [tableForm, setTableForm] = useState<{ number: string; seats: number } | null>(null);
  const [error, setError] = useState("");

  const categories = data?.categories ?? [];
  const dishes = data?.dishes ?? [];
  const supplements = data?.supplements ?? [];

  async function send(entity: string, action: string, payload: Record<string, unknown>) {
    setError("");
    try {
      await apiSend("/api/menu", { entity, action, data: payload });
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      return false;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["plats", "categories", "supplements", "tables"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${
              tab === t ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t === "plats" ? "Plats" : t === "categories" ? "Catégories" : t === "supplements" ? "Suppléments" : "Tables & QR"}
          </button>
        ))}
      </div>

      {error && <Toast message={error} tone="error" />}

      {tab === "plats" && (
        <Card
          title="Carte du restaurant"
          subtitle={`${dishes.length} plat(s)`}
          action={
            <Button
              size="sm"
              onClick={() => setDishForm(emptyDish(categories[0]?.id ?? 0))}
              disabled={categories.length === 0}
            >
              ➕ Nouveau plat
            </Button>
          }
        >
          {dishes.length === 0 ? (
            <Empty text="Aucun plat enregistré." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dishes.map((d) => (
                <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl">{d.emoji}</span>
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                      {money(d.price)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{d.name}</p>
                  <p className="text-xs text-slate-500">
                    {categories.find((c) => c.id === d.categoryId)?.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{d.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDishForm({
                          id: d.id,
                          categoryId: d.categoryId,
                          name: d.name,
                          description: d.description ?? "",
                          price: Number(d.price),
                          emoji: d.emoji ?? "🍽️",
                          available: d.available,
                          supplementIds: (data?.links ?? [])
                            .filter((l) => l.dishId === d.id)
                            .map((l) => l.supplementId),
                        })
                      }
                    >
                      Modifier
                    </Button>
                    <button
                      onClick={() => send("dish", "toggle", { id: d.id, available: !d.available })}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                        d.available
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      {d.available ? "Disponible" : "Indisponible"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "categories" && (
        <Card
          title="Catégories de produits"
          action={
            <Button size="sm" onClick={() => setCatForm({ name: "", description: "", position: categories.length + 1 })}>
              ➕ Nouvelle catégorie
            </Button>
          }
        >
          <div className="space-y-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {c.position}. {c.name}{" "}
                    {!c.active && <span className="text-xs text-rose-500">(désactivée)</span>}
                  </p>
                  <p className="text-xs text-slate-500">{c.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCatForm(c)}>
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => send("category", "update", { ...c, active: !c.active })}
                  >
                    {c.active ? "Désactiver" : "Activer"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "supplements" && (
        <Card
          title="Suppléments"
          action={
            <Button size="sm" onClick={() => setSupForm({ name: "", price: "0" })}>
              ➕ Nouveau supplément
            </Button>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {supplements.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                  <p className="text-xs text-amber-700">{money(s.price)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSupForm(s)}>
                  Modifier
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "tables" && (
        <Card
          title="Tables & QR Codes"
          action={
            <Button size="sm" onClick={() => setTableForm({ number: "", seats: 4 })}>
              ➕ Nouvelle table
            </Button>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.tables ?? []).map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-lg font-bold text-slate-800">Table {t.number}</p>
                <p className="text-xs text-slate-500">{t.seats} places</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">{t.qrCode}</p>
                <button
                  onClick={() => send("table", "toggle", { id: t.id, active: !t.active })}
                  className={`mt-2 w-full rounded-lg px-2 py-1 text-xs font-semibold ${
                    t.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {t.active ? "Active" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal plat */}
      <Modal
        open={Boolean(dishForm)}
        onClose={() => setDishForm(null)}
        title={dishForm?.id ? "Modifier le plat" : "Nouveau plat"}
        wide
      >
        {dishForm && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom du plat">
                <input
                  className={inputClass}
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                />
              </Field>
              <Field label="Catégorie">
                <select
                  className={inputClass}
                  value={dishForm.categoryId}
                  onChange={(e) => setDishForm({ ...dishForm, categoryId: Number(e.target.value) })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prix">
                <input
                  type="number"
                  className={inputClass}
                  value={dishForm.price}
                  onChange={(e) => setDishForm({ ...dishForm, price: Number(e.target.value) })}
                />
              </Field>
              <Field label="Emoji / visuel">
                <input
                  className={inputClass}
                  value={dishForm.emoji}
                  onChange={(e) => setDishForm({ ...dishForm, emoji: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                className={inputClass}
                rows={2}
                value={dishForm.description}
                onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
              />
            </Field>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Suppléments disponibles
              </p>
              <div className="flex flex-wrap gap-2">
                {supplements.map((s) => {
                  const on = dishForm.supplementIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() =>
                        setDishForm({
                          ...dishForm,
                          supplementIds: on
                            ? dishForm.supplementIds.filter((x) => x !== s.id)
                            : [...dishForm.supplementIds, s.id],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        on ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.name} (+{money(s.price)})
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={dishForm.available}
                onChange={(e) => setDishForm({ ...dishForm, available: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              Plat disponible à la vente
            </label>
            <Button
              className="w-full"
              onClick={async () => {
                const okDone = await send("dish", dishForm.id ? "update" : "create", { ...dishForm });
                if (okDone) setDishForm(null);
              }}
            >
              Enregistrer
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal catégorie */}
      <Modal
        open={Boolean(catForm)}
        onClose={() => setCatForm(null)}
        title={catForm?.id ? "Modifier la catégorie" : "Nouvelle catégorie"}
      >
        {catForm && (
          <div className="space-y-3">
            <Field label="Nom">
              <input
                className={inputClass}
                value={catForm.name ?? ""}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <input
                className={inputClass}
                value={catForm.description ?? ""}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              />
            </Field>
            <Field label="Position d'affichage">
              <input
                type="number"
                className={inputClass}
                value={catForm.position ?? 0}
                onChange={(e) => setCatForm({ ...catForm, position: Number(e.target.value) })}
              />
            </Field>
            <Button
              className="w-full"
              onClick={async () => {
                const okDone = await send("category", catForm.id ? "update" : "create", {
                  ...catForm,
                  active: catForm.active ?? true,
                });
                if (okDone) setCatForm(null);
              }}
            >
              Enregistrer
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal supplément */}
      <Modal
        open={Boolean(supForm)}
        onClose={() => setSupForm(null)}
        title={supForm?.id ? "Modifier le supplément" : "Nouveau supplément"}
      >
        {supForm && (
          <div className="space-y-3">
            <Field label="Nom">
              <input
                className={inputClass}
                value={supForm.name ?? ""}
                onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
              />
            </Field>
            <Field label="Prix">
              <input
                type="number"
                className={inputClass}
                value={Number(supForm.price ?? 0)}
                onChange={(e) => setSupForm({ ...supForm, price: e.target.value })}
              />
            </Field>
            <Button
              className="w-full"
              onClick={async () => {
                const okDone = await send("supplement", supForm.id ? "update" : "create", {
                  ...supForm,
                  active: supForm.active ?? true,
                });
                if (okDone) setSupForm(null);
              }}
            >
              Enregistrer
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal table */}
      <Modal open={Boolean(tableForm)} onClose={() => setTableForm(null)} title="Nouvelle table">
        {tableForm && (
          <div className="space-y-3">
            <Field label="Numéro de table">
              <input
                className={inputClass}
                value={tableForm.number}
                onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
                placeholder="T15"
              />
            </Field>
            <Field label="Nombre de places">
              <input
                type="number"
                className={inputClass}
                value={tableForm.seats}
                onChange={(e) => setTableForm({ ...tableForm, seats: Number(e.target.value) })}
              />
            </Field>
            <Button
              className="w-full"
              onClick={async () => {
                const okDone = await send("table", "create", { ...tableForm });
                if (okDone) setTableForm(null);
              }}
            >
              Créer la table
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
