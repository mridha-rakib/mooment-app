import { api } from "@/lib/api";

export type NotificationType = "follow" | "ticket_buyer" | "ticket_creator" | "ticket_share" | "join_request" | "join_request_accepted" | "event_member_added";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  actorId?: string | null;
  actorName?: string | null;
  actorUsername?: string | null;
  actorAvatarUrl?: string | null;
  isFollowing?: boolean | null;
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

const getUnreadCountFromResponse = (response: unknown): number | null => {
  const count = (response as { data?: { data?: { unreadCount?: unknown; count?: unknown } } })?.data?.data?.unreadCount
    ?? (response as { data?: { data?: { count?: unknown } } })?.data?.data?.count;

  return typeof count === "number" ? count : null;
};

export const markAllNotificationsRead = async (): Promise<number | null> => {
  const response = await api.patch("/notifications/read-all");
  return getUnreadCountFromResponse(response);
};

export const markNotificationRead = async (notificationId: string): Promise<number | null> => {
  const response = await api.patch(`/notifications/${encodeURIComponent(notificationId)}/read`);
  return getUnreadCountFromResponse(response);
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get("/notifications/unread-count");
  const count = response.data?.data?.count;

  return typeof count === "number" ? count : 0;
};
