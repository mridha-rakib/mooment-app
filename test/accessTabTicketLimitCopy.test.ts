import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const accessSource = readFileSync(
  join(process.cwd(), "components/eventTabs/AccessTab.tsx"),
  "utf8",
);

const priceContainerSection = accessSource.slice(
  accessSource.indexOf("<View style={styles.priceContainer}>"),
  accessSource.indexOf("</View>", accessSource.indexOf("styles.perTicketText}>per ticket")),
);

test("max-2 banner wording matches the real per-ticket-type rule", () => {
  assert.match(accessSource, /<Text style=\{styles\.alertText\}>You can buy up to 2 tickets per ticket type<\/Text>/);
  assert.doesNotMatch(accessSource, /You can only buy maximum of 2 tickets/);
});

test("free ticket type surfaces claimed / remaining allowance using the existing counters", () => {
  // Free branch renders only once the user has claimed at least one, and reuses
  // alreadyPurchased / remainingAllowed / isLimitReached — no second counter.
  assert.match(
    priceContainerSection,
    /\{isFreeTicket \? \(\s*\n\s*alreadyPurchased > 0 \? \(/,
  );
  assert.match(
    priceContainerSection,
    /\{alreadyPurchased\} claimed • \{isLimitReached \? "Limit reached" : `\$\{remainingAllowed\} left`\}/,
  );
  // claimed === 0 keeps the current clean presentation (nothing rendered).
  assert.match(priceContainerSection, /alreadyPurchased > 0 \? \([\s\S]*?\) : null/);
});

test("paid ticket type purchased / remaining copy is unchanged", () => {
  assert.match(
    priceContainerSection,
    /\{alreadyPurchased\} purchased • \{remainingAllowed\} left/,
  );
  assert.match(priceContainerSection, /<Text style=\{styles\.perTicketText\}>per ticket<\/Text>/);
});

test("free claimed/remaining copy introduces no new counter variable", () => {
  const claimedLine = priceContainerSection.match(/\{alreadyPurchased\} claimed • [^\n]+/)?.[0] ?? "";
  assert.ok(claimedLine, "expected the free claimed line to exist");
  // Only the three pre-existing identifiers may appear in the free copy.
  assert.doesNotMatch(claimedLine, /claimedCount|freeClaimed|remainingClaims|claimsLeft/);
});

test("plus-button disable logic and maxQuantity derivation are untouched", () => {
  assert.match(accessSource, /const maxQuantity = Math\.min\(remainingAllowed, availableCount\);/);
  assert.match(
    accessSource,
    /disabled=\{isUnavailable \|\| isSalesEnded \|\| \(isSelected && quantity >= maxQuantity\)\}/,
  );
});
