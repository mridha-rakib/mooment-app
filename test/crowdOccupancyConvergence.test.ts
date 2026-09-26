import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
const payments = read("lib/payments.ts");
const home = read("app/(tabs)/home.tsx");
const map = read("components/home/MapContainer.tsx");
const detail = read("app/event-screen/event.tsx");

const functionBody = (source: string, name: string) => {
  const start = source.indexOf(`export const ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const next = source.indexOf("\nexport const ", start + 1);
  return source.slice(start, next >= 0 ? next : undefined);
};

test("uses a narrow admission-change signal without encoding crowd values", () => {
  assert.match(payments, /EVENT_ADMISSION_CHANGED_EVENT = "xenog\.eventAdmission\.changed"/);
  assert.match(payments, /DeviceEventEmitter\.emit\(EVENT_ADMISSION_CHANGED_EVENT\)/);
  assert.doesNotMatch(
    payments.slice(payments.indexOf("EVENT_ADMISSION_CHANGED_EVENT"), payments.indexOf("const invalidateEventCachesForOrder")),
    /not_busy|very_busy|percentage/i,
  );
});

test("only successful crowd-relevant payment mutations emit the admission-change signal", () => {
  for (const name of ["refundCheckoutOrder", "cancelTicketPass", "scanTicketQrCode"]) {
    const body = functionBody(payments, name);
    const validation = body.indexOf("if (!");
    const emission = body.indexOf("emitEventAdmissionChanged()");

    assert.ok(emission > validation, `${name} must emit only after a complete response`);
    assert.ok(emission < body.indexOf("return"), `${name} must emit before returning success`);
    assert.match(body, /emitTicketWalletChanged\(\);/, `${name} preserves wallet updates`);
  }
});

test("shares remain wallet-only because ownership changes do not change occupancy", () => {
  for (const name of ["shareTicketWithFriend", "cancelTicketShare"]) {
    assert.doesNotMatch(functionBody(payments, name), /emitEventAdmissionChanged/);
  }
});

test("Feed listens while visible, uses its existing loadFeed path, and cleans up", () => {
  assert.match(home, /DeviceEventEmitter\.addListener\(\s*EVENT_ADMISSION_CHANGED_EVENT/);
  assert.match(home, /if \(selectedType === "Feed"\) \{\s*void loadFeed\(feedAudienceRef\.current\)/);
  assert.match(home, /admissionChangedSubscription\.remove\(\)/);
  assert.doesNotMatch(home, /EVENT_ADMISSION_CHANGED_EVENT[\s\S]{0,500}setInterval/);
});

test("Map refreshes through its existing refresh key and preserves crowd-only changes", () => {
  assert.match(map, /DeviceEventEmitter\.addListener\(\s*EVENT_ADMISSION_CHANGED_EVENT/);
  assert.match(map, /\(\) => setFocusRefreshKey\(\(key\) => key \+ 1\)/);
  assert.match(map, /admissionChangedSubscription\.remove\(\)/);
  assert.match(map, /marker\.crowdStatus === nextMarker\.crowdStatus/);
  assert.doesNotMatch(map, /setInterval|WebSocket|socket\.io/);
});

test("Event Detail listens only while focused, reuses detail loading, and skips draft previews", () => {
  assert.match(detail, /DeviceEventEmitter\.addListener\(\s*EVENT_ADMISSION_CHANGED_EVENT/);
  assert.match(detail, /event\?\.status !== "draft"\) \{\s*void loadEventDetails\(/);
  assert.match(detail, /admissionChangedSubscription\.remove\(\)/);
  assert.doesNotMatch(detail, /EVENT_ADMISSION_CHANGED_EVENT[\s\S]{0,500}api\.get\(/);
});
