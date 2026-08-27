import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const checkoutSource = readFileSync(join(process.cwd(), "app/event-screen/checkout.tsx"), "utf8");
const eventSource = readFileSync(join(process.cwd(), "app/event-screen/event.tsx"), "utf8");

const handleContinueSection = checkoutSource.slice(
  checkoutSource.indexOf("const handleContinue = async () =>"),
  checkoutSource.indexOf("return (", checkoutSource.indexOf("const handleContinue = async () =>")),
);

const renderSection = checkoutSource.slice(checkoutSource.indexOf("return ("));
const eventFooterSection = eventSource.slice(
  eventSource.indexOf("<View style={styles.priceContainer}>"),
  eventSource.indexOf("</Modal>", eventSource.indexOf("<View style={styles.priceContainer}>")),
);
const handleTicketCtaSection = eventSource.slice(
  eventSource.indexOf("const handleTicketCtaPress = () =>"),
  eventSource.indexOf("const handleSubmitHostReview = async () =>"),
);

test("checkout classifies free state only from a loaded final quote", () => {
  assert.match(checkoutSource, /const isFreeCheckout = quote !== null && quote\.totalAmount <= 0;/);
  assert.doesNotMatch(checkoutSource, /const isFreeCheckout = !quote/);
  assert.doesNotMatch(checkoutSource, /ticketType.*free|ticketPrice.*<= 0/);
});

test("free checkout hides only payment-specific UI while preserving checkout content", () => {
  assert.match(renderSection, /\{isPaidCheckout \? \(/);
  assert.match(renderSection, /<PaymentMethods\s*\n\s*payWith=\{payWith\}\s*\n\s*onMethodChange=\{setPayWith\}\s*\n\s*\/>/);
  assert.match(renderSection, /<SecurityBanner \/>/);
  assert.match(renderSection, /<EventCard/);
  assert.match(renderSection, /<AnonymousBuy\s*\n\s*active=\{anonymousBuy\}/);
  assert.match(renderSection, /<OrderSummary/);
  assert.match(renderSection, /<TermsAgreement/);
});

test("payment-specific UI is gated on a loaded paid quote, never on quote-not-loaded", () => {
  // Three distinct states: (1) loading/null, (2) loaded free, (3) loaded paid.
  assert.match(checkoutSource, /const isPaidCheckout = quote !== null && quote\.totalAmount > 0;/);
  // The Card / Apple Pay + SecurityBanner block must be driven by isPaidCheckout,
  // so quote === null (loading) renders neither — no payment flash.
  assert.match(renderSection, /\{isPaidCheckout \? \(\s*\n\s*<>\s*\n\s*<PaymentMethods/);
  assert.doesNotMatch(renderSection, /\{!isFreeCheckout \? \(/);
});

test("free checkout CTA says Join Event while paid checkout keeps Continue to payment", () => {
  assert.match(renderSection, /buttonText=\{isFreeCheckout \? "Join Event" : "Continue to payment"\}/);
  assert.match(renderSection, /disabled=\{!agreed \|\| isPaying \|\| isQuoteLoading \|\| !quote\}/);
});

test("free submit still uses createCheckoutIntent and does not invoke Stripe checkout", () => {
  assert.match(handleContinueSection, /if \(quote\.totalAmount <= 0\) \{[\s\S]*?const checkout = await createCheckoutIntent\(\{/);
  assert.match(handleContinueSection, /paymentMethod: "card"/);
  assert.match(handleContinueSection, /anonymous: anonymousBuy/);
  assert.match(handleContinueSection, /acceptedTerms: agreed/);
  const freeBranch = handleContinueSection.slice(
    handleContinueSection.indexOf("if (quote.totalAmount <= 0)"),
    handleContinueSection.indexOf("} else {", handleContinueSection.indexOf("if (quote.totalAmount <= 0)")),
  );
  assert.doesNotMatch(freeBranch, /startStripeCheckout/);
});

test("paid submit still uses the existing Stripe checkout path and payment method mapping", () => {
  assert.match(handleContinueSection, /} else \{[\s\S]*?const stripeResult = await startStripeCheckout\(/);
  assert.match(handleContinueSection, /paymentMethod: payWith === "Apple" \? "apple_pay" : "card"/);
  assert.match(handleContinueSection, /anonymous: anonymousBuy/);
  assert.match(handleContinueSection, /acceptedTerms: agreed/);
});

test("event footer CTA keeps Select Ticket with no selection and Join Event after selection", () => {
  assert.match(eventFooterSection, /selectedTicketSalesEnded \? "Sales Ended" : selectedTicket \? "Join Event" : "Select Ticket"/);
  assert.doesNotMatch(eventFooterSection, /selectedTicket \? "Buy Now" : "Select Ticket"/);
});

test("event CTA handler behavior remains the existing ticket-selection and checkout routing", () => {
  assert.match(handleTicketCtaSection, /if \(!selectedTicket \|\| !selectedTicketKey\) \{[\s\S]*?setActiveTab\("Access"\);[\s\S]*?setAccessSubTab\("Tickets"\);[\s\S]*?return;/);
  assert.match(handleTicketCtaSection, /handleBuySelectedTicket\(\);/);
});
