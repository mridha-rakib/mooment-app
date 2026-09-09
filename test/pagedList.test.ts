import assert from "node:assert/strict";
import test from "node:test";

import { mergeById } from "../lib/pagedList";

const id = (item: { id: string }) => item.id;

test("overlapping pages dedupe by id and preserve order (A B C + C D E => A B C D E)", () => {
  const page1 = [{ id: "A" }, { id: "B" }, { id: "C" }];
  const page2 = [{ id: "C" }, { id: "D" }, { id: "E" }];

  assert.deepEqual(
    mergeById(page1, page2, id).map(id),
    ["A", "B", "C", "D", "E"],
  );
});

test("a row removed between pages is not resurrected by a later page", () => {
  // page 1 showed A B C; B was removed; page 2 (fresh server read) returns C D E
  const shown = [{ id: "A" }, { id: "C" }];
  const nextPage = [{ id: "C" }, { id: "D" }, { id: "E" }];

  assert.deepEqual(mergeById(shown, nextPage, id).map(id), ["A", "C", "D", "E"]);
});

test("existing rows keep their positions; only new ids append", () => {
  const existing = [{ id: "A" }, { id: "B" }];
  const next = [{ id: "B" }, { id: "A" }, { id: "C" }];

  assert.deepEqual(mergeById(existing, next, id).map(id), ["A", "B", "C"]);
});

test("empty next page is a no-op", () => {
  const existing = [{ id: "A" }];
  assert.deepEqual(mergeById(existing, [], id), existing);
});
