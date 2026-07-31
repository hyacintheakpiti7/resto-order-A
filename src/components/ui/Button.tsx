"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANTS = { primary: "bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300", success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300", danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300", ghost: "bg-slate-100 text-slate-700 hover:bg-slate-200", outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" };
export function Button({ children, variant = "primary", size = "md", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: keyof typeof VARIANTS; size?: "sm" | "md" }) { return <button {...props} className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed ${size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"} ${VARIANTS[variant]} ${className}`}>{children}</button>; }
