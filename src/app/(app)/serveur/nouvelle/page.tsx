"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, Card, Field, Modal, Toast, inputClass } from "@/components/ui";
import { apiSend, useLive } from "@/lib/client";
import { money, toNumber } from "@/lib/format";

type Category = { id: number; name: string; active: boolean; position: number };
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
type Link = { dishId: number; supplementId: number };
type TableRow = { id: number; number: string; qrCode: string; seats: number; active: boolean };

type MenuPayload = {
  categories: Category[];
  dishes: Dish[];
  supplements: Supplement[];
  links: Link[];
  tables: TableRow[];
};

type CartLine = {
  uid: string;
  dish: Dish;
  quantity: number;
  supplementIds: number[];
  notes: string;
};

export default function NouvelleCommandePage() {
  const router = useRouter();
  const { data } = useLive<MenuPayload>("/api/menu", 30000);
  const [tableNumber, setTableNumber] = useState("");
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [editing, setEditing] = useState<CartLine | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const dishes = useMemo(
    () =>
      (data?.dishes ?? []).filter(
        (d) => d.available && (activeCat === "all" || d.categoryId === activeCat),
      ),
    [data, activeCat],
  );

  const supplementsFor = (dishId: number) => {
    const ids = (data?.links ?? []).filter((l) => l.dishId === dishId).map((l) => l.supplementId);
    return (data?.supplements ?? []).filter((s) => s.active && ids.includes(s.id));
  };

  const lineTotal = (line: CartLine) => {
    const sup = line.supplementIds.reduce(
      (sum, id) => sum + toNumber((data?.supplements ?? []).find((s) => s.id === id)?.price),
      0,
    );
    return (toNumber(line.dish.price) + sup) * line.quantity;
  };

  const subtotal = cart.reduce((sum, l) => sum + lineTotal(l), 0);

  function addDish(dish: Dish) {
    setCart((prev) => [
      ...prev,
      {
        uid: `${dish.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        dish,
        quantity: 1,
        supplementIds: [],
        notes: "",
      },
    ]);
  }

  function updateLine(uid: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
    setEditing((prev) => (prev && prev.uid === uid ? { ...prev, ...patch } : prev));
  }

  async function submit() {
    setError("");
    if (!tableNumber) return setError("Sélectionnez une table (numéro ou QR code)");
    if (cart.length === 0) return setError("Ajoutez au moins un plat à la commande");
    setSaving(true);
    try {
      const res = await apiSend<{ id: number; reference: string }>("/api/orders", {
        tableNumber,
        guests,
        notes,
        items: cart.map((l) => ({
          dishId: l.dish.id,
          quantity: l.quantity,
          notes: l.notes,
          supplementIds: l.supplementIds,
        })),
      });
      router.push(`/commandes/${res.id}?created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
      <div className="space-y-4">
        <Card title="1 · Informations de table">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Table / QR Code">
              <select
                className={inputClass}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              >
                <option value="">— Sélectionner —</option>
                {(data?.tables ?? [])
                  .filter((t) => t.active)
                  .map((t) => (
                    <option key={t.id} value={t.number}>
                      Table {t.number} ({t.seats} places) · {t.qrCode}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Nombre de clients">
              <input
                type="number"
                min={1}
                max={40}
                className={inputClass}
                value={guests}
                onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
              />
            </Field>
            <Field label="Observations particulières">
              <input
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Allergies, sans piment…"
              />
            </Field>
          </div>
        </Card>

        <Card title="2 · Sélection des plats">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCat("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeCat === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tout le menu
            </button>
            {(data?.categories ?? [])
              .filter((c) => c.active)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeCat === c.id
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dishes.map((d) => (
              <button
                key={d.id}
                onClick={() => addDish(d)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl">{d.emoji ?? "🍽️"}</span>
                  <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                    {money(d.price)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-800">{d.name}</p>
                <p className="line-clamp-2 text-xs text-slate-500">{d.description}</p>
              </button>
            ))}
            {dishes.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-slate-400">
                Aucun plat disponible dans cette catégorie.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <Card title="3 · Récapitulatif" subtitle={`${cart.length} article(s)`}>
          <div className="space-y-3">
            {cart.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Touchez un plat pour l&apos;ajouter à la commande.
              </p>
            )}
            {cart.map((line) => (
              <div key={line.uid} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {line.dish.emoji} {line.dish.name}
                    </p>
                    {line.supplementIds.length > 0 && (
                      <p className="text-[11px] text-amber-700">
                        +{" "}
                        {line.supplementIds
                          .map(
                            (id) => (data?.supplements ?? []).find((s) => s.id === id)?.name ?? "",
                          )
                          .join(", ")}
                      </p>
                    )}
                    {line.notes && (
                      <p className="text-[11px] italic text-slate-500">« {line.notes} »</p>
                    )}
                  </div>
                  <button
                    onClick={() => setCart((prev) => prev.filter((l) => l.uid !== line.uid))}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    retirer
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateLine(line.uid, { quantity: Math.max(1, line.quantity - 1) })
                      }
                      className="h-7 w-7 rounded-lg bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{line.quantity}</span>
                    <button
                      onClick={() => updateLine(line.uid, { quantity: line.quantity + 1 })}
                      className="h-7 w-7 rounded-lg bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setEditing(line)}
                      className="ml-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      Suppléments
                    </button>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{money(lineTotal(line))}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Sous-total</span>
              <span>{money(subtotal)}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Les taxes et le service sont calculés automatiquement à la validation caisse.
            </p>
          </div>

          {error && (
            <div className="mt-3">
              <Toast message={error} tone="error" />
            </div>
          )}

          <Button className="mt-4 w-full" onClick={submit} disabled={saving}>
            {saving ? "Envoi…" : "📤 Envoyer à la caisse"}
          </Button>
        </Card>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Suppléments — ${editing.dish.name}` : ""}
      >
        {editing && (
          <div className="space-y-3">
            {supplementsFor(editing.dish.id).length === 0 && (
              <p className="text-sm text-slate-500">Aucun supplément disponible pour ce plat.</p>
            )}
            {supplementsFor(editing.dish.id).map((s) => {
              const checked = editing.supplementIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                    checked ? "border-amber-400 bg-amber-50" : "border-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        updateLine(editing.uid, {
                          supplementIds: e.target.checked
                            ? [...editing.supplementIds, s.id]
                            : editing.supplementIds.filter((id) => id !== s.id),
                        })
                      }
                      className="h-4 w-4 accent-amber-500"
                    />
                    {s.name}
                  </span>
                  <span className="text-sm font-semibold text-amber-700">+{money(s.price)}</span>
                </label>
              );
            })}
            <Field label="Observation sur cet article">
              <input
                className={inputClass}
                value={editing.notes}
                onChange={(e) => updateLine(editing.uid, { notes: e.target.value })}
                placeholder="Cuisson à point, sans oignon…"
              />
            </Field>
            <Button className="w-full" onClick={() => setEditing(null)}>
              Valider
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
