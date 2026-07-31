"use client";
import { useLive } from "@/lib/client";
export type NotificationRow = { id: number; title: string; message: string; type: string; orderReference: string | null; readAt: string | null; createdAt: string };
export function useNotifications() { return useLive<{ notifications: NotificationRow[]; unread: number }>("/api/notifications", 5000); }
