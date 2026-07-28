"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend } from "@/lib/client";
import { ROLE_HOME, ROLE_LABELS, type Role } from "@/lib/constants";
import { Toast, inputClass } from "@/components/ui";

const DEMO: { code: string; role: Role; name: string }[] = [
  { code: "ADM-01", role: "admin", name: "Awa Diallo" },
  { code: "SRV-01", role: "serveur", name: "Koffi N'Guessan" },
  { code: "CAI-01", role: "caissier", name: "Yao Kouadio" },
  { code: "CHF-01", role: "chef", name: "Ibrahim Bakayoko" },
  { code: "CUI-01", role: "cuisinier", name: "Fatou Camara" },
];

export default function LoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("passer123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiSend<{ user: { role: Role } }>("/api/auth/login", { code, password });
      router.push(ROLE_HOME[res.user.role]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 lg:flex-row">
      <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-900/40 px-8 py-12 text-white lg:px-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300">
            🍽️ RestoFlow
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
            Gestion intelligente des commandes de restaurant
          </h1>
          <p className="mt-4 text-base text-slate-300">
            De la prise de commande par le serveur jusqu&apos;à la livraison au client : caisse,
            cuisine, notifications instantanées, traçabilité complète et comptabilité automatisée.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              ["🧾", "Prise de commande"],
              ["💳", "Validation caisse"],
              ["👨‍🍳", "Pilotage cuisine"],
              ["🔔", "Notifications"],
              ["🔍", "Traçabilité"],
              ["📈", "Comptabilité"],
            ].map(([icon, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium"
              >
                <span className="mr-2">{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-slate-100 px-6 py-12 lg:w-[30rem]">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-900">Connexion sécurisée</h2>
          <p className="mt-1 text-sm text-slate-500">
            Authentifiez-vous avec votre identifiant personnel.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Identifiant personnel
              </label>
              <input
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ex : SRV-01"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mot de passe
              </label>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <Toast message={error} tone="error" />}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:bg-amber-300"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Comptes de démonstration
            </p>
            <div className="mt-2 space-y-1.5">
              {DEMO.map((d) => (
                <button
                  key={d.code}
                  onClick={() => {
                    setCode(d.code);
                    setPassword("passer123");
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-amber-400 hover:bg-amber-50"
                >
                  <span className="font-medium text-slate-700">{ROLE_LABELS[d.role]}</span>
                  <span className="font-mono text-xs text-slate-500">{d.code}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Mot de passe commun : <span className="font-mono">passer123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
