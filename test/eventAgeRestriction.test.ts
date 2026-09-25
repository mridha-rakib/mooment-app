import assert from "node:assert/strict";
import test from "node:test";
import { formatEventAgeRestriction, getEventAgeAdmissionNotice } from "../lib/eventAgeRestriction";

// EVT-010A — the single canonical age-restriction label, used by every
// display surface (Feed, Search, Map, Event Detail). Pure function, tested
// at runtime (not source-text regex) since it has zero react-native
// dependency.

test("18_plus formats to the canonical '18+'", () => {
  assert.equal(formatEventAgeRestriction("18_plus"), "18+");
});

test("21_plus formats to the canonical '21+'", () => {
  assert.equal(formatEventAgeRestriction("21_plus"), "21+");
});

test("all_ages formats to the canonical 'All Ages'", () => {
  assert.equal(formatEventAgeRestriction("all_ages"), "All Ages");
});

test("never outputs alternate wording like '18+ only' / '21+ only' / 'All ages'", () => {
  assert.notEqual(formatEventAgeRestriction("18_plus"), "18+ only");
  assert.notEqual(formatEventAgeRestriction("21_plus"), "21+ only");
  assert.notEqual(formatEventAgeRestriction("all_ages"), "All ages");
});

// ── Legacy/unknown/null safety — never crashes, uses the existing approved
// fallback (the same "else -> All Ages" behavior both pre-existing
// formatters, MapContainer's formatAgeLimit and AboutTab's formatAgeLabel,
// already used before this consolidation). ──────────────────────────────

test("null is treated as unrestricted (does not crash, falls back to All Ages)", () => {
  assert.equal(formatEventAgeRestriction(null), "All Ages");
});

test("undefined is treated as unrestricted (does not crash, falls back to All Ages)", () => {
  assert.equal(formatEventAgeRestriction(undefined), "All Ages");
});

test("an unrecognized/legacy string value falls back to All Ages without crashing", () => {
  assert.equal(formatEventAgeRestriction("25_plus" as never), "All Ages");
  assert.equal(formatEventAgeRestriction("" as never), "All Ages");
  assert.equal(formatEventAgeRestriction("18+" as never), "All Ages");
});

test("output is deterministic across repeated calls with the same input", () => {
  for (let i = 0; i < 5; i += 1) {
    assert.equal(formatEventAgeRestriction("18_plus"), "18+");
    assert.equal(formatEventAgeRestriction("21_plus"), "21+");
    assert.equal(formatEventAgeRestriction("all_ages"), "All Ages");
    assert.equal(formatEventAgeRestriction(null), "All Ages");
  }
});

// ── EVT-010B — MVP admission notice. Informational only: communicates the
// host/venue's admission requirement, never gates an action. ──────────────

test("all_ages has no admission notice", () => {
  assert.equal(getEventAgeAdmissionNotice("all_ages"), null);
});

test("null/undefined/unknown values have no admission notice", () => {
  assert.equal(getEventAgeAdmissionNotice(null), null);
  assert.equal(getEventAgeAdmissionNotice(undefined), null);
  assert.equal(getEventAgeAdmissionNotice("25_plus" as never), null);
});

test("18_plus returns the exact required 18+ admission notice", () => {
  assert.equal(
    getEventAgeAdmissionNotice("18_plus"),
    "This event is 18+. Each attendee must meet the age requirement for admission. Valid ID may be required by the host or venue.",
  );
});

test("21_plus returns the exact required 21+ admission notice", () => {
  assert.equal(
    getEventAgeAdmissionNotice("21_plus"),
    "This event is 21+. Each attendee must meet the age requirement for admission. Valid ID may be required by the host or venue.",
  );
});
