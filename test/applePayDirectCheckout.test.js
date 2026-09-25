const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const source = readFileSync(join(process.cwd(), "lib/stripeCheckout.ts"), "utf8").replace(/\r\n/g, "\n");

const fnStart = source.indexOf("export const startStripeCheckout");
if (fnStart === -1) {
  throw new Error("startStripeCheckout source block was not found.");
}
const fnSource = source.slice(fnStart);

const applePayStart = fnSource.indexOf('if (payload.paymentMethod === "apple_pay") {');
const applePayElse = fnSource.indexOf("} else {", applePayStart);
const applePayBranchEnd = fnSource.indexOf("\n  }\n", applePayElse);
const sharedConfirmIndex = fnSource.indexOf("const order = await confirmCheckoutOrder(checkout.order.id);");

if (applePayStart === -1 || applePayElse === -1 || applePayBranchEnd === -1 || sharedConfirmIndex === -1) {
  throw new Error("Could not locate the Apple Pay / Card branch structure in startStripeCheckout.");
}

const applePayBranch = fnSource.slice(applePayStart, applePayElse);
const cardBranch = fnSource.slice(applePayElse, applePayBranchEnd);

test("Apple Pay branch opens the native sheet directly via confirmPlatformPayPayment", () => {
  assert.match(applePayBranch, /confirmPlatformPayPayment\(checkout\.paymentIntentClientSecret, \{/);
  assert.doesNotMatch(applePayBranch, /initPaymentSheet\(/);
  assert.doesNotMatch(applePayBranch, /presentPaymentSheet\(/);
});

test("Card branch keeps using the existing generic PaymentSheet, untouched by Apple Pay", () => {
  assert.match(cardBranch, /initPaymentSheet\(\{/);
  assert.match(cardBranch, /presentPaymentSheet\(\);/);
  assert.doesNotMatch(cardBranch, /confirmPlatformPayPayment\(/);
});

test("Card PaymentSheet configuration, error handling, and primary button label are preserved", () => {
  assert.match(cardBranch, /merchantDisplayName: checkout\.merchantDisplayName,/);
  assert.match(cardBranch, /paymentIntentClientSecret: checkout\.paymentIntentClientSecret,/);
  assert.match(cardBranch, /returnURL: Linking\.createURL\("stripe-redirect"\),/);
  assert.match(cardBranch, /allowsDelayedPaymentMethods: false,/);
  assert.match(cardBranch, /primaryButtonLabel: "Pay now",/);
  assert.match(cardBranch, /paymentMethodOrder: \["card"\],/);
  assert.match(cardBranch, /if \(initError\) \{\s*throw new Error\(initError\.message\);/);
});

test("both branches share the same confirmCheckoutOrder call and return contract after the if/else", () => {
  assert.ok(sharedConfirmIndex > applePayBranchEnd, "confirmCheckoutOrder must run after both branches, not inside either");
  assert.doesNotMatch(applePayBranch, /confirmCheckoutOrder\(/);
  assert.doesNotMatch(cardBranch, /confirmCheckoutOrder\(/);

  const tail = fnSource.slice(sharedConfirmIndex);
  assert.match(tail, /if \(order\.paymentStatus !== "paid" && order\.paymentStatus !== "processing"\) \{/);
  assert.match(tail, /throw new Error\("Payment was not completed\."\);/);
  assert.match(tail, /return order;/);
});

test("Apple Pay cancellation reuses the existing cancel/cleanup path and returns null without confirming the order", () => {
  const cancelBlockMatch = applePayBranch.match(
    /if \(applePayError\.code === "Canceled"\) \{\s*\/\/[^\n]*\n\s*await cancelCheckoutOrder\(checkout\.order\.id\)\.catch\(\(\) => \{\}\);\s*return null;\s*\}/,
  );
  assert.ok(cancelBlockMatch, "Apple Pay Canceled branch should cancel the order and return null");
});

test("Apple Pay non-cancel errors reuse the existing cleanup and generic error surfacing", () => {
  const errorBlockMatch = applePayBranch.match(
    /await cancelCheckoutOrder\(checkout\.order\.id\)\.catch\(\(\) => \{\}\);\s*throw new Error\(applePayError\.message\);/,
  );
  assert.ok(errorBlockMatch, "Apple Pay non-cancel error branch should cancel the order and throw the Stripe message");
});

test("Card cancellation and error handling remain byte-for-byte the existing behavior", () => {
  assert.match(
    cardBranch,
    /if \(paymentError\.code === "Canceled"\) \{\s*\/\/[^\n]*\n\s*await cancelCheckoutOrder\(checkout\.order\.id\)\.catch\(\(\) => \{\}\);\s*return null;\s*\}/,
  );
  assert.match(
    cardBranch,
    /await cancelCheckoutOrder\(checkout\.order\.id\)\.catch\(\(\) => \{\}\);\s*throw new Error\(paymentError\.message\);/,
  );
});

test("Apple Pay params reuse existing backend-returned country/currency/amount values, no hardcoded US/USD", () => {
  assert.match(applePayBranch, /merchantCountryCode: checkout\.merchantCountryCode,/);
  assert.match(applePayBranch, /currencyCode: checkout\.order\.currency\.toUpperCase\(\),/);
  assert.match(applePayBranch, /amount: checkout\.order\.totalAmount\.toFixed\(2\),/);
  assert.doesNotMatch(applePayBranch, /"US"|"USD"|"usd"/);
});

test("Apple Pay cart total matches checkout.order.totalAmount exactly (major-unit decimal, not cents)", () => {
  assert.doesNotMatch(applePayBranch, /totalAmount\s*\*\s*100/);
  assert.match(applePayBranch, /label: checkout\.merchantDisplayName,/);
  assert.match(applePayBranch, /paymentType: PlatformPay\.PaymentType\.Immediate,/);
});

test("merchantIdentifier configuration is not duplicated for the Apple Pay branch", () => {
  const initStripeCalls = fnSource.match(/merchantIdentifier: stripeMerchantIdentifier,/g) ?? [];
  assert.equal(initStripeCalls.length, 1, "merchantIdentifier should only be configured once, via initStripe()");
  assert.doesNotMatch(applePayBranch, /merchantIdentifier/);
});

test("apple_pay iOS-only and merchant-identifier guard rails remain before any SDK call", () => {
  assert.match(
    fnSource,
    /if \(payload\.paymentMethod === "apple_pay" && Platform\.OS !== "ios"\) \{\s*throw new Error\("Apple Pay is only available on iOS devices\."\);\s*\}/,
  );
  assert.match(
    fnSource,
    /if \(payload\.paymentMethod === "apple_pay" && !stripeMerchantIdentifier\) \{/,
  );
});
