import { handleError, ok, toCsv } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { computeReport, rangeForPeriod } from "@/lib/reports";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    await requireUser(["admin", "caissier"]);
    const params = new URL(request.url).searchParams;
    const period = params.get("period") ?? "day";
    const dateParam = params.get("date");
    const reference = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date();
    const { from, to, label } = rangeForPeriod(period, reference);

    let range = { from, to, label };
    if (params.get("from") && params.get("to")) {
      range = {
        from: new Date(`${params.get("from")}T00:00:00`),
        to: new Date(`${params.get("to")}T23:59:59`),
        label: "Personnalisé",
      };
    }

    const report = await computeReport(range.from, range.to, range.label);
    report.byPaymentMethod = report.byPaymentMethod.map((m) => ({
      ...m,
      label: PAYMENT_LABELS[m.key as PaymentMethod] ?? m.key,
    }));

    if (params.get("format") === "csv") {
      const rows: Record<string, unknown>[] = [
        { Section: "Période", Libellé: report.range.label, Valeur1: report.range.from, Valeur2: report.range.to },
        { Section: "Synthèse", Libellé: "Nombre total de commandes", Valeur1: report.totals.orders, Valeur2: "" },
        { Section: "Synthèse", Libellé: "Commandes payées", Valeur1: report.totals.paidOrders, Valeur2: "" },
        { Section: "Synthèse", Libellé: "Commandes annulées", Valeur1: report.totals.cancelledOrders, Valeur2: "" },
        { Section: "Synthèse", Libellé: "Commandes en attente", Valeur1: report.totals.pendingOrders, Valeur2: "" },
        { Section: "Synthèse", Libellé: "Chiffre d'affaires", Valeur1: report.totals.revenue, Valeur2: "" },
        { Section: "Synthèse", Libellé: "Montant encaissé", Valeur1: report.totals.cashed, Valeur2: "" },
        { Section: "Synthèse", Libellé: "Ticket moyen", Valeur1: report.totals.averageTicket, Valeur2: "" },
        ...report.byServer.map((s) => ({ Section: "Ventes par serveur", Libellé: s.label, Valeur1: s.orders, Valeur2: s.revenue })),
        ...report.byCook.map((c) => ({ Section: "Production par cuisinier", Libellé: c.label, Valeur1: c.orders, Valeur2: c.avgPrep })),
        ...report.byDish.map((d) => ({ Section: "Ventes par plat", Libellé: d.label, Valeur1: d.quantity, Valeur2: d.revenue })),
        ...report.byCategory.map((c) => ({ Section: "Ventes par catégorie", Libellé: c.label, Valeur1: c.quantity, Valeur2: c.revenue })),
        ...report.byPaymentMethod.map((p) => ({ Section: "Règlements", Libellé: p.label, Valeur1: p.count, Valeur2: p.amount })),
      ];
      const csv = toCsv(rows, ["Section", "Libellé", "Valeur1", "Valeur2"]);
      const fileExt = params.get("excel") === "1" ? "xls" : "csv";
      return new Response(`\ufeff${csv}`, {
        headers: {
          "Content-Type":
            fileExt === "xls" ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="rapport-${period}-${Date.now()}.${fileExt}"`,
        },
      });
    }

    return ok({ report });
  } catch (error) {
    return handleError(error);
  }
}

export const dynamic = "force-dynamic";
