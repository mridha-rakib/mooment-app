import assert from "node:assert/strict";
import test from "node:test";
import { getHashtagResultSections } from "../lib/hashtagResultSections";

test("events only: shows the Events section and hides the Posts section", () => {
  const sections = getHashtagResultSections(2, 0);
  assert.deepEqual(sections, { showEvents: true, showPosts: false });
});

test("posts only: shows the Posts section and hides the Events section", () => {
  const sections = getHashtagResultSections(0, 3);
  assert.deepEqual(sections, { showEvents: false, showPosts: true });
});

test("both: shows both the Events section and the Posts section", () => {
  const sections = getHashtagResultSections(2, 1);
  assert.deepEqual(sections, { showEvents: true, showPosts: true });
});

test("none: hides both sections so the empty state can take over", () => {
  const sections = getHashtagResultSections(0, 0);
  assert.deepEqual(sections, { showEvents: false, showPosts: false });
});

test("a normal Post is never counted toward the Events section", () => {
  // Events and Posts are separately typed arrays (EventResponse[] vs PostData[]) fetched
  // from two distinct endpoints — a Post can never contribute to eventCount, so passing a
  // nonzero postCount alone must never flip showEvents on.
  const sections = getHashtagResultSections(0, 5);
  assert.equal(sections.showEvents, false);
});

test("an Event is never counted toward the Posts section", () => {
  const sections = getHashtagResultSections(5, 0);
  assert.equal(sections.showPosts, false);
});
