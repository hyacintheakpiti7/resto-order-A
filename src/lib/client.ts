"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur serveur");
  return data as T;
}

export async function apiSend<T>(
  url: string,
  body: unknown,
  method: "POST" | "PUT" | "DELETE" = "POST",
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur serveur");
  return data as T;
}

/** Polling hook : synchronisation « temps réel » entre les services. */
export function useLive<T>(url: string, intervalMs = 4000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await apiGet<T>(url);
      if (mounted.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      if (mounted.current) setLoading(false);
      inFlight.current = false;
    }
  }, [url]);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stopPolling = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const startPolling = () => {
      if (document.hidden || timer) return;
      refresh();
      timer = setInterval(refresh, intervalMs);
    };
    const onVisibilityChange = () => {
      if (document.hidden) stopPolling();
      else startPolling();
    };
    const onFocus = () => {
      if (!document.hidden) refresh();
    };

    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, intervalMs]);

  return { data, error, loading, refresh };
}
