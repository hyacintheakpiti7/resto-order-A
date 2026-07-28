import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { handleError, ok } from "@/lib/api";
import { logAction, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/orders";

export async function GET() {
  try {
    await requireUser();
    return ok({ settings: await getSettings() });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser(["admin"]);
    const body = await request.json();
    await getSettings();
    await db
      .update(settings)
      .set({
        restaurantName: String(body.restaurantName ?? "Restaurant"),
        currency: String(body.currency ?? "FCFA"),
        taxRate: String(Number(body.taxRate ?? 0)),
        serviceRate: String(Number(body.serviceRate ?? 0)),
        address: String(body.address ?? ""),
        phone: String(body.phone ?? ""),
        openingHours: String(body.openingHours ?? ""),
        receiptFooter: String(body.receiptFooter ?? ""),
        cashierCanEditOrders: Boolean(body.cashierCanEditOrders),
      })
      .where(eq(settings.id, 1));
    await logAction(user, "modification_parametres", "settings", 1);
    return ok({ settings: await getSettings() });
  } catch (error) {
    return handleError(error);
  }
}
