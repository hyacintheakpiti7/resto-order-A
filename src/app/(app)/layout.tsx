import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/orders";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await ensureSeed();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const config = await getSettings();
  return (
    <AppShell user={user} restaurantName={config.restaurantName}>
      {children}
    </AppShell>
  );
}
