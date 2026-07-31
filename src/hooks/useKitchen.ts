"use client";
import type { OrderDTO } from "@/lib/orders";
import { useLive } from "@/lib/client";
export type Cook = { id: number; fullName: string; code: string; active: boolean };
export function useKitchen() { const orders = useLive<{ orders: OrderDTO[] }>("/api/orders?status=validee,assignee,en_preparation,prete&limit=100", 3500); const cooks = useLive<{ users: Cook[] }>("/api/users?role=cuisinier", 30000); return { ...orders, cooks: cooks.data?.users ?? [], cooksLoading: cooks.loading, refreshCooks: cooks.refresh }; }
