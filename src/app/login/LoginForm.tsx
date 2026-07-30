"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";
import { ROLE_HOME, type Role } from "@/lib/constants";

const REMEMBERED_IDENTIFIER = "suya-food-remembered-identifier";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ closed = false }: { closed?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      <path d="M2.5 12s3.2-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.2 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.5" />
      {closed && <path d="M4 4 20 20" />}
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-[#F4C430] text-2xl shadow-[0_10px_28px_rgba(244,196,48,0.22)]">
      <span className="relative z-10 -rotate-12">🍢</span>
      <span className="absolute -bottom-3 -left-3 h-7 w-7 rounded-full bg-orange-500/80 blur-sm" />
    </span>
  );
}

function GrillIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-12 h-72 w-full max-w-[490px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0c0b] shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_90%,rgba(244,104,18,0.52),transparent_34%),radial-gradient(circle_at_86%_22%,rgba(244,196,48,0.16),transparent_24%),linear-gradient(160deg,#242019_0%,#0b0b0b_72%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[repeating-linear-gradient(105deg,transparent_0px,transparent_17px,rgba(244,196,48,0.18)_18px,transparent_20px)] opacity-70" />
      <div className="absolute bottom-5 left-1/2 h-2 w-[104%] -translate-x-1/2 rounded-full bg-orange-500/30 blur-md" />
      <div className="absolute left-[12%] top-[35%] h-1.5 w-[76%] -rotate-[10deg] rounded-full bg-[#b6a38c] shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
      <div className="absolute left-[9%] top-[56%] h-1.5 w-[80%] rotate-[6deg] rounded-full bg-[#b6a38c] shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
      {["left-[20%] top-[27%]", "left-[34%] top-[31%]", "left-[48%] top-[34%]", "left-[62%] top-[38%]", "left-[72%] top-[41%]", "left-[20%] top-[48%]", "left-[34%] top-[50%]", "left-[48%] top-[51%]", "left-[62%] top-[53%]", "left-[76%] top-[55%]"].map((position, index) => (
        <span key={position} className={`absolute h-8 w-9 rounded-[45%] border border-amber-400/35 bg-gradient-to-br from-[#d9712c] via-[#8b3d1a] to-[#3f1a11] shadow-[0_8px_12px_rgba(0,0,0,0.5)] ${position} ${index > 4 ? "rotate-6" : "-rotate-12"}`} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25" />
      <div className="absolute bottom-5 left-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200/75">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F4C430] shadow-[0_0_12px_3px_rgba(244,196,48,0.6)]" />
        Grillades au feu de braise
      </div>
    </div>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedIdentifier = window.localStorage.getItem(REMEMBERED_IDENTIFIER);
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
      setRemember(true);
    }
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identifier.trim() || !password) return;

    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await apiSend<{ user: { role: Role } }>("/api/auth/login", {
        code: identifier,
        password,
      });
      if (remember) window.localStorage.setItem(REMEMBERED_IDENTIFIER, identifier.trim());
      else window.localStorage.removeItem(REMEMBERED_IDENTIFIER);
      setSuccess(true);
      window.setTimeout(() => {
        router.push(ROLE_HOME[res.user.role]);
        router.refresh();
      }, 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adresse e-mail ou mot de passe incorrect.");
      setLoading(false);
    }
  }

  const isDisabled = loading || !identifier.trim() || !password;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#121212,#1E1E1E)] text-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(470px,0.9fr)]">
      <section className="relative hidden min-h-screen overflow-hidden px-10 py-10 lg:flex lg:flex-col xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_13%,rgba(244,196,48,0.13),transparent_22%),radial-gradient(circle_at_78%_82%,rgba(188,66,13,0.2),transparent_35%)]" />
        <div className="relative flex items-center gap-3 animate-[suya-logo_700ms_ease-out_both]">
          <BrandMark />
          <div>
            <p className="text-lg font-black tracking-tight">SUYA <span className="font-medium text-[#F4C430]">Food</span></p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Restaurant POS</p>
          </div>
        </div>
        <div className="relative my-auto max-w-[560px] pb-5">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-[#F4C430]">Le service, sans attendre</p>
          <h1 className="max-w-md text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">Le goût authentique,<br /><span className="text-white/60">servi rapidement.</span></h1>
          <GrillIllustration />
        </div>
        <p className="relative text-xs text-white/35">Votre espace de travail sécurisé.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
        <div className="w-full max-w-[420px] animate-[suya-card_550ms_cubic-bezier(.2,.7,.2,1)_both] rounded-[20px] border border-white/[0.07] bg-[#1E1E1E] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div>
              <p className="font-black tracking-tight">SUYA <span className="font-medium text-[#F4C430]">Food</span></p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Restaurant POS</p>
            </div>
          </div>
          <header>
            <h2 className="text-[28px] font-semibold tracking-tight">Bienvenue <span aria-hidden="true">👋</span></h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Connectez-vous pour accéder à votre espace.</p>
          </header>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Adresse e-mail</span>
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-white/35"><MailIcon /></span>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  disabled={loading}
                  placeholder="vous@suyafood.com"
                  autoComplete="username"
                  className="h-[52px] w-full rounded-xl border border-white/[0.07] bg-[#252525] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </span>
              <span className="mt-2 block text-xs text-white/35">Ou votre identifiant personnel (ex. ADM-01).</span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Mot de passe</span>
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-white/35"><LockIcon /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  className="h-[52px] w-full rounded-xl border border-white/[0.07] bg-[#252525] py-3 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={loading} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-white/40 transition hover:text-[#F4C430] disabled:cursor-not-allowed">
                  <EyeIcon closed={!showPassword} />
                </button>
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 pt-0.5 text-sm text-white/55">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={loading} className="h-4 w-4 cursor-pointer accent-[#F4C430] disabled:cursor-not-allowed" />
              Se souvenir de moi
            </label>

            {error && <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-200"><span aria-hidden="true">✕</span><span>{error}</span></div>}
            {success && <div role="status" className="flex items-center gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-200"><span aria-hidden="true">✓</span><span>Connexion réussie.</span></div>}

            <button type="submit" disabled={isDisabled} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#F4C430] px-4 text-sm font-bold text-[#121212] transition duration-200 hover:bg-[#D9A404] hover:shadow-[0_8px_24px_rgba(244,196,48,0.18)] disabled:cursor-not-allowed disabled:bg-[#F4C430]/35 disabled:text-[#121212]/55">
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#121212]/25 border-t-[#121212]" />}
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
          <footer className="mt-8 flex items-center justify-between border-t border-white/[0.07] pt-5 text-xs text-white/35"><span>© 2026 SUYA Food</span><span>Version 1.0</span></footer>
        </div>
      </section>
      <style jsx global>{`
        @keyframes suya-card { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes suya-logo { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </main>
  );
}
