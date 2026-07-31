"use client";
import type { DashboardPayload } from "@/components/dashboard/types";
import { useLive } from "@/lib/client";
export type DashboardPeriod = "today" | "week" | "month";
export function useDashboard(period: DashboardPeriod) { return useLive<DashboardPayload>(`/api/dashboard?period=${period}`, 6000); }
