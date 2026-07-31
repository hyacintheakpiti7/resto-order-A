"use client";
import type { InputHTMLAttributes } from "react";
import { inputClass } from "./form";
export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) { return <label className="relative block"><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">⌕</span><input {...props} type="search" className={`${inputClass} pl-9 ${props.className ?? ""}`} /></label>; }
