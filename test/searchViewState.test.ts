import assert from "node:assert/strict";
import test from "node:test";

import {
  getScreenSearchState,
  getSearchSourceState,
  selectCurrentRows,
} from "../lib/searchViewState";

// --- selectCurrentRows: never surface rows from an older query ---------------

test("selectCurrentRows returns the rows only while their query matches the visible one", () => {
  assert.deepEqual(selectCurrentRows("party", "party", [{ id: "a" }]), [{ id: "a" }]);
});

test("selectCurrentRows drops rows fetched for a different (older) query", () => {
  // visible query moved on to "party" but the applied rows still belong to "cat"
  assert.deepEqual(selectCurrentRows("party", "cat", [{ id: "cat-user" }]), []);
});

test("selectCurrentRows drops rows when there is no visible query", () => {
  assert.deepEqual(selectCurrentRows("", "", [{ id: "a" }]), []);
});

// --- getSearchSourceState: LOADING / ERROR / EMPTY / RESULTS stay distinct ---

const base = { hasQuery: true, isFetching: false, hasError: false, rowsMatchQuery: true, rowCount: 0 };

test("a settled request with rows is RESULTS", () => {
  assert.equal(getSearchSourceState({ ...base, rowCount: 3 }), "results");
});

test("a settled request with zero rows is EMPTY (never ERROR)", () => {
  assert.equal(getSearchSourceState({ ...base, rowCount: 0 }), "empty");
});

test("an in-flight request is LOADING, never EMPTY", () => {
  assert.equal(getSearchSourceState({ ...base, isFetching: true, rowCount: 0 }), "loading");
});

test("applied rows that belong to an older query read as LOADING, never EMPTY or stale RESULTS", () => {
  assert.equal(getSearchSourceState({ ...base, rowsMatchQuery: false, rowCount: 5 }), "loading");
});

test("a failed request is ERROR, never a silent EMPTY", () => {
  assert.equal(getSearchSourceState({ ...base, hasError: true, rowCount: 0 }), "error");
});

test("a newer in-flight request outranks an older error", () => {
  assert.equal(getSearchSourceState({ ...base, hasError: true, isFetching: true }), "loading");
});

test("no query falls back to the recommendation list by count", () => {
  assert.equal(getSearchSourceState({ ...base, hasQuery: false, rowCount: 2 }), "results");
  assert.equal(getSearchSourceState({ ...base, hasQuery: false, rowCount: 0 }), "empty");
});

// --- getScreenSearchState: partial failure never hides a good section -------

test("All tab: People errored but Events has rows => RESULTS (Events stays visible)", () => {
  assert.equal(getScreenSearchState(["error", "results"]), "results");
});

test("All tab: one section still loading, none has rows yet => LOADING", () => {
  assert.equal(getScreenSearchState(["loading", "empty"]), "loading");
});

test("All tab: every relevant section errored => ERROR", () => {
  assert.equal(getScreenSearchState(["error", "error"]), "error");
});

test("All tab: all settled, no rows, at least one plain empty => EMPTY", () => {
  assert.equal(getScreenSearchState(["empty", "empty"]), "empty");
  assert.equal(getScreenSearchState(["error", "empty"]), "empty");
});

test("dedicated tab: single error state surfaces as ERROR", () => {
  assert.equal(getScreenSearchState(["error"]), "error");
});

test("no sections => EMPTY", () => {
  assert.equal(getScreenSearchState([]), "empty");
});
