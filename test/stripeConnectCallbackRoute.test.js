const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

const bankAccountSource = read("app/profile-screen/bank-account.tsx");
const addStripeSource = read("app/profile-screen/add-stripe.tsx");
const appEnvExample = read(".env.example");

test("Bank Account is the canonical Stripe Connect callback target", () => {
  assert.match(
    bankAccountSource,
    /EXPO_PUBLIC_STRIPE_CONNECT_CALLBACK_PATH \|\| "\/profile-screen\/bank-account"/,
  );
  assert.match(
    appEnvExample,
    /^EXPO_PUBLIC_STRIPE_CONNECT_CALLBACK_PATH=\/profile-screen\/bank-account$/m,
  );
});

test("Bank Account still owns Stripe onboarding and account refresh after return", () => {
  assert.match(bankAccountSource, /Linking\.createURL\(stripeConnectCallbackPath,/);
  assert.match(bankAccountSource, /createStripeConnectOnboardingLink\(\{ returnUrl \}\)/);
  assert.match(bankAccountSource, /WebBrowser\.openAuthSessionAsync\(onboardingLink\.onboardingUrl, returnUrl\)/);
  assert.match(
    bankAccountSource,
    /if \(result\.type === "success" \|\| result\.type === "dismiss"\) \{\s*setConnectedAccount\(await getStripeConnectAccount\(\)\);/s,
  );
});

test("Bank Account hosted Stripe flow can refresh after Express Dashboard dismissal", () => {
  assert.match(bankAccountSource, /Manage Account/);
  assert.match(bankAccountSource, /result\.type === "success" \|\| result\.type === "dismiss"/);
  assert.match(bankAccountSource, /setConnectedAccount\(await getStripeConnectAccount\(\)\);/);
});

test("Bank Account flow does not collect or send raw debit card fields", () => {
  assert.doesNotMatch(bankAccountSource, /cardNumber|card number|expir|CVC|cvc|tokeniz/i);
});

test("add-stripe remains as a compatibility route and does not duplicate Stripe logic", () => {
  assert.match(addStripeSource, /router\.replace\("\/profile-screen\/bank-account" as never\)/);
  assert.doesNotMatch(addStripeSource, /createStripeConnectOnboardingLink/);
  assert.doesNotMatch(addStripeSource, /getStripeConnectAccount/);
  assert.doesNotMatch(addStripeSource, /openAuthSessionAsync/);
  assert.doesNotMatch(addStripeSource, /EXPO_PUBLIC_STRIPE_CONNECT_CALLBACK_PATH/);
});
