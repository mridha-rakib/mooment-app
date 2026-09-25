import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "app/profile-screen/edit-profile.tsx"),
  "utf8",
);

const savePayload = source.slice(
  source.indexOf("await updateProfile({"),
  source.indexOf("});", source.indexOf("await updateProfile({")),
);

test("Edit Profile no longer renders or wires the Address field", () => {
  assert.doesNotMatch(source, /placeholder="Address"/);
  assert.doesNotMatch(source, /setFieldRef\("address"\)/);
  assert.doesNotMatch(source, /handleFieldLayout\("address"\)/);
  assert.doesNotMatch(source, /setAddress/);
  assert.doesNotMatch(source, /\|\s*"address"/);
});

test("Edit Profile PATCH omits Address and preserves existing backend Address data by omission", () => {
  assert.match(savePayload, /await updateProfile\(\{/);
  assert.doesNotMatch(savePayload, /\baddress\s*:/);
  assert.doesNotMatch(savePayload, /address:\s*null/);
  assert.doesNotMatch(savePayload, /address:\s*""/);
});

test("Gender and Age are saved as common fields for personal and business profiles", () => {
  assert.match(savePayload, /accountType:\s*profileType/);
  assert.match(savePayload, /gender:\s*gender\.trim\(\)\s*\|\|\s*null/);
  assert.match(savePayload, /age:\s*validatedProfile\.age/);
  assert.doesNotMatch(savePayload, /gender:\s*isBusiness\s*\?/);
  assert.doesNotMatch(savePayload, /age:\s*isBusiness\s*\?/);
});

test("Age validation applies before the payload and cannot emit NaN", () => {
  assert.match(source, /if\s*\(trimmedAge\)\s*\{\s*const parsedAge = Number\(trimmedAge\);/);
  assert.match(source, /!Number\.isInteger\(parsedAge\)\s*\|\|\s*parsedAge < 0\s*\|\|\s*parsedAge > 130/);
  assert.match(source, /age:\s*parsedAge/);
  assert.match(source, /age:\s*null/);
  assert.doesNotMatch(source, /if\s*\(!isBusiness\s*&&\s*trimmedAge\)/);
});

test("Unrelated profile payload behavior remains present", () => {
  assert.match(savePayload, /name:\s*validatedProfile\.name/);
  assert.match(savePayload, /username:\s*validatedProfile\.username/);
  assert.match(savePayload, /email:\s*validatedProfile\.email/);
  assert.match(savePayload, /bio:\s*bio\.trim\(\)\s*\|\|\s*null/);
  assert.match(savePayload, /avatarKey:\s*finalAvatarKey/);
  assert.match(savePayload, /businessDocumentKey:\s*isBusiness\s*\?\s*finalDocumentKey\s*:\s*null/);
});
