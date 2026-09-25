import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CONSENT_LOCALE, getConsentLocale } from "../lib/legalConsent";

test("getConsentLocale returns a non-empty BCP-47-ish locale tag", () => {
  const locale = getConsentLocale();
  assert.equal(typeof locale, "string");
  assert.ok(locale.trim().length >= 2);
});

test("getConsentLocale matches the runtime's resolved locale when available", () => {
  let resolved: string | undefined;
  try {
    resolved = Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    resolved = undefined;
  }

  if (resolved && resolved.trim().length >= 2) {
    assert.equal(getConsentLocale(), resolved.trim());
  } else {
    assert.equal(getConsentLocale(), DEFAULT_CONSENT_LOCALE);
  }
});

test("getConsentLocale falls back to the default when Intl throws", () => {
  const original = Intl.DateTimeFormat;

  try {
    // @ts-expect-error - deliberately breaking Intl for the fallback path
    Intl.DateTimeFormat = () => {
      throw new Error("no Intl");
    };
    assert.equal(getConsentLocale(), DEFAULT_CONSENT_LOCALE);
  } finally {
    Intl.DateTimeFormat = original;
  }
});
