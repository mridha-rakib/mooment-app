import assert from "node:assert/strict";
import test from "node:test";
import { retryBlockOnly, submitReportWithOptionalBlock } from "../lib/reportBlockFlow";
import type { CreateReportPayload, CreateReportResult } from "../lib/reports";

const payload: CreateReportPayload = {
  reportedUserId: "author-1",
  targetType: "post",
  targetId: "post-1",
  reason: "Spam",
  details: null,
};

const createdResult = (reportedUserId = "author-1"): CreateReportResult => ({
  status: "created",
  report: {
    id: "report-1",
    targetType: "post",
    targetId: "post-1",
    reason: "Spam",
    details: null,
    status: "pending",
    reportedUserId,
  },
});

test("also-block OFF: submits the report and never calls blockUser", async () => {
  let blockCalls = 0;
  const outcome = await submitReportWithOptionalBlock({
    payload,
    alsoBlock: false,
    submitReportFn: async () => createdResult(),
    blockUserFn: async () => {
      blockCalls += 1;
      return { userId: "author-1", isBlocked: true };
    },
  });

  assert.deepEqual(outcome, { kind: "report_only" });
  assert.equal(blockCalls, 0);
});

test("also-block ON: report always resolves before blockUser is ever called (never Promise.all)", async () => {
  const callOrder: string[] = [];
  const outcome = await submitReportWithOptionalBlock({
    payload,
    alsoBlock: true,
    submitReportFn: async () => {
      callOrder.push("report-start");
      await new Promise((resolve) => setTimeout(resolve, 5));
      callOrder.push("report-end");
      return createdResult();
    },
    blockUserFn: async (userId) => {
      callOrder.push("block-start");
      assert.equal(userId, "author-1");
      return { userId, isBlocked: true };
    },
  });

  assert.deepEqual(outcome, { kind: "report_block_success" });
  assert.deepEqual(callOrder, ["report-start", "report-end", "block-start"]);
});

test("also-block ON + block fails: report success is preserved as report_block_failed, not rolled back", async () => {
  const outcome = await submitReportWithOptionalBlock({
    payload,
    alsoBlock: true,
    submitReportFn: async () => createdResult(),
    blockUserFn: async () => {
      throw new Error("network error");
    },
  });

  assert.deepEqual(outcome, { kind: "report_block_failed" });
});

test("duplicate report (already_reported) never triggers a block, even when also-block is ON", async () => {
  let blockCalls = 0;
  const outcome = await submitReportWithOptionalBlock({
    payload,
    alsoBlock: true,
    submitReportFn: async () => ({ status: "already_reported" }),
    blockUserFn: async () => {
      blockCalls += 1;
      return { userId: "author-1", isBlocked: true };
    },
  });

  assert.deepEqual(outcome, { kind: "already_reported" });
  assert.equal(blockCalls, 0);
});

test("submitReportWithOptionalBlock uses the server-validated reportedUserId from the report response, not an arbitrary client value", async () => {
  let blockedUserId: string | null = null;
  await submitReportWithOptionalBlock({
    payload: { ...payload, reportedUserId: "client-supplied-wrong-id" },
    alsoBlock: true,
    submitReportFn: async () => createdResult("server-validated-owner-id"),
    blockUserFn: async (userId) => {
      blockedUserId = userId;
      return { userId, isBlocked: true };
    },
  });

  assert.equal(blockedUserId, "server-validated-owner-id");
});

test("retryBlockOnly never calls createReport-shaped logic — it only accepts an ownerId and calls blockUser", async () => {
  const result = await retryBlockOnly({
    ownerId: "author-1",
    blockUserFn: async (userId) => {
      assert.equal(userId, "author-1");
      return { userId, isBlocked: true };
    },
  });

  assert.equal(result, "blocked");
});

test("retryBlockOnly reports 'failed' on error and can be called again after a failure", async () => {
  let attempt = 0;
  const blockUserFn = async (userId: string) => {
    attempt += 1;
    if (attempt === 1) {
      throw new Error("still down");
    }
    return { userId, isBlocked: true };
  };

  const firstTry = await retryBlockOnly({ ownerId: "author-1", blockUserFn });
  assert.equal(firstTry, "failed");

  const secondTry = await retryBlockOnly({ ownerId: "author-1", blockUserFn });
  assert.equal(secondTry, "blocked");
  assert.equal(attempt, 2);
});
