import { handleError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { computeReport } from "@/lib/reports";
import { endOfDay, getSettings, listOrders, startOfDay } from "@/lib/orders";
import type { OrderStatus } from "@/lib/constants";

const LIVE_STATUSES: OrderStatus[] = [
  "en_attente_validation",
  "validee",
  "assignee",
  "en_preparation",
  "prete",
];

export async function GET() {
  try {
    await requireUser();
    const [report, live, config] = await Promise.all([
      computeReport(startOfDay(), endOfDay(), "Journalier"),
      listOrders({ statuses: LIVE_STATUSES, limit: 60 }),
      getSettings(),
    ]);
    return ok({ report, live, settings: config });
  } catch (error) {
    return handleError(error);
  }
}

export const dynamic = "force-dynamic";
