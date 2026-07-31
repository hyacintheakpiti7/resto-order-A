export function EmptyState({ icon = "🗂️", text }: { icon?: string; text: string }) { return <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center"><span className="text-3xl">{icon}</span><p className="text-sm text-slate-500">{text}</p></div>; }
export const Empty = EmptyState;
