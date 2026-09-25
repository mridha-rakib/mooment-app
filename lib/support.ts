import { api } from "@/lib/api";

export type CreateSupportTicketPayload = {
  title: string;
  description: string;
};

export type SupportTicketStatus = "pending" | "solved" | "dismissed";

export type SupportTicket = {
  id: string;
  title: string;
  description: string;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
};

export const createSupportTicket = async (payload: CreateSupportTicketPayload) => {
  const response = await api.post("/support/tickets", payload);

  return response.data?.data?.ticket as SupportTicket;
};
