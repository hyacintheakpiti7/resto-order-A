"use client";
import type { ReportData } from "@/lib/reports";
import { useLive } from "@/lib/client";
export function useReports(period = "day", date?: string) { const params = new URLSearchParams({ period }); if (date) params.set("date", date); return useLive<{ report: ReportData }>(`/api/reports?${params.toString()}`, 30000); }
