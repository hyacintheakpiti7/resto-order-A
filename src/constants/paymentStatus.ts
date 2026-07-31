export const PAYMENT_METHODS = ["especes", "carte", "mobile_money", "virement", "mixte"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { especes: "Espèces", carte: "Carte bancaire", mobile_money: "Mobile Money", virement: "Virement bancaire", mixte: "Paiement mixte" };
export const PAYMENT_STATUS = ["impaye", "partiel", "paye"] as const;
