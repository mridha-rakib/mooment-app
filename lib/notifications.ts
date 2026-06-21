import { api } from "@/lib/api";

export type NotificationType = "follow" | "ticket_buyer" | "ticket_creator" | "ticket_share";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  actorId?: string | null;
  actorName?: string | null;
  actorUsername?: string | null;
  actorAvatarUrl?: string | null;
  eventId?: string | null;
  eventName?: string | null;
  ticketName?: string | null;
  isRead: boolean;
  createdAt: string;
};

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const response = await api.get("/notifications");
  const notifications = response.data?.data?.notifications;

  return Array.isArray(notifications) ? (notifications as NotificationItem[]) : [];
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch("/notifications/read-all");
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get("/notifications/unread-count");
  const count = response.data?.data?.count;

  return typeof count === "number" ? count : 0;
};
