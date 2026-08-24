import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const attendeeListSource = readFileSync(join(process.cwd(), "app/profile-screen/attendee-list.tsx"), "utf8");
const paymentsSource = readFileSync(join(process.cwd(), "lib/payments.ts"), "utf8");
const eventsSource = readFileSync(join(process.cwd(), "lib/events.ts"), "utf8");

test("payment DTO parsing accepts anonymous attendee rows without requiring real identity fields", () => {
  assert.match(paymentsSource, /const anonymous = value\.anonymous === true;/);
  assert.match(paymentsSource, /if \(anonymous\) \{\s*return \{\s*id,\s*name: "Anonymous",\s*anonymous: true,\s*\};\s*\}/);
  assert.match(paymentsSource, /ticketCount: typeof value\.ticketCount === "number" && Number\.isFinite\(value\.ticketCount\)/);
});

test("public going summary DTOs carry an anonymous marker for safe avatar previews", () => {
  assert.match(paymentsSource, /publicGoingSummary\?: \{\s*going: number;\s*avatars: \{\s*userId: string;\s*name: string;\s*avatarKey\?: string \| null;\s*anonymous\?: boolean;/);
  assert.match(eventsSource, /publicGoingSummary\?: \{\s*going: number;\s*avatars: \{\s*userId: string;\s*name: string;\s*avatarKey\?: string \| null;\s*anonymous\?: boolean;/);
});

test("attendee list renders anonymous rows without profile navigation, username, avatar URL, or follow controls", () => {
  assert.match(attendeeListSource, /const isAnonymous = attendee\?\.anonymous === true;/);
  assert.match(attendeeListSource, /const avatarUri = isAnonymous \? null : getAvatarUri\(attendee\?\.avatarKey \?\? null\);/);
  assert.match(attendeeListSource, /const username = isAnonymous \? "" : attendee\?\.username\?\.trim\(\);/);
  assert.match(attendeeListSource, /const ticketCountLabel = ticketCount > 1 \? `\$\{ticketCount\} Tickets` : "";/);
  assert.match(attendeeListSource, /const secondaryLabel = \[\s*!isAnonymous \? handleLabel : null,\s*ticketCountLabel,\s*\]\.filter\(Boolean\)\.join\(" · "\);/);
  assert.match(attendeeListSource, /\{attendee && !isAnonymous \? \(/);
  assert.match(attendeeListSource, /\{secondaryLabel \? \(\s*<Text style=\{\[styles\.userHandle/);
  assert.match(attendeeListSource, /\{attendee && !isAnonymous && !isSelf \? \(/);
});

test("follow attempts are guarded for anonymous attendee rows", () => {
  assert.match(
    attendeeListSource,
    /if \(!attendee \|\| attendee\.anonymous \|\| attendee\.id === authUser\?\.id \|\| pendingUserIdsRef\.current\.has\(attendee\.id\)\) \{/,
  );
});
