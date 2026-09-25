import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-013 — Batch 2, Part D/E/F/H (tests 19-21): source-text wiring guards for
// the ticket-deadline dependency check on Create/Edit Event Step 2. Step 2
// can't be mounted under this repo's plain `bun test` runner (see the note in
// eventStepNavigatorWiring.test.ts), so these assert the wiring shape; the
// underlying detection logic itself (which tiers conflict, message text,
// multi-tier coverage) is proven at runtime in ticketAvailability.test.ts.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");

const stepTwo = read("app/create-event/step-2.tsx");

test("EVT-013: Step 2 imports the ticket-deadline dependency helpers from ticketAvailability", () => {
  assert.match(stepTwo, /getTicketDeadlineConflicts/);
  assert.match(stepTwo, /getTicketDeadlineDependencyMessage/);
  assert.match(stepTwo, /from '@\/lib\/ticketAvailability'/);
});

test("EVT-013: validateStepTwo (the gate used by both Next and Save & Exit) checks every current draft ticket", () => {
  const validateStepTwoMatch = stepTwo.match(/const validateStepTwo = \(\)[\s\S]*?\n  \};\n/);
  assert.ok(validateStepTwoMatch, "expected to find the validateStepTwo function body");
  const body = validateStepTwoMatch![0];

  // Reads from the live draft ticket list, not a hardcoded single ticket —
  // confirms the "check ALL tiers, not tickets[0]" requirement is wired at
  // the call site (getTicketDeadlineConflicts itself iterates the full array,
  // proven in ticketAvailability.test.ts).
  assert.match(body, /getTicketDeadlineConflicts\(draftTickets, proposedEventEndAt, draftTimezone\)/);
  // A conflict blocks progression by returning null, exactly like every
  // other validation branch in this function.
  assert.match(body, /deadlineConflicts\.length > 0/);
  assert.match(body, /return null;/);
});

test("EVT-013: forward progression (handleNext) and Save & Exit both call validateStepTwo before proceeding", () => {
  const handleNext = stepTwo.match(/const handleNext = async \(\)[\s\S]*?\n  \};\n/)?.[0] ?? "";
  const handleSaveAndExit = stepTwo.match(/const handleSaveAndExit = async \(\)[\s\S]*?\n  \};\n/)?.[0] ?? "";

  assert.match(handleNext, /const values = validateStepTwo\(\);/);
  assert.match(handleNext, /if \(!values\) return;/);
  assert.match(handleSaveAndExit, /const values = validateStepTwo\(\);/);
  assert.match(handleSaveAndExit, /if \(!values\) return;/);
});

test("EVT-013: Back/step-navigator handling does not gate on validateStepTwo (back navigation remains allowed while invalid)", () => {
  const handler = stepTwo.match(/const handleStepNavigatorPress = \([\s\S]*?\n  \};\n/)?.[0] ?? "";
  assert.ok(handler.length > 0, "expected to find handleStepNavigatorPress");
  assert.doesNotMatch(handler, /validateStepTwo/);
});

test("EVT-013: a dependency conflict never mutates ticket state and never resets the chosen End picker values", () => {
  const validateStepTwoMatch = stepTwo.match(/const validateStepTwo = \(\)[\s\S]*?\n  \};\n/);
  const body = validateStepTwoMatch![0];
  const conflictBranch = body.match(/if \(deadlineConflicts\.length > 0\) \{[\s\S]*?\n    \}/)?.[0] ?? "";

  assert.ok(conflictBranch.length > 0, "expected to find the deadlineConflicts branch");
  // The branch only sets the error message — it must never call a ticket
  // mutator or reset the End date/time state the host just picked.
  assert.doesNotMatch(conflictBranch, /setEndDate|setEndTime|deleteTicket|saveTicket|removeTicket/);
  assert.match(conflictBranch, /setErrors\(/);
});
