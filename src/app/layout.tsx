import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RestoFlow — Gestion intelligente des commandes",
  description:
    "Application web de gestion des commandes de restaurant : prise de commande, caisse, cuisine, service et comptabilité.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
