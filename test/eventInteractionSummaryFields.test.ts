import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Own Timeline / Profile Hosted Events interaction-count fix.
//
// Root cause (frontend half): the Ticket Wallet -> Own Timeline event card
// reused the same EventFeedCard as the Main Feed, but its data came through
// ticketWalletEventToEventResponse() (app/lib/events.ts), which never set
// interactionMomentId/likesCount/commentsCount/sharesCount/isLiked/isSaved —
// so EventFeedCard's `event.likesCount ?? 0` etc. silently rendered 0/0/0
// even though the backend now supplies real values (see
// xenog-api/test/event-interaction-consistency.test.ts for the backend
// half: EventInteractionSummaryService + its two new call sites,
// EventService.listProfileEventsByUserId and
// CheckoutPaymentService.getMyTicketWallet).
//
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const eventsSource = readFileSync(join(process.cwd(), "lib/events.ts"), "utf8");
const paymentsSource = readFileSync(join(process.cwd(), "lib/payments.ts"), "utf8");

test("ticketWalletEventToEventResponse passes through the backend's interaction summary instead of omitting it", () => {
  assert.match(eventsSource, /interactionMomentId: walletEvent\.interactionMomentId,/);
  assert.match(eventsSource, /likesCount: walletEvent\.likesCount,/);
  assert.match(eventsSource, /commentsCount: walletEvent\.commentsCount,/);
  assert.match(eventsSource, /sharesCount: walletEvent\.sharesCount,/);
  assert.match(eventsSource, /isLiked: walletEvent\.isLiked,/);
  assert.match(eventsSource, /isSaved: walletEvent\.isSaved,/);
});

test("ticketWalletEventToEventResponse does not hardcode 0/false for interaction fields", () => {
  // Guards against silently reintroducing the original bug: a literal
  // fallback like `walletEvent.likesCount ?? 0` here would mask a backend
  // regression the same way EventFeedCard's own `?? 0` masked the missing
  // field in the first place. This mapper should pass the value through
  // as-is (undefined stays undefined) and let the component decide.
  assert.doesNotMatch(eventsSource, /likesCount: walletEvent\.likesCount \?\? 0/);
  assert.doesNotMatch(eventsSource, /commentsCount: walletEvent\.commentsCount \?\? 0/);
  assert.doesNotMatch(eventsSource, /sharesCount: walletEvent\.sharesCount \?\? 0/);
  assert.doesNotMatch(eventsSource, /isLiked: walletEvent\.isLiked \?\? false/);
});

test("TicketWalletItem's event type declares the canonical interaction summary fields", () => {
  assert.match(paymentsSource, /interactionMomentId\?: string;/);
  assert.match(paymentsSource, /likesCount\?: number;/);
  assert.match(paymentsSource, /commentsCount\?: number;/);
  assert.match(paymentsSource, /sharesCount\?: number;/);
  assert.match(paymentsSource, /isLiked\?: boolean;/);
  assert.match(paymentsSource, /isSaved\?: boolean;/);
});
