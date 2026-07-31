import type { OrderDTO } from "@/lib/orders";
import type { ReportData } from "@/lib/reports";

export type DashboardPayload = {
  report: ReportData;
  live: OrderDTO[];
  settings: { currency: string; restaurantName: string };
  user: { fullName: string; role: string; code: string };
  kitchen: { preparing: number; ready: number; late: number; pending: number };
  tables: { occupied: number; total: number };
  alerts: { tone: "amber" | "rose"; title: string; message: string }[];
  series: { label: string; revenue: number; orders: number }[];
  activity: { id: number; action: string; entity: string | null; details: string | null; userName: string | null; createdAt: string }[];
};
