import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Utilisateurs & sécurité                                             */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(), // identifiant personnel (ex: SRV-01)
    fullName: text("full_name").notNull(),
    role: text("role").notNull(), // admin | serveur | caissier | chef | cuisinier
    passwordHash: text("password_hash").notNull(),
    phone: text("phone"),
    active: boolean("active").notNull().default(true),
    permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_code_unique").on(table.code)],
);

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userName: text("user_name"),
  role: text("role"),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Paramètres du restaurant                                            */
/* ------------------------------------------------------------------ */

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  restaurantName: text("restaurant_name").notNull().default("Restaurant Le Gourmet"),
  currency: text("currency").notNull().default("FCFA"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  serviceRate: numeric("service_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  address: text("address").default(""),
  phone: text("phone").default(""),
  openingHours: text("opening_hours").default("08:00 - 23:00"),
  receiptFooter: text("receipt_footer").default("Merci de votre visite !"),
  cashierCanEditOrders: boolean("cashier_can_edit_orders").notNull().default(true),
});

/* ------------------------------------------------------------------ */
/* Menus                                                               */
/* ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const dishes = pgTable("dishes", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  available: boolean("available").notNull().default(true),
  emoji: text("emoji").default("🍽️"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supplements = pgTable("supplements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
});

export const dishSupplements = pgTable("dish_supplements", {
  id: serial("id").primaryKey(),
  dishId: integer("dish_id").notNull(),
  supplementId: integer("supplement_id").notNull(),
});

export const restaurantTables = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  qrCode: text("qr_code").notNull(),
  seats: integer("seats").notNull().default(4),
  active: boolean("active").notNull().default(true),
});

/* ------------------------------------------------------------------ */
/* Commandes                                                           */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    reference: text("reference").notNull(),
    tableNumber: text("table_number").notNull(),
    guests: integer("guests").notNull().default(1),
    status: text("status").notNull().default("en_attente_validation"),
    priority: text("priority").notNull().default("normale"), // basse | normale | haute | urgente
    notes: text("notes").default(""),

    serverId: integer("server_id"),
    serverName: text("server_name"),
    cashierId: integer("cashier_id"),
    cashierName: text("cashier_name"),
    chefId: integer("chef_id"),
    chefName: text("chef_name"),
    cookId: integer("cook_id"),
    cookName: text("cook_name"),

    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    serviceAmount: numeric("service_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: text("payment_method"),
    paymentStatus: text("payment_status").notNull().default("impaye"), // impaye | paye | partiel

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    prepSeconds: integer("prep_seconds"),
    serviceSeconds: integer("service_seconds"),
    closureId: integer("closure_id"),
  },
  (table) => [uniqueIndex("orders_reference_unique").on(table.reference)],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  dishId: integer("dish_id"),
  dishName: text("dish_name").notNull(),
  categoryName: text("category_name").default(""),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  quantity: integer("quantity").notNull().default(1),
  supplementsTotal: numeric("supplements_total", { precision: 12, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes").default(""),
});

export const orderItemSupplements = pgTable("order_item_supplements", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id").notNull(),
  orderId: integer("order_id").notNull(),
  supplementId: integer("supplement_id"),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  orderReference: text("order_reference").notNull(),
  reference: text("reference").notNull(),
  method: text("method").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("valide"),
  cashierId: integer("cashier_id"),
  cashierName: text("cashier_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  targetRole: text("target_role"),
  targetUserId: integer("target_user_id"),
  orderId: integer("order_id"),
  orderReference: text("order_reference"),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull().default(""),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cashClosures = pgTable("cash_closures", {
  id: serial("id").primaryKey(),
  businessDate: text("business_date").notNull(),
  cashierId: integer("cashier_id"),
  cashierName: text("cashier_name"),
  totalOrders: integer("total_orders").notNull().default(0),
  paidOrders: integer("paid_orders").notNull().default(0),
  cancelledOrders: integer("cancelled_orders").notNull().default(0),
  pendingOrders: integer("pending_orders").notNull().default(0),
  revenue: numeric("revenue", { precision: 14, scale: 2 }).notNull().default("0"),
  cashed: numeric("cashed", { precision: 14, scale: 2 }).notNull().default("0"),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  breakdown: jsonb("breakdown").$type<Record<string, number>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Dish = typeof dishes.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Supplement = typeof supplements.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type CashClosure = typeof cashClosures.$inferSelect;
