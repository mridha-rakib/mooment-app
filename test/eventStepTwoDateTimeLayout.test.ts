import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-007 — Start Date + Start Time on one row, End Date + End Time on the
// next row (was: dates row, then times row). This screen can't be mounted
// under the plain `bun test` runner (no RN component harness in this repo —
// see the other event*.test.ts files), so these are source-text guards, not
// runtime proof of on-screen rendering — they verify JSX/DOM order, which is
// what actually determines both visual grouping (flex row) and interaction
// order for Pressable controls.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const stepTwo = read("app/create-event/step-2.tsx");

const dateTimeBlock = stepTwo.slice(
  stepTwo.indexOf("<View style={styles.dateTimeGroup}>"),
  stepTwo.indexOf("{showStartDatePicker"),
);

test("EVT-007: the Start/End date-time block exists and was located correctly", () => {
  assert.ok(dateTimeBlock.length > 0, "dateTimeGroup block not found");
});

// ── 1/2: row grouping ───────────────────────────────────────────────────────

test("EVT-007: Start Date and Start Time share the same row", () => {
  const firstRowStart = dateTimeBlock.indexOf("<View style={[styles.row, styles.dateRow]}>");
  const secondRowStart = dateTimeBlock.indexOf("<View style={styles.row}>");
  assert.ok(firstRowStart >= 0 && secondRowStart > firstRowStart, "expected two distinct row containers, in order");

  const firstRow = dateTimeBlock.slice(firstRowStart, secondRowStart);
  assert.match(firstRow, /START DATE/);
  assert.match(firstRow, /START TIME/);
  assert.doesNotMatch(firstRow, /END DATE/);
  assert.doesNotMatch(firstRow, /END TIME/);
});

test("EVT-007: End Date and End Time share the next row", () => {
  const firstRowStart = dateTimeBlock.indexOf("<View style={[styles.row, styles.dateRow]}>");
  const secondRowStart = dateTimeBlock.indexOf("<View style={styles.row}>");
  const secondRow = dateTimeBlock.slice(secondRowStart);

  assert.match(secondRow, /END DATE/);
  assert.match(secondRow, /END TIME/);
  assert.doesNotMatch(secondRow, /START DATE/);
  assert.doesNotMatch(secondRow, /START TIME/);
  assert.ok(secondRowStart > firstRowStart);
});

// ── 3: Start controls appear before End controls in source/DOM order ───────

test("EVT-007: Start controls appear before End controls in source order", () => {
  const startDateIndex = dateTimeBlock.indexOf("START DATE");
  const startTimeIndex = dateTimeBlock.indexOf("START TIME");
  const endDateIndex = dateTimeBlock.indexOf("END DATE");
  const endTimeIndex = dateTimeBlock.indexOf("END TIME");

  assert.ok(startDateIndex >= 0 && startTimeIndex >= 0 && endDateIndex >= 0 && endTimeIndex >= 0);
  assert.ok(startDateIndex < startTimeIndex, "Start Date must precede Start Time");
  assert.ok(startTimeIndex < endDateIndex, "Start Time must precede End Date");
  assert.ok(endDateIndex < endTimeIndex, "End Date must precede End Time");
});

// ── 4: time text has the same overflow/truncation protection as date text ──

test("EVT-007: time value text has overflow/truncation protection equivalent to date value text", () => {
  // Every one of the 4 value Texts (start date, start time, end date, end
  // time) must use compactSelectorText (flex: 1, safe width) AND
  // numberOfLines={1} — previously only the two date Texts had this.
  const compactCount = (dateTimeBlock.match(/styles\.compactSelectorText/g) ?? []).length;
  const numberOfLinesCount = (dateTimeBlock.match(/numberOfLines={1}/g) ?? []).length;

  assert.equal(compactCount, 4, "expected all 4 date/time value Texts to use compactSelectorText");
  assert.equal(numberOfLinesCount, 4, "expected all 4 date/time value Texts to set numberOfLines={1}");
  assert.doesNotMatch(dateTimeBlock, /styles\.selectorText\b/, "the old unprotected time text style must no longer be used here");
});

// ── 5: existing handlers/field bindings unchanged ───────────────────────────

test("EVT-007: existing date/time handlers and field bindings are unchanged", () => {
  assert.match(dateTimeBlock, /onPress={\(\) => setShowStartDatePicker\(true\)}/);
  assert.match(dateTimeBlock, /onPress={\(\) => setShowEndDatePicker\(true\)}/);
  assert.match(dateTimeBlock, /onPress={\(\) => setShowStartTimePicker\(true\)}/);
  assert.match(dateTimeBlock, /onPress={\(\) => setShowEndTimePicker\(true\)}/);
  assert.match(dateTimeBlock, /disabled={isOngoingEdit}/);
  assert.match(dateTimeBlock, /startDate \? formatDate\(startDate\) : 'Select date'/);
  assert.match(dateTimeBlock, /endDate \? formatDate\(endDate\) : 'Select date'/);
  assert.match(dateTimeBlock, /startTime \? formatTime\(startTime\) : 'Select time'/);
  assert.match(dateTimeBlock, /endTime \? formatTime\(endTime\) : 'Select time'/);
  assert.match(dateTimeBlock, /errors\.startDate/);
  assert.match(dateTimeBlock, /errors\.endDate/);
  assert.match(dateTimeBlock, /errors\.startTime/);
  assert.match(dateTimeBlock, /errors\.endTime/);
});

test("EVT-007: the native date/time pickers themselves are untouched", () => {
  const pickersBlock = stepTwo.slice(
    stepTwo.indexOf("{showStartDatePicker"),
    stepTwo.indexOf("</View>\n\n      {/* Spacer"),
  );
  assert.match(pickersBlock, /mode="date"/);
  assert.match(pickersBlock, /mode="time"/);
  assert.match(pickersBlock, /onChange={onStartDateChange}/);
  assert.match(pickersBlock, /onChange={onEndDateChange}/);
  assert.match(pickersBlock, /onChange={onStartTimeChange}/);
  assert.match(pickersBlock, /onChange={onEndTimeChange}/);
});

// ── 6: EVT-002 navigator remains present and unchanged ──────────────────────

test("EVT-007 regression: the EVT-002 step navigator is still present and unchanged", () => {
  assert.match(stepTwo, /import CreateEventStepNavigator from '@\/components\/create-event\/CreateEventStepNavigator'/);
  assert.match(stepTwo, /<CreateEventStepNavigator stepStates={stepStates} onStepPress={handleStepNavigatorPress} \/>/);
});
