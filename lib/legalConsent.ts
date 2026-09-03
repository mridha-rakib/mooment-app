export const DEFAULT_CONSENT_LOCALE = "en-US";

/**
 * Best-effort current device locale (BCP-47 tag, e.g. "en-US") for the signup
 * legal-consent audit record. Falls back to {@link DEFAULT_CONSENT_LOCALE} when
 * the runtime does not expose a resolvable locale.
 */
export const getConsentLocale = (): string => {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().locale;

    if (typeof resolved === "string" && resolved.trim().length >= 2) {
      return resolved.trim();
    }
  } catch {
    // Fall through to the default below.
  }

  return DEFAULT_CONSENT_LOCALE;
};
