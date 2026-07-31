"use client";
export function RetryButton({ onRetry, children = "Réessayer" }: { onRetry: () => void; children?: string }) { return <button onClick={onRetry} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">↻ {children}</button>; }
