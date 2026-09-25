import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

const usersLibSource = read("lib/users.ts");
const profileViewSource = read("components/profile/ProfileView.tsx");
const userProfileScreenSource = read("app/profile-screen/user-profile.tsx");
const feedPostSource = read("components/post/FeedPost.tsx");
const eventFeedCardSource = read("components/home/EventFeedCard.tsx");

// --- Part 2/3 type plumbing ------------------------------------------------

test("UserResponse.profileAccess includes the 'unavailable' state", () => {
  assert.match(usersLibSource, /profileAccess\?:\s*"open"\s*\|\s*"blocked"\s*\|\s*"unavailable"/);
});

test("UserProfileData.profileAccess includes the 'unavailable' state", () => {
  assert.match(profileViewSource, /profileAccess\?:\s*"open"\s*\|\s*"blocked"\s*\|\s*"unavailable"/);
});

// --- Part 3: ProfileView renders a safe unavailable state ----------------

test("ProfileView treats blocked and unavailable with one restricted branch", () => {
  assert.match(profileViewSource, /const isUnavailableProfile = user\.profileAccess === "unavailable";/);
  assert.match(profileViewSource, /const isRestrictedProfile = isBlockedProfile \|\| isUnavailableProfile;/);
  assert.match(profileViewSource, /if \(isRestrictedProfile\) \{/);
});

test("ProfileView story/avatar gating uses the restricted (not just blocked) flag", () => {
  // Story fetch is skipped for both blocked and unavailable profiles.
  assert.match(profileViewSource, /const loadProfileStories = useCallback\(\(\) => \{\s*if \(isRestrictedProfile\) \{/);
  assert.match(profileViewSource, /const handleAvatarPress = useCallback\(async \(\) => \{\s*if \(isRestrictedProfile\) \{/);
});

test("ProfileView hides identity, avatar and report/block actions for an unavailable profile", () => {
  assert.match(profileViewSource, /\{!isUnavailableProfile \? \(\s*<View style=\{styles\.blockedIdentityRow\}>/);
  assert.match(profileViewSource, /!isOwnProfile && !isUnavailableProfile \? \(/);
  assert.match(profileViewSource, /\{!isUnavailableProfile \? \(\s*<MoreMenuModal/);
  assert.match(profileViewSource, /"Account unavailable"/);
});

// --- Part 3: user-profile screen maps the unavailable response ----------

test("user-profile screen renders the unavailable state without private fields", () => {
  assert.match(userProfileScreenSource, /const isUnavailableProfile = user\.profileAccess === "unavailable";/);
  assert.match(userProfileScreenSource, /if \(user\.profileAccess === "blocked" \|\| isUnavailableProfile\) \{/);
  assert.match(userProfileScreenSource, /name: isUnavailableProfile\s*\?\s*"Unavailable"/);
  assert.match(userProfileScreenSource, /handle: isUnavailableProfile \? "" : formatHandle\(user\.username, null\)/);
  assert.match(userProfileScreenSource, /setAvatarUri\(isUnavailableProfile \? null : nextAvatar\)/);
});

// --- Part 8: plain Block reuses the report+block feed cleanup -----------

test("FeedPost's plain Block notifies onAuthorBlocked so other cards from that author are dropped", () => {
  assert.match(
    feedPostSource,
    /await blockUser\(authorId\);\s*\n\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*onAuthorBlocked\?\.\(authorId\);/,
  );
});

test("EventFeedCard's plain Block notifies onHostBlocked so other cards from that host are dropped", () => {
  assert.match(
    eventFeedCardSource,
    /await blockUser\(targetId\);\s*\n\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*onHostBlocked\?\.\(targetId\);/,
  );
});

test("no persistent cache is introduced by the block cleanup", () => {
  for (const source of [feedPostSource, eventFeedCardSource]) {
    assert.doesNotMatch(source, /AsyncStorage|persistQueryClient|redux-persist/);
  }
});
