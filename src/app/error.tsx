"use client";
import { useEffect } from "react";
import { RetryButton } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-6"><section className="max-w-md rounded-3xl border border-rose-100 bg-white p-7 text-center shadow-sm"><p className="text-3xl">⚠️</p><h1 className="mt-3 text-xl font-bold text-slate-900">Une erreur est survenue</h1><p className="mt-2 text-sm text-slate-500">Vos données ne sont pas perdues. Réessayez ou revenez dans quelques instants.</p><div className="mt-5"><RetryButton onRetry={reset} /></div></section></main>;
}
