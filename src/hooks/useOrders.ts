"use client";
import type { OrderDTO } from "@/lib/orders";
import { useLive } from "@/lib/client";
export function useOrders(query = "", intervalMs = 5000) { const suffix = query ? `?${query}` : ""; return useLive<{ orders: OrderDTO[] }>(`/api/orders${suffix}`, intervalMs); }
