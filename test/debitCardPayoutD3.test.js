const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

const payoutSettingsSource = read("lib/payoutSettings.ts");
const withdrawalMethodSource = read("app/profile-screen/withdrawal-method.tsx");
const withdrawSource = read("app/profile-screen/withdraw.tsx");

const api = {
  lastPatchPayload: null,
  get: async () => ({ data: { data: { settings: validSettings } } }),
  patch: async (_path, payload) => {
    api.lastPatchPayload = payload;
    return { data: { data: { settings: validSettings } } };
  },
};

const transpiled = ts.transpileModule(payoutSettingsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const sandbox = {
  exports: {},
  require: (id) => {
    if (id === "@/lib/api") return { api };
    return require(id);
  },
  Error,
  Set,
};

vm.createContext(sandbox);
vm.runInContext(transpiled, sandbox);

const {
  formatEligibleInstantDebitCardLabel,
  getInstantPayoutUnavailableMessage,
  isInstantDebitCardSelectable,
  parsePayoutSettingsResponse,
  updatePayoutSettings,
} = sandbox.exports;

const validCard = {
  id: "card_123",
  brand: "Visa",
  last4: "4242",
  currency: "usd",
  country: "US",
  availablePayoutMethods: ["standard", "instant"],
};

const validSettings = {
  payoutPreference: "manual",
  withdrawalMethod: "bank_transfer",
  instantPayoutEligible: true,
  eligibleInstantDebitCard: validCard,
  instantPayoutUnavailableReason: null,
};

test("D3: backend-confirmed instant debit card eligibility makes Debit Card selectable", () => {
  const settings = parsePayoutSettingsResponse(validSettings);

  assert.equal(settings.instantPayoutEligible, true);
  assert.equal(isInstantDebitCardSelectable(settings), true);
});

test("D3: eligible card displays masked brand and last4 only", () => {
  const settings = parsePayoutSettingsResponse(validSettings);

  assert.equal(formatEligibleInstantDebitCardLabel(settings.eligibleInstantDebitCard), "Visa •••• 4242");
  assert.deepEqual(Object.keys(settings.eligibleInstantDebitCard).sort(), [
    "availablePayoutMethods",
    "brand",
    "country",
    "currency",
    "id",
    "last4",
  ]);
});

test("D3: instantPayoutEligible false keeps Debit Card non-selectable", () => {
  const settings = parsePayoutSettingsResponse({
    ...validSettings,
    instantPayoutEligible: false,
  });

  assert.equal(isInstantDebitCardSelectable(settings), false);
});

test("D3: missing eligibleInstantDebitCard keeps Debit Card non-selectable", () => {
  const settings = parsePayoutSettingsResponse({
    ...validSettings,
    eligibleInstantDebitCard: null,
  });

  assert.equal(isInstantDebitCardSelectable(settings), false);
});

test("D3: malformed eligible card metadata is ignored without crashing", () => {
  const settings = parsePayoutSettingsResponse({
    ...validSettings,
    eligibleInstantDebitCard: { ...validCard, last4: null },
  });

  assert.equal(settings.eligibleInstantDebitCard, null);
  assert.equal(isInstantDebitCardSelectable(settings), false);
});

test("D3: cards without instant in availablePayoutMethods are not selectable", () => {
  const settings = parsePayoutSettingsResponse({
    ...validSettings,
    eligibleInstantDebitCard: {
      ...validCard,
      availablePayoutMethods: ["standard"],
    },
  });

  assert.equal(settings.eligibleInstantDebitCard, null);
  assert.equal(isInstantDebitCardSelectable(settings), false);
});

test("D3: bank_transfer remains selectable and unchanged in the method screen", () => {
  assert.match(withdrawalMethodSource, /value: "bank_transfer"/);
  assert.match(withdrawalMethodSource, /label: "Bank Transfer"/);
  assert.match(withdrawalMethodSource, /description: "Standard payout via bank transfer\."/);
});

test("D3: selecting eligible Debit Card saves only the instant_debit_card method", async () => {
  api.lastPatchPayload = null;

  await updatePayoutSettings({ withdrawalMethod: "instant_debit_card" });

  assert.deepEqual(api.lastPatchPayload, { withdrawalMethod: "instant_debit_card" });
  assert.equal(Object.prototype.hasOwnProperty.call(api.lastPatchPayload, "eligibleInstantDebitCard"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(api.lastPatchPayload, "cardId"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(api.lastPatchPayload, "externalAccountId"), false);
});

test("D3: frontend does not send or trust a card external-account ID for selection", () => {
  assert.match(withdrawalMethodSource, /updatePayoutSettings\(\{ withdrawalMethod: selected \}\)/);
  assert.doesNotMatch(withdrawalMethodSource, /eligibleInstantDebitCard\.id|cardId|externalAccountId/);
});

test("D3: method screen does not expose fake Coming Soon or Credit Card payout copy", () => {
  assert.doesNotMatch(withdrawalMethodSource, /Coming Soon|Credit Card/);
});

test("D3: saved instant_debit_card becoming ineligible stays a safe unavailable state", () => {
  assert.match(withdrawalMethodSource, /setSelected\(data\.withdrawalMethod\)/);
  assert.match(withdrawalMethodSource, /isInstantDebitCardSelectable\(settings\)/);
  assert.match(withdrawalMethodSource, /Unavailable/);
  assert.doesNotMatch(withdrawalMethodSource, /updatePayoutSettings\(\{ withdrawalMethod: "bank_transfer" \}\)/);
});

test("D3: backend error state keeps existing Retry handling", () => {
  assert.match(withdrawalMethodSource, /Failed to load withdrawal settings\. Please try again\./);
  assert.match(withdrawalMethodSource, /onPress=\{loadSettings\}/);
  assert.match(withdrawalMethodSource, />Retry<\/Text>/);
});

test("D3: light and dark source styling remain wired through the existing theme", () => {
  assert.match(withdrawalMethodSource, /const \{ colors, isDark \} = useTheme\(\);/);
  assert.match(withdrawalMethodSource, /StatusBar barStyle=\{isDark \? "light-content" : "dark-content"\}/);
  assert.match(withdrawalMethodSource, /backgroundColor: colors\.card/);
});

test("D3: Withdrawal screen execution and neutral fee copy remain preserved", () => {
  assert.match(withdrawSource, /requestWithdrawal\(\s*isWithdrawAll \? undefined : \{ amount \},\s*\)/s);
  assert.match(withdrawSource, />May apply<\/Text>/);
  assert.doesNotMatch(withdrawSource, /processingFee|payoutFee|feeAmount/);
});

test("D3: known unavailable reasons map to friendly text without exposing raw codes", () => {
  assert.equal(getInstantPayoutUnavailableMessage("no_external_card"), "No eligible debit card connected");
  assert.equal(
    getInstantPayoutUnavailableMessage("card_not_instant_eligible"),
    "Debit card is not eligible for instant payout",
  );
  assert.equal(getInstantPayoutUnavailableMessage("multiple_eligible_cards"), "Instant payout unavailable");
});
