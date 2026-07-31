"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { apiSend } from "@/lib/client";
import { useNotifications, type NotificationRow } from "@/hooks/useNotifications";
import { clock } from "@/lib/format";
import { OfflineBanner } from "@/components/ui";

type NavItem = { href: string; label: string; icon: string; roles: Role[] };

const NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: "📊", roles: ["admin", "caissier", "chef"] },
  { href: "/serveur", label: "Mes commandes", icon: "🧾", roles: ["serveur"] },
  { href: "/serveur/nouvelle", label: "Nouvelle commande", icon: "➕", roles: ["serveur"] },
  { href: "/caisse", label: "Caisse", icon: "💳", roles: ["caissier", "admin"] },
  { href: "/caisse/cloture", label: "Clôture & comptabilité", icon: "🧮", roles: ["caissier", "admin"] },
  { href: "/cuisine", label: "Pilotage cuisine", icon: "👨‍🍳", roles: ["chef", "admin"] },
  { href: "/preparation", label: "Mes préparations", icon: "🔥", roles: ["cuisinier"] },
  { href: "/commandes", label: "Suivi & traçabilité", icon: "🔍", roles: ["admin", "caissier", "chef", "serveur", "cuisinier"] },
  { href: "/admin/rapports", label: "Rapports comptables", icon: "📈", roles: ["admin", "caissier"] },
  { href: "/admin/menu", label: "Gestion des menus", icon: "🍽️", roles: ["admin"] },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "👥", roles: ["admin"] },
  { href: "/admin/parametres", label: "Paramètres", icon: "⚙️", roles: ["admin"] },
  { href: "/admin/journal", label: "Journal d'audit", icon: "🛡️", roles: ["admin"] },
];

export default function AppShell({
  user,
  restaurantName,
  children,
}: {
  user: { id: number; fullName: string; role: Role; code: string };
  restaurantName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const { data, refresh } = useNotifications();
  const unread = data?.unread ?? 0;
  const knownNotificationIds = useRef<Set<number> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  function getAudioContext() {
    if (!audioContext.current) audioContext.current = new AudioContext();
    return audioContext.current;
  }

  function playNotificationSound() {
    const context = getAudioContext();
    const end = context.currentTime + 5;
    for (let time = context.currentTime; time < end; time += 0.55) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = time % 1.1 < 0.1 ? 990 : 740;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(0.07, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.24);
    }
  }

  useEffect(() => {
    setOpen(false);
    setPanel(false);
    setProfileMenu(false);
  }, [pathname]);

  useEffect(() => {
    const unlockAudio = () => {
      const context = getAudioContext();
      void context.resume();
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, []);

  useEffect(() => {
    const notifications = data?.notifications ?? [];
    const ids = new Set(notifications.map((notification) => notification.id));
    if (!knownNotificationIds.current) {
      knownNotificationIds.current = ids;
      return;
    }
    const freshUnread = notifications.some(
      (notification) => !notification.readAt && !knownNotificationIds.current?.has(notification.id),
    );
    knownNotificationIds.current = ids;
    if (freshUnread) {
      try {
        playNotificationSound();
      } catch {
        // L'audio reste soumis à la politique d'interaction du navigateur.
      }
    }
  }, [data]);

  const items = NAV.filter((item) => item.roles.includes(user.role));

  async function logout() {
    if (!window.confirm("Voulez-vous vraiment vous déconnecter ?")) return;
    await apiSend("/api/auth/logout", {});
    router.push("/login");
    router.refresh();
  }

  async function markAll() {
    await apiSend("/api/notifications", {});
    refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:pl-72">
      <OfflineBanner />
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 h-screen w-72 transform bg-slate-900 text-slate-200 transition-transform lg:fixed lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-5">
          <span className="text-2xl">🍽️</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{restaurantName}</p>
            <p className="text-[11px] uppercase tracking-wider text-amber-400">RestoFlow</p>
          </div>
        </div>
        <nav className="space-y-1 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 9rem)" }}>
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-amber-500 text-white shadow"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-800 p-4">
          <p className="text-sm font-semibold text-white">{user.fullName}</p>
          <p className="text-xs text-slate-400">
            {ROLE_LABELS[user.role]} • {user.code}
          </p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-rose-600 hover:text-white"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Menu"
          >
            ☰
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {items.find((i) => i.href === pathname)?.label ?? "RestoFlow"}
            </p>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setPanel((v) => !v)}
              className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-lg shadow-sm transition hover:bg-slate-50"
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            {panel && (
              <div className="absolute right-0 top-14 z-40 w-[min(24rem,90vw)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">Notifications</p>
                  <button
                    onClick={markAll}
                    className="text-xs font-semibold text-amber-600 hover:underline"
                  >
                    Tout marquer lu
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {(data?.notifications ?? []).length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">
                      Aucune notification
                    </p>
                  )}
                  {(data?.notifications ?? []).map((n) => (
                    <div
                      key={n.id}
                      className={`border-b border-slate-100 px-4 py-3 ${
                        n.readAt ? "bg-white" : "bg-amber-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {clock(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setProfileMenu((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition hover:bg-slate-50"
              aria-label="Menu utilisateur"
              aria-expanded={profileMenu}
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-[10px] font-bold text-amber-300">
                {user.fullName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
              </span>
              <span className="hidden max-w-28 truncate text-xs font-semibold text-slate-700 sm:block">{user.fullName}</span>
              <span className="hidden text-slate-400 sm:block">⌄</span>
            </button>
            {profileMenu && (
              <div className="absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-slate-800">{user.fullName}</p>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]} · {user.code}</p>
                </div>
                {user.role === "admin" && (
                  <Link href="/admin/parametres" className="mt-1 block rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                    ⚙️ Paramètres
                  </Link>
                )}
                <button onClick={logout} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
