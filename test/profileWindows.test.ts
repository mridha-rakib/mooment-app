import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const usersLibSource = readFileSync(join(process.cwd(), "lib/users.ts"), "utf8");
const profileHeaderSource = readFileSync(join(process.cwd(), "components/profile/ProfileHeader.tsx"), "utf8");
const profileWindowsSource = readFileSync(join(process.cwd(), "app/profile-screen/windows.tsx"), "utf8");
const profileWindowPostsSource = readFileSync(join(process.cwd(), "app/profile-screen/window-posts.tsx"), "utf8");
const homeWindowsSource = readFileSync(join(process.cwd(), "components/home/ParticipatedWindowsList.tsx"), "utf8");
const eventWindowGallerySource = readFileSync(join(process.cwd(), "app/event-screen/window-gallery.tsx"), "utf8");
const eventWindowsLibSource = readFileSync(join(process.cwd(), "lib/eventWindows.ts"), "utf8");

test("ProfileHeader adds Windows after Friends without changing Friends aggregation", () => {
  const friendsIndex = profileHeaderSource.indexOf("Friends");
  const windowsIndex = profileHeaderSource.indexOf("Windows");
  assert.notEqual(friendsIndex, -1);
  assert.notEqual(windowsIndex, -1);
  assert.ok(friendsIndex < windowsIndex);
  assert.match(profileHeaderSource, /\{stats\.followers \+ stats\.following\}/);
  assert.match(profileHeaderSource, /pathname: "\/profile-screen\/windows" as never/);
});

test("profile stats defaults missing windows to zero for backwards compatibility", () => {
  assert.match(usersLibSource, /windows: number/);
  assert.match(usersLibSource, /windows: typeof stats\?\.windows === "number" \? stats\.windows : 0/);
});

test("Profile Windows uses profile-specific endpoints, not Home Windows endpoints", () => {
  assert.match(usersLibSource, /getUserProfileWindowEvents/);
  assert.match(usersLibSource, /\/users\/\$\{encodeURIComponent\(userId\)\}\/profile-windows/);
  assert.match(usersLibSource, /getUserProfileWindowPosts/);
  assert.doesNotMatch(profileWindowsSource, /getParticipatedEvents|getEventWindowPosts|participated-windows|window-gallery/);
  assert.doesNotMatch(profileWindowPostsSource, /getParticipatedEvents|getEventWindowPosts|participated-windows|window-gallery/);
});

test("Profile Windows event list passes the viewed profile userId to the posts screen", () => {
  assert.match(profileWindowsSource, /if \(!userId\)/);
  assert.match(profileWindowsSource, /params: \{ userId, eventId: event\.id, title: event\.name \}/);
});

test("Profile Window posts screen requires explicit userId/eventId and never falls back to auth user", () => {
  assert.match(profileWindowPostsSource, /if \(!params\.userId \|\| !params\.eventId\)/);
  assert.doesNotMatch(profileWindowPostsSource, /state\)\s*=>\s*state\.user/);
  assert.match(profileWindowPostsSource, /getUserProfileWindowPosts\(params\.userId, params\.eventId/);
});

test("Home Windows and existing Window Gallery keep their original data sources", () => {
  assert.match(homeWindowsSource, /getParticipatedEvents\(\)/);
  assert.match(eventWindowGallerySource, /getEventWindowPosts\(params\.eventId, params\.windowId/);
});

test("Window Gallery and Profile Window posts render author avatars without changing labels", () => {
  assert.match(eventWindowsLibSource, /author\?: \{/);
  assert.match(eventWindowGallerySource, /<UserAvatar/);
  assert.match(eventWindowGallerySource, /name=\{avatarUri \? post\.author\?\.name : null\}/);
  assert.match(eventWindowGallerySource, /post\.userId === currentUserId \? "You" : "Participant"/);
  assert.match(profileWindowPostsSource, /<UserAvatar/);
  assert.match(profileWindowPostsSource, /name=\{avatarUri \? item\.author\?\.name : null\}/);
  assert.match(profileWindowPostsSource, />Profile post</);
});
