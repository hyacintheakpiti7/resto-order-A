import Link from "next/link";

const SHORTCUTS = [
  { href: "/serveur/nouvelle", icon: "➕", label: "Nouvelle commande" }, { href: "/admin/menu", icon: "🍽️", label: "Menu" }, { href: "/caisse", icon: "💳", label: "Caisse" }, { href: "/admin/rapports", icon: "📊", label: "Rapports" }, { href: "/admin/utilisateurs", icon: "👥", label: "Utilisateurs" }, { href: "/admin/parametres", icon: "⚙️", label: "Paramètres" },
] as const;

export function DashboardQuickActions() {
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Raccourcis</h2><p className="mt-1 text-sm text-slate-500">Accédez rapidement à l’essentiel.</p><div className="mt-5 grid grid-cols-2 gap-2.5">{SHORTCUTS.map((shortcut) => <Link key={shortcut.label} href={shortcut.href} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-center transition hover:border-amber-200 hover:bg-amber-50"><span className="block text-xl">{shortcut.icon}</span><span className="mt-1.5 block text-xs font-bold text-slate-700">{shortcut.label}</span></Link>)}</div></article>;
}
