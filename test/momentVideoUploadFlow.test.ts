import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const storageSource = readFileSync(join(process.cwd(), "lib/storage.ts"), "utf8");
const pendingSource = readFileSync(join(process.cwd(), "lib/pendingMomentUploads.ts"), "utf8");
const createPostSource = readFileSync(join(process.cwd(), "app/post-screen/create-post.tsx"), "utf8");

const getFunctionSource = (source: string, name: string) => {
  const start = source.indexOf(`const ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);

  const nextExport = source.indexOf("\nexport const ", start + 1);
  return source.slice(start, nextExport === -1 ? source.length : nextExport);
};

const startMomentUploadSource = getFunctionSource(storageSource, "getMomentVideoUploadFromApi");
const nativeUploadSource = getFunctionSource(storageSource, "createNativeFileUpload");
const pendingUploadSource = pendingSource.slice(
  pendingSource.indexOf("export const startPendingVideoMomentUpload"),
  pendingSource.indexOf("export const acknowledgePendingVideoMomentUpload"),
);
const createMomentSubmitSource = createPostSource.slice(
  createPostSource.indexOf("const publishMoment"),
  createPostSource.indexOf("const handleDone"),
);

test("Create Post video keeps the 60-second Moment limit and pending upload path", () => {
  assert.match(createPostSource, /MAX_VIDEO_RECORDING_DURATION_SECONDS = 60/);
  assert.match(createPostSource, /videoMaxDuration: MAX_VIDEO_RECORDING_DURATION_SECONDS/);
  assert.match(createMomentSubmitSource, /startPendingVideoMomentUpload/);
  assert.match(createMomentSubmitSource, /canUseNativeVideoUpload/);
});

test("Moment video upload requests the authenticated server-generated contract once", () => {
  const contractMatches = storageSource.match(/api\.post\("\/moments\/video-upload-url"/g) ?? [];

  assert.equal(contractMatches.length, 1);
  assert.match(startMomentUploadSource, /contentType/);
  assert.doesNotMatch(startMomentUploadSource, /key:/);
});

test("Android local video upload sends raw binary and accepts empty successful 2xx responses", () => {
  assert.match(nativeUploadSource, /FileSystemUploadType\.BINARY_CONTENT/);
  assert.match(nativeUploadSource, /httpMethod: "PUT"/);
  assert.match(nativeUploadSource, /result\.status >= 200 && result\.status < 300/);
  assert.doesNotMatch(nativeUploadSource, /JSON\.parse/);
  assert.doesNotMatch(nativeUploadSource, /result\.body/);
});

test("Moment video fallback only starts after the primary upload promise rejects", () => {
  const fallbackStartIndex = storageSource.indexOf('mark("binary upload fallback start")');
  const catchIndex = storageSource.lastIndexOf(".catch(async (error)", fallbackStartIndex);
  const successIndex = storageSource.lastIndexOf('mark("binary upload complete"', fallbackStartIndex);

  assert.ok(catchIndex > -1, "fallback should be inside an upload catch branch");
  assert.ok(successIndex === -1 || successIndex < catchIndex, "success completion should not start fallback");
});

test("Pending Moment upload awaits upload completion before creating one Moment", () => {
  assert.match(pendingUploadSource, /upload\.completion\s*\.then/);
  assert.match(pendingUploadSource, /mark\("upload completion resolved"\)/);
  assert.match(pendingUploadSource, /mark\("moment creation request start"\)/);
  assert.ok(
    pendingUploadSource.indexOf('mark("upload completion resolved")')
      < pendingUploadSource.indexOf('mark("moment creation request start")'),
  );

  const createMatches = pendingUploadSource.match(/createMoment\(/g) ?? [];
  assert.equal(createMatches.length, 1);
});

test("Pending permanent failure clears the skeleton and reports the backend message once", () => {
  const alertMatches = pendingUploadSource.match(/Alert\.alert\(/g) ?? [];

  assert.match(pendingUploadSource, /\.catch\(\(error\) =>/);
  assert.match(pendingUploadSource, /removeOperation\(id\)/);
  assert.equal(alertMatches.length, 1);
  assert.match(pendingSource, /getPendingUploadErrorMessage/);
});
