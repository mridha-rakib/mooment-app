import type { BlockStatusResponse } from "@/lib/users";
import type { CreateReportPayload, CreateReportResult } from "@/lib/reports";

// Small, pure orchestration for the approved "Report, optionally Block the
// owner" flow — kept outside FeedPost/EventFeedCard so the sequencing rules
// (report always completes first, block never runs before a fresh report
// success, retry never re-reports) are unit-testable without a component
// render harness, and so both Feed surfaces share one implementation.
//
// Deliberately depends only on types, not on lib/reports.ts/lib/users.ts
// themselves — callers pass the real submitReport/blockUser functions in.
// This keeps the module free of any react-native-touching import chain.

export type SubmitReportFn = (payload: CreateReportPayload) => Promise<CreateReportResult>;
export type BlockUserFn = (userId: string) => Promise<BlockStatusResponse>;

export type ReportBlockOutcome =
  | { kind: "already_reported" }
  | { kind: "report_only" }
  | { kind: "report_block_success" }
  | { kind: "report_block_failed" };

export type SubmitReportWithOptionalBlockParams = {
  payload: CreateReportPayload;
  alsoBlock: boolean;
  submitReportFn: SubmitReportFn;
  blockUserFn: BlockUserFn;
};

// Report always runs first and always completes before any block attempt —
// never Promise.all — so a block failure can never leave the report's
// outcome ambiguous. A "duplicate report" conflict never triggers a block,
// since no new report actually happened in this request.
export const submitReportWithOptionalBlock = async ({
  payload,
  alsoBlock,
  submitReportFn,
  blockUserFn,
}: SubmitReportWithOptionalBlockParams): Promise<ReportBlockOutcome> => {
  const result = await submitReportFn(payload);

  if (result.status === "already_reported") {
    return { kind: "already_reported" };
  }

  if (!alsoBlock) {
    return { kind: "report_only" };
  }

  try {
    await blockUserFn(result.report.reportedUserId);
    return { kind: "report_block_success" };
  } catch {
    return { kind: "report_block_failed" };
  }
};

export type RetryBlockParams = {
  ownerId: string;
  blockUserFn: BlockUserFn;
};

// Retry-only-block: never re-submits the report, and is safe to call again
// after a failure — blockUser() is already idempotent server-side (existing
// UserBlock upsert semantics), so a retry that actually succeeded on a prior
// attempt but timed out client-side just resolves the same way.
export const retryBlockOnly = async ({ ownerId, blockUserFn }: RetryBlockParams): Promise<"blocked" | "failed"> => {
  try {
    await blockUserFn(ownerId);
    return "blocked";
  } catch {
    return "failed";
  }
};
