const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const source = readFileSync(join(process.cwd(), "lib/stripeConnect.ts"), "utf8");
const parserStart = source.indexOf("const ONBOARDING_STATUSES");
const parserEnd = source.indexOf("export const getStripeConnectAccount");

if (parserStart === -1 || parserEnd === -1) {
  throw new Error("Stripe Connect parser source block was not found.");
}

const parserSource = source
  .slice(parserStart, parserEnd)
  .replace("export const parseStripeConnectAccountResponse", "globalThis.parseStripeConnectAccountResponse");

const transpiled = ts.transpileModule(parserSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const sandbox = { Set, Error };
vm.createContext(sandbox);
vm.runInContext(transpiled, sandbox);

const parseStripeConnectAccountResponse = sandbox.parseStripeConnectAccountResponse;

const validAccount = {
  id: "conn_123",
  userId: "user_123",
  stripeAccountId: "acct_123456789",
  email: "host@example.com",
  country: "US",
  livemode: false,
  detailsSubmitted: true,
  chargesEnabled: true,
  payoutsEnabled: true,
  onboardingStatus: "completed",
  requirements: {
    currentlyDue: [],
    eventuallyDue: [],
    pastDue: [],
    disabledReason: null,
  },
  payoutAccounts: [
    {
      id: "ba_123",
      type: "bank_account",
      name: "Test Bank",
      bankName: "Test Bank",
      last4: "6789",
      currency: "usd",
      country: "US",
      status: "verified",
      defaultForCurrency: true,
      availablePayoutMethods: ["standard"],
    },
  ],
  lastSyncedAt: "2026-08-31T00:00:00.000Z",
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

test("valid Stripe Connect account responses are accepted unchanged for connected UI fields", () => {
  const parsed = parseStripeConnectAccountResponse(validAccount);

  assert.equal(parsed.stripeAccountId, validAccount.stripeAccountId);
  assert.equal(parsed.payoutsEnabled, true);
  assert.equal(parsed.chargesEnabled, true);
  assert.equal(parsed.detailsSubmitted, true);
  assert.equal(parsed.onboardingStatus, "completed");
  assert.equal(parsed.requirements.disabledReason, null);
  assert.equal(parsed.payoutAccounts[0].name, "Test Bank");
  assert.equal(parsed.payoutAccounts[0].last4, "6789");
});

test("external debit card metadata is parsed with safe display fields only", () => {
  const parsed = parseStripeConnectAccountResponse({
    ...validAccount,
    payoutAccounts: [
      {
        id: "card_123",
        type: "card",
        name: "Visa card",
        brand: "Visa",
        last4: "4242",
        currency: "usd",
        country: "US",
        defaultForCurrency: true,
        availablePayoutMethods: ["standard", "instant"],
      },
    ],
  });

  assert.deepEqual(Object.keys(parsed.payoutAccounts[0]).sort(), [
    "availablePayoutMethods",
    "bankName",
    "brand",
    "country",
    "currency",
    "defaultForCurrency",
    "id",
    "last4",
    "name",
    "status",
    "type",
  ]);
  assert.equal(parsed.payoutAccounts[0].type, "card");
  assert.equal(parsed.payoutAccounts[0].brand, "Visa");
  assert.equal(parsed.payoutAccounts[0].last4, "4242");
  assert.deepEqual(parsed.payoutAccounts[0].availablePayoutMethods, ["standard", "instant"]);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.payoutAccounts[0], "number"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.payoutAccounts[0], "cvc"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.payoutAccounts[0], "exp_month"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.payoutAccounts[0], "exp_year"), false);
});

test("null Stripe Connect account responses remain genuine no-account responses", () => {
  assert.equal(parseStripeConnectAccountResponse(null), null);
});

test("malformed critical Stripe account IDs are rejected instead of normalized to no-account", () => {
  assert.throws(
    () => parseStripeConnectAccountResponse({ ...validAccount, stripeAccountId: undefined }),
    /Stripe Connect account response was incomplete/,
  );
  assert.throws(
    () => parseStripeConnectAccountResponse({ ...validAccount, stripeAccountId: 123 }),
    /Stripe Connect account response was incomplete/,
  );
});

test("missing requirements are rejected because connected UI reads the nested object", () => {
  assert.throws(
    () => parseStripeConnectAccountResponse({ ...validAccount, requirements: undefined }),
    /Stripe Connect account response was incomplete/,
  );
});

test("missing payoutAccounts normalize to an empty list but wrong shapes are rejected", () => {
  const parsed = parseStripeConnectAccountResponse({
    ...validAccount,
    payoutAccounts: undefined,
  });

  assert.equal(parsed.payoutAccounts.length, 0);
  assert.throws(
    () => parseStripeConnectAccountResponse({ ...validAccount, payoutAccounts: { id: "ba_123" } }),
    /Stripe Connect account response was incomplete/,
  );
});

test("malformed nested requirements and payout account fields are rejected", () => {
  assert.throws(
    () =>
      parseStripeConnectAccountResponse({
        ...validAccount,
        requirements: { ...validAccount.requirements, currentlyDue: [123] },
      }),
    /Stripe Connect account response was incomplete/,
  );
  assert.throws(
    () =>
      parseStripeConnectAccountResponse({
        ...validAccount,
        payoutAccounts: [{ ...validAccount.payoutAccounts[0], last4: null }],
      }),
    /Stripe Connect account response was incomplete/,
  );
});
