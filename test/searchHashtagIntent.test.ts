import assert from "node:assert/strict";
import test from "node:test";
import { getHashtagSearchIntent, isSearchSectionVisible } from "../lib/searchHashtagIntent";

// --- Intent detection ---------------------------------------------------

test("All + plain text: normal text search, never reinterpreted as a hashtag", () => {
  const intent = getHashtagSearchIntent("music", "All");
  assert.equal(intent.isExplicitHashtagIntent, false);
  assert.equal(intent.hashtagSectionIntentActive, false);
  assert.equal(intent.hashtagSectionQuery, "");
});

test("All + #hashtag: explicit hashtag intent, All tab is not implicated in the query text", () => {
  const intent = getHashtagSearchIntent("#bd", "All");
  assert.equal(intent.isExplicitHashtagIntent, true);
  assert.equal(intent.hashtagSectionIntentActive, true);
  assert.equal(intent.hashtagSectionQuery, "bd");
});

test("People + plain text: never treated as hashtag intent", () => {
  const intent = getHashtagSearchIntent("music", "People");
  assert.equal(intent.isExplicitHashtagIntent, false);
  assert.equal(intent.hashtagSectionIntentActive, false);
});

test("Events + plain text: normal Event text search (no hashtag intent)", () => {
  const intent = getHashtagSearchIntent("music", "Events");
  assert.equal(intent.isExplicitHashtagIntent, false);
  assert.equal(intent.hashtagSectionIntentActive, false);
});

test("Events + #hashtag: Event hashtag search intent, scoped by isExplicitHashtagIntent", () => {
  const intent = getHashtagSearchIntent("#bd", "Events");
  assert.equal(intent.isExplicitHashtagIntent, true);
  assert.equal(intent.hashtagSectionQuery, "bd");
});

test("Hashtags tab + plain text: the tab itself expresses hashtag intent, no # required", () => {
  const intent = getHashtagSearchIntent("bd", "Hashtags");
  assert.equal(intent.isExplicitHashtagIntent, false);
  assert.equal(intent.hashtagSectionIntentActive, true);
  assert.equal(intent.hashtagSectionQuery, "bd");
});

test("Hashtags tab + #hashtag: still hashtag intent", () => {
  const intent = getHashtagSearchIntent("#bd", "Hashtags");
  assert.equal(intent.hashtagSectionIntentActive, true);
  assert.equal(intent.hashtagSectionQuery, "bd");
});

test("Hashtags tab + empty query: no intent yet", () => {
  const intent = getHashtagSearchIntent("", "Hashtags");
  assert.equal(intent.hashtagSectionIntentActive, false);
  assert.equal(intent.hashtagSectionQuery, "");
});

// --- Section visibility ---------------------------------------------------

test("All + #bd with Posts only: PostsInline section is visible under All", () => {
  assert.equal(isSearchSectionVisible("PostsInline", "All"), true);
});

test("PostsInline is never visible under People, Events, or Hashtags — it has no tab of its own", () => {
  assert.equal(isSearchSectionVisible("PostsInline", "People"), false);
  assert.equal(isSearchSectionVisible("PostsInline", "Events"), false);
  assert.equal(isSearchSectionVisible("PostsInline", "Hashtags"), false);
});

test("Events section remains visible under All and under its own Events tab", () => {
  assert.equal(isSearchSectionVisible("Events", "All"), true);
  assert.equal(isSearchSectionVisible("Events", "Events"), true);
  assert.equal(isSearchSectionVisible("Events", "People"), false);
});

test("Hashtags shortcut section remains visible under All and under its own Hashtags tab", () => {
  assert.equal(isSearchSectionVisible("Hashtags", "All"), true);
  assert.equal(isSearchSectionVisible("Hashtags", "Hashtags"), true);
});

test("People section remains visible under All and under its own People tab only", () => {
  assert.equal(isSearchSectionVisible("People", "All"), true);
  assert.equal(isSearchSectionVisible("People", "People"), true);
  assert.equal(isSearchSectionVisible("People", "Events"), false);
});
