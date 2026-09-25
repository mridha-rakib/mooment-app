import assert from "node:assert/strict";
import test from "node:test";

import {
  SMART_FEED_DIVERSITY,
  applySmartFeedAuthorDiversity,
  getSmartFeedCreatorId,
} from "../lib/smartFeedDiversity";

type FakeItem = { id: string; authorId?: string; userId?: string; moment?: { userId?: string } };

const item = (id: string, authorId: string): FakeItem => ({ id, authorId });

test("caps consecutive same-author items and interleaves the next best alternate-creator item", () => {
  // Matches the audit's own worked example: B1, B2, B3, C1 (already
  // score-ranked) -> B1, B2, C1, B3.
  const ranked = [item("B1", "B"), item("B2", "B"), item("B3", "B"), item("C1", "C")];

  const result = applySmartFeedAuthorDiversity(ranked, (i) => i.authorId);

  assert.deepEqual(result.map((i) => i.id), ["B1", "B2", "C1", "B3"]);
});

test("never drops content when only one author is available", () => {
  const ranked = [item("A1", "A"), item("A2", "A"), item("A3", "A"), item("A4", "A")];

  const result = applySmartFeedAuthorDiversity(ranked, (i) => i.authorId);

  assert.deepEqual(result.map((i) => i.id).sort(), ["A1", "A2", "A3", "A4"]);
  assert.equal(result.length, ranked.length);
});

test("is deterministic across multiple authors and never exceeds the consecutive-author cap when alternates exist", () => {
  const ranked = [
    item("A1", "A"), item("A2", "A"), item("A3", "A"),
    item("B1", "B"), item("B2", "B"),
    item("C1", "C"),
  ];

  const first = applySmartFeedAuthorDiversity(ranked, (i) => i.authorId);
  const second = applySmartFeedAuthorDiversity(ranked, (i) => i.authorId);

  assert.deepEqual(first, second);
  assert.deepEqual(first.map((i) => i.id).sort(), ranked.map((i) => i.id).sort());

  let streak = 1;
  for (let i = 1; i < first.length; i += 1) {
    streak = first[i].authorId === first[i - 1].authorId ? streak + 1 : 1;
    assert.ok(streak <= SMART_FEED_DIVERSITY.maxConsecutiveSameAuthor);
  }
});

test("does not touch order when nothing would exceed the consecutive-author cap", () => {
  const ranked = [item("A1", "A"), item("B1", "B"), item("A2", "A"), item("B2", "B")];

  const result = applySmartFeedAuthorDiversity(ranked, (i) => i.authorId);

  assert.deepEqual(result.map((i) => i.id), ["A1", "B1", "A2", "B2"]);
});

test("Post/Event/Repost creator identity resolves through authorId, userId, or moment.userId in that priority", () => {
  assert.equal(getSmartFeedCreatorId({ authorId: "post-author" }), "post-author");
  assert.equal(getSmartFeedCreatorId({ userId: "event-host" }), "event-host");
  assert.equal(getSmartFeedCreatorId({ moment: { userId: "original-author" } }), "original-author");
  // authorId takes priority if somehow more than one is present.
  assert.equal(getSmartFeedCreatorId({ authorId: "a", userId: "b" }), "a");
  assert.equal(getSmartFeedCreatorId({}), undefined);
});

test("the viewer's own repeated Friends-feed posts are not exempt from the consecutive-author cap", () => {
  // Friends now surfaces the viewer's own Moments alongside mutual friends'
  // (xenog-api moment.service.ts authorUserIds change) — self content must
  // still obey the same diversity rule as any other creator, not be
  // special-cased out of it.
  const viewerId = "viewer-own-id";
  const ranked = [
    item("self-1", viewerId), item("self-2", viewerId), item("self-3", viewerId),
    item("friend-1", "mutual-friend-id"),
  ];

  const result = applySmartFeedAuthorDiversity(ranked, (i) => i.authorId);

  assert.deepEqual(result.map((i) => i.id), ["self-1", "self-2", "friend-1", "self-3"]);
});

test("small feeds at or under the cap size pass through untouched", () => {
  const ranked = [item("A1", "A"), item("A2", "A")];

  const result = applySmartFeedAuthorDiversity(ranked, (i) => i.authorId);

  assert.deepEqual(result, ranked);
});
