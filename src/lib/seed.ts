import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  dishSupplements,
  dishes,
  restaurantTables,
  settings,
  supplements,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";

let seeding: Promise<void> | null = null;

async function runSeed() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  if (count > 0) return;

  await db
    .insert(settings)
    .values({
      id: 1,
      restaurantName: "SUYA Food",
      currency: "FCFA",
      taxRate: "18.00",
      serviceRate: "0.00",
      address: "12 Avenue Gédéon",
      phone: "+229 01 69 09 57 51",
      openingHours: "08:00 - 23:00",
      receiptFooter: "Merci de votre visite — à très bientôt !",
      cashierCanEditOrders: true,
    })
    .onConflictDoNothing();

  const pwd = hashPassword("passer123");
  await db.insert(users).values([
    { code: "ADM-01", fullName: "Hyacinthe AKPITI", role: "admin", passwordHash: pwd, phone: "+229 01 69 09 57 51" },
    { code: "SRV-01", fullName: "Koffi GEDEON", role: "serveur", passwordHash: pwd, phone: "+229 01 69 09 57 51" },
    { code: "SRV-02", fullName: "Mariam GEDEON", role: "serveur", passwordHash: pwd },
    { code: "CAI-01", fullName: "Oronce OKEBIYI", role: "caissier", passwordHash: pwd },
    { code: "CHF-01", fullName: "Shakira JAFFAL", role: "chef", passwordHash: pwd },
    { code: "CUI-01", fullName: "Roukayath MAMADOU", role: "cuisinier", passwordHash: pwd },
    { code: "CUI-02", fullName: "Serge ORONCE", role: "cuisinier", passwordHash: pwd },
  ]);

  const cats = await db
    .insert(categories)
    .values([
      { name: "Entrées", description: "Pour bien commencer", position: 1 },
      { name: "Plats principaux", description: "Nos spécialités", position: 2 },
      { name: "Grillades", description: "Cuites à la braise", position: 3 },
      { name: "Desserts", description: "Douceurs maison", position: 4 },
      { name: "Boissons", description: "Fraîches et chaudes", position: 5 },
    ])
    .returning();

  const byName = (name: string) => cats.find((c) => c.name === name)!.id;

  const dishRows = await db
    .insert(dishes)
    .values([
      { categoryId: byName("Entrées"), name: "Salade César", description: "Laitue, poulet, parmesan", price: "3500", emoji: "🥗" },
      { categoryId: byName("Entrées"), name: "Soupe du jour", description: "Préparée chaque matin", price: "2500", emoji: "🍲" },
      { categoryId: byName("Entrées"), name: "Avocat crevettes", description: "Sauce cocktail", price: "4500", emoji: "🥑" },
      { categoryId: byName("Plats principaux"), name: "Poulet Yassa", description: "Oignons confits et citron", price: "6500", emoji: "🍗" },
      { categoryId: byName("Plats principaux"), name: "Attiéké poisson", description: "Poisson braisé, attiéké", price: "7000", emoji: "🐟" },
      { categoryId: byName("Plats principaux"), name: "Riz sauce arachide", description: "Recette traditionnelle", price: "5500", emoji: "🍚" },
      { categoryId: byName("Grillades"), name: "Brochettes de bœuf", description: "Servies avec frites", price: "8000", emoji: "🍢" },
      { categoryId: byName("Grillades"), name: "Côtelettes d'agneau", description: "Marinade aux herbes", price: "12000", emoji: "🥩" },
      { categoryId: byName("Desserts"), name: "Salade de fruits", description: "Fruits de saison", price: "2500", emoji: "🍉" },
      { categoryId: byName("Desserts"), name: "Fondant au chocolat", description: "Cœur coulant", price: "3000", emoji: "🍫" },
      { categoryId: byName("Boissons"), name: "Jus de bissap", description: "Fait maison, 50 cl", price: "1500", emoji: "🥤" },
      { categoryId: byName("Boissons"), name: "Eau minérale", description: "Bouteille 75 cl", price: "1000", emoji: "💧" },
      { categoryId: byName("Boissons"), name: "Café expresso", description: "Torréfaction locale", price: "1200", emoji: "☕" },
    ])
    .returning();

  const supRows = await db
    .insert(supplements)
    .values([
      { name: "Frites", price: "1500" },
      { name: "Riz blanc", price: "1000" },
      { name: "Alloco", price: "1500" },
      { name: "Fromage", price: "800" },
      { name: "Sauce piquante", price: "500" },
      { name: "Portion supplémentaire", price: "2000" },
    ])
    .returning();

  const links: { dishId: number; supplementId: number }[] = [];
  for (const dish of dishRows) {
    const cat = cats.find((c) => c.id === dish.categoryId)!;
    if (cat.name === "Boissons" || cat.name === "Desserts") continue;
    for (const sup of supRows) links.push({ dishId: dish.id, supplementId: sup.id });
  }
  if (links.length) await db.insert(dishSupplements).values(links);

  await db.insert(restaurantTables).values(
    Array.from({ length: 14 }, (_, i) => ({
      number: `T${String(i + 1).padStart(2, "0")}`,
      qrCode: `QR-TABLE-${String(i + 1).padStart(2, "0")}`,
      seats: i % 3 === 0 ? 2 : i % 3 === 1 ? 4 : 6,
    })),
  );
}

export async function ensureSeed(): Promise<void> {
  if (!seeding) {
    seeding = runSeed().catch((error) => {
      seeding = null;
      throw error;
    });
  }
  return seeding;
}
