import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getEventStepTwoScheduleErrors,
  isEventEndedByTime,
  isOngoingPublishedEventEdit,
  ONGOING_END_IN_PAST_MESSAGE,
  ONGOING_START_CHANGED_MESSAGE,
  START_IN_PAST_MESSAGE,
} from "../lib/eventStepTwoValidation";

const at = (hour: number, minute = 0) => new Date(2026, 6, 20, hour, minute, 0, 0);

const values = (start: Date, end: Date) => ({
  startDate: start,
  startTime: start,
  endDate: end,
  endTime: end,
});

test("Create Event still rejects a past start date and time", () => {
  assert.deepEqual(
    getEventStepTwoScheduleErrors(values(at(18), at(22)), {
      isOngoingEdit: false,
      now: at(19),
    }),
    { startDate: START_IN_PAST_MESSAGE },
  );
});

test("Upcoming edit keeps the existing start/end validation path", () => {
  const originalScheduledAt = at(20).toISOString();
  const persistedEndAt = at(23).toISOString();

  assert.equal(
    isOngoingPublishedEventEdit({
      isEditingPublishedEvent: true,
      originalScheduledAt,
      persistedEndAt,
      now: at(19),
    }),
    false,
  );
  assert.deepEqual(
    getEventStepTwoScheduleErrors(values(at(20), at(21)), {
      isOngoingEdit: false,
      originalScheduledAt,
      now: at(19),
    }),
    {},
  );
});

test("Ongoing event edit disables only Start Date and Start Time controls", () => {
  const stepTwoSource = readFileSync(join(process.cwd(), "app/create-event/step-2.tsx"), "utf8");
  const startDateBlock = stepTwoSource.slice(
    stepTwoSource.indexOf(">START DATE<"),
    stepTwoSource.indexOf(">END DATE<"),
  );
  const endDateBlock = stepTwoSource.slice(
    stepTwoSource.indexOf(">END DATE<"),
    stepTwoSource.indexOf(">START TIME<"),
  );
  const startTimeBlock = stepTwoSource.slice(
    stepTwoSource.indexOf(">START TIME<"),
    stepTwoSource.indexOf(">END TIME<"),
  );
  const endTimeBlock = stepTwoSource.slice(
    stepTwoSource.indexOf(">END TIME<"),
    stepTwoSource.indexOf("{errors.endTime"),
  );

  assert.match(startDateBlock, /disabled=\{isOngoingEdit\}/);
  assert.match(startDateBlock, /styles\.disabledControl/);
  assert.match(startTimeBlock, /disabled=\{isOngoingEdit\}/);
  assert.match(startTimeBlock, /styles\.disabledControl/);
  assert.doesNotMatch(endDateBlock, /disabled=\{isOngoingEdit\}/);
  assert.doesNotMatch(endTimeBlock, /disabled=\{isOngoingEdit\}/);
});

test("Extending an ongoing event with unchanged original start is valid", () => {
  const originalScheduledAt = at(18).toISOString();
  const persistedEndAt = at(22).toISOString();
  const isOngoingEdit = isOngoingPublishedEventEdit({
    isEditingPublishedEvent: true,
    originalScheduledAt,
    persistedEndAt,
    now: at(19),
  });

  assert.equal(isOngoingEdit, true);
  assert.deepEqual(
    getEventStepTwoScheduleErrors(values(at(18), at(23)), {
      isOngoingEdit,
      originalScheduledAt,
      now: at(19),
    }),
    {},
  );
});

test("Ongoing event edit preserves the exact original scheduledAt value for submission", () => {
  const stepTwoSource = readFileSync(join(process.cwd(), "app/create-event/step-2.tsx"), "utf8");

  assert.match(
    stepTwoSource,
    /if \(isOngoingEdit && originalScheduledAt\) \{\s*scheduledAt = originalScheduledAt;/,
  );
  assert.deepEqual(
    getEventStepTwoScheduleErrors(values(at(18), at(23)), {
      isOngoingEdit: true,
      originalScheduledAt: new Date(2026, 6, 20, 18, 0, 30, 250).toISOString(),
      now: at(19),
    }),
    {},
  );
});

test("Ongoing event edit rejects a submitted start that differs from the original persisted start", () => {
  assert.deepEqual(
    getEventStepTwoScheduleErrors(values(at(18, 30), at(23)), {
      isOngoingEdit: true,
      originalScheduledAt: at(18).toISOString(),
      now: at(19),
    }),
    { startDate: ONGOING_START_CHANGED_MESSAGE },
  );
});

test("Historical unchanged original start does not trigger the create past-start error", () => {
  const originalScheduledAt = at(18).toISOString();

  assert.notDeepEqual(
    getEventStepTwoScheduleErrors(values(at(18), at(23)), {
      isOngoingEdit: true,
      originalScheduledAt,
      now: at(19),
    }),
    { startDate: START_IN_PAST_MESSAGE },
  );
});

test("Ongoing event edit rejects an end date and time before current time", () => {
  const originalScheduledAt = at(18).toISOString();

  assert.deepEqual(
    getEventStepTwoScheduleErrors(values(at(18), at(18, 30)), {
      isOngoingEdit: true,
      originalScheduledAt,
      now: at(19),
    }),
    { endDate: ONGOING_END_IN_PAST_MESSAGE },
  );
});

test("Ended-by-time events are blocked from the mobile edit entry points", () => {
  assert.equal(isEventEndedByTime(at(18, 30).toISOString(), at(19).getTime()), true);

  const eventScreenSource = readFileSync(join(process.cwd(), "app/event-screen/event.tsx"), "utf8");
  const feedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");

  assert.match(eventScreenSource, /const isEventEditBlocked = Boolean\(isEventCompleted \|\| isEventCancelled \|\| isEventEndedByPersistedTime\);/);
  assert.match(eventScreenSource, /if \(isEventEditBlocked\) \{\s*return;\s*\}/);
  assert.match(eventScreenSource, /\{!isEventEditBlocked && \(/);
  assert.match(feedCardSource, /eventStatus === "completed" \|\| eventStatus === "cancelled" \|\| eventEndedByPersistedTime/);
  assert.match(feedCardSource, /showEdit=\{isOwnEvent && eventStatus !== "completed" && eventStatus !== "cancelled" && !eventEndedByPersistedTime\}/);
});
