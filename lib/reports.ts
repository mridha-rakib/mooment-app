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
  // Server-validated owner of the reported content — always the backend's
  // resolved `reportedUser.id`, never a client-trusted value. This is the
  // only id an "also block this user" follow-up should ever use.
  reportedUserId: string;
};

export type CreateReportResult =
  | { status: "created"; report: ReportResponse }
  | { status: "already_reported" };

export const createReport = async (payload: CreateReportPayload): Promise<ReportResponse> => {
  const response = await api.post("/reports", payload);
  const raw = response.data?.data?.report as (Partial<ReportResponse> & { reportedUser?: { id?: string } }) | undefined;
  const reportedUserId = raw?.reportedUserId ?? raw?.reportedUser?.id;

  if (!raw?.id || !reportedUserId) {
    throw new Error("The report response was incomplete.");
  }

  return { ...raw, reportedUserId } as ReportResponse;
};

// Same as createReport, but treats the backend's "already reported" 409 as a
// distinct outcome instead of throwing — the caller (Feed report flow) needs
// to tell a brand-new success apart from "this was already reported before"
// so it never runs the optional block step against a report that didn't
// just happen in this request.
export const submitReport = async (payload: CreateReportPayload): Promise<CreateReportResult> => {
  try {
    const report = await createReport(payload);
    return { status: "created", report };
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 409) {
      return { status: "already_reported" };
    }
    throw error;
  }
};
