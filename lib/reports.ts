import { api } from "@/lib/api";

export type ReportTargetType = "post" | "event" | "user" | "room";

export type CreateReportPayload = {
  reportedUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string | null;
};

export type ReportResponse = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string | null;
  status: "pending" | "resolved" | "dismissed";
};

export const createReport = async (payload: CreateReportPayload): Promise<ReportResponse> => {
  const response = await api.post("/reports", payload);
  const report = response.data?.data?.report as ReportResponse | undefined;

  if (!report?.id) {
    throw new Error("The report response was incomplete.");
  }

  return report;
};
