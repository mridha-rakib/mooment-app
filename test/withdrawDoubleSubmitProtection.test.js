const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const source = readFileSync(join(process.cwd(), "app/profile-screen/withdraw.tsx"), "utf8");

const handleSubmitStart = source.indexOf("const handleSubmit = async () => {");
const handleSubmitEnd = source.indexOf("  const onboardingIncomplete", handleSubmitStart);

if (handleSubmitStart === -1 || handleSubmitEnd === -1) {
  throw new Error("Withdraw submit handler source block was not found.");
}

const handleSubmitSource = source.slice(handleSubmitStart, handleSubmitEnd);

test("withdrawal submit lock is acquired before the confirmation alert opens", () => {
  assert.match(source, /const \[isConfirming, setIsConfirming\] = useState\(false\);/);
  assert.match(source, /const submitLockRef = useRef\(false\);/);
  assert.match(handleSubmitSource, /if \(!canWithdraw \|\| submitLockRef\.current\) return;/);

  const acquireIndex = handleSubmitSource.indexOf("submitLockRef.current = true;");
  const confirmingIndex = handleSubmitSource.indexOf("setIsConfirming(true);");
  const alertIndex = handleSubmitSource.indexOf("Alert.alert(");

  assert.ok(acquireIndex > -1, "submit lock should be acquired");
  assert.ok(confirmingIndex > acquireIndex, "confirming UI state should follow the ref lock");
  assert.ok(alertIndex > confirmingIndex, "confirmation alert should open only after the lock is active");
});

test("cancel and dismiss release the confirmation lock", () => {
  assert.match(
    handleSubmitSource,
    /const releaseSubmitLock = \(\) => \{\s*submitLockRef\.current = false;\s*setIsConfirming\(false\);/s,
  );
  assert.match(
    handleSubmitSource,
    /text: "Cancel",\s*style: "cancel",\s*onPress: \(\) => \{\s*confirmationHandled = true;\s*releaseSubmitLock\(\);/s,
  );
  assert.match(
    handleSubmitSource,
    /onDismiss: \(\) => \{\s*if \(!confirmationHandled\) \{\s*releaseSubmitLock\(\);/s,
  );
});

test("confirmed withdrawal keeps the lock through the API request and releases it in finally", () => {
  const confirmStart = handleSubmitSource.indexOf('text: "Withdraw"');
  const confirmEnd = handleSubmitSource.indexOf("},\n      ],", confirmStart);
  const confirmSource = handleSubmitSource.slice(confirmStart, confirmEnd);

  assert.match(confirmSource, /if \(!submitLockRef\.current\) return;/);
  assert.match(confirmSource, /confirmationHandled = true;/);
  assert.match(confirmSource, /setIsSubmitting\(true\);/);

  const requestIndex = confirmSource.indexOf("const payout = await requestWithdrawal(");
  const releaseIndex = confirmSource.indexOf("submitLockRef.current = false;");

  assert.ok(requestIndex > -1, "confirmed path should call requestWithdrawal");
  assert.ok(releaseIndex > requestIndex, "submit lock should release after the request path");
});

test("request controls are disabled while confirming or submitting", () => {
  assert.match(source, /!isConfirming\s*&&\s*!isSubmitting/);
  assert.match(source, /editable=\{!isConfirming && !isSubmitting\}/);
  assert.match(source, /disabled=\{availableBalance <= 0 \|\| isConfirming \|\| isSubmitting\}/);
  assert.match(source, /disabled=\{!canWithdraw\}/);
});
