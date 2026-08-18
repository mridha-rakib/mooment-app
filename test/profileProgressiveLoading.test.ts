import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the User Profile progressive-loading + error-isolation rework:
// (tabs)/profile.tsx and profile-screen/user-profile.tsx used to gate all
// content behind one Promise.all + one try/catch (own profile: silent
// zero-value reset; other profile: a full-screen spinner and an all-or-
// nothing wipe on any failure). Each data source now fetches, reveals, and
// fails independently. Source-level regex assertions, matching this repo's
// established convention (no React Native render harness here).

const ownProfileSource = readFileSync(join(process.cwd(), "app/(tabs)/profile.tsx"), "utf8");
const otherProfileSource = readFileSync(join(process.cwd(), "app/profile-screen/user-profile.tsx"), "utf8");

test("other-profile screen no longer renders a full-screen spinner-only gate", () => {
  assert.doesNotMatch(otherProfileSource, /if \(isLoading\)/);
  assert.doesNotMatch(otherProfileSource, /<Spinner/);
  assert.doesNotMatch(otherProfileSource, /from "@\/components\/ui\/spinner"/);
});

test("own profile has independent statsLoading/feedLoading/eventsLoading state, not one coarse flag", () => {
  assert.match(ownProfileSource, /const \[statsLoading, setStatsLoading\] = useState\(true\)/);
  assert.match(ownProfileSource, /const \[feedLoading, setFeedLoading\] = useState\(true\)/);
  assert.match(ownProfileSource, /const \[eventsLoading, setEventsLoading\] = useState\(true\)/);
});

test("other profile has independent identityLoading/statsLoading/feedLoading/eventsLoading state", () => {
  assert.match(otherProfileSource, /const \[identityLoading, setIdentityLoading\] = useState/);
  assert.match(otherProfileSource, /const \[statsLoading, setStatsLoading\] = useState\(true\)/);
  assert.match(otherProfileSource, /const \[feedLoading, setFeedLoading\] = useState\(true\)/);
  assert.match(otherProfileSource, /const \[eventsLoading, setEventsLoading\] = useState\(true\)/);
});

test("own profile identity is never network-gated: no identityLoading is ever passed for it", () => {
  assert.doesNotMatch(ownProfileSource, /identityLoading/);
});

test("each section only shows its skeleton on a genuine first load, never on a background refresh", () => {
  for (const source of [ownProfileSource, otherProfileSource]) {
    assert.match(source, /hasLoadedStatsRef\.current/);
    assert.match(source, /hasLoadedFeedRef\.current/);
    assert.match(source, /hasLoadedEventsRef\.current/);
    // Each fetch only flips its loading flag true when that section has never
    // successfully loaded before ("if (!hasLoadedXRef.current) setXLoading(true)").
    assert.match(source, /if \(!hasLoadedStatsRef\.current\) setStatsLoading\(true\)/);
    assert.match(source, /if \(!hasLoadedFeedRef\.current\) setFeedLoading\(true\)/);
    assert.match(source, /if \(!hasLoadedEventsRef\.current\) setEventsLoading\(true\)/);
  }
  assert.match(otherProfileSource, /if \(!hasLoadedIdentityRef\.current\) setIdentityLoading\(true\)/);
});

const sliceFetchBodies = (source: string) => {
  const walletOrLoadProfileMarker = source.includes("const fetchWalletEvents")
    ? "const fetchWalletEvents"
    : "const loadProfile = useCallback";
  const fetchStatsBody = source.slice(source.indexOf("const fetchStats"), source.indexOf("const fetchFeed"));
  const fetchFeedBody = source.slice(source.indexOf("const fetchFeed"), source.indexOf("const fetchEvents"));
  const fetchEventsBody = source.slice(source.indexOf("const fetchEvents"), source.indexOf(walletOrLoadProfileMarker));
  return { fetchStatsBody, fetchFeedBody, fetchEventsBody };
};

test("stats/feed/events fetches are three independent try/catch/finally blocks, not one shared catch", () => {
  for (const source of [ownProfileSource, otherProfileSource]) {
    const { fetchStatsBody, fetchFeedBody, fetchEventsBody } = sliceFetchBodies(source);

    for (const body of [fetchStatsBody, fetchFeedBody, fetchEventsBody]) {
      assert.match(body, /try \{/);
      assert.match(body, /\} catch \{/);
      assert.match(body, /\} finally \{/);
    }
  }
});

test("a section's catch block never clears data from a different section (no shared all-or-nothing wipe)", () => {
  for (const source of [ownProfileSource, otherProfileSource]) {
    const { fetchStatsBody, fetchFeedBody, fetchEventsBody } = sliceFetchBodies(source);

    // fetchStats's catch must not touch posts/reposts/profileEvents state.
    const statsCatchBody = fetchStatsBody.slice(fetchStatsBody.indexOf("catch"), fetchStatsBody.indexOf("finally"));
    assert.doesNotMatch(statsCatchBody, /setPosts|setReposts|setProfileEvents/);

    // fetchFeed's catch must not touch stats/events state.
    const feedCatchBody = fetchFeedBody.slice(fetchFeedBody.indexOf("catch"), fetchFeedBody.indexOf("finally"));
    assert.doesNotMatch(feedCatchBody, /setProfileStats|setProfileUser|setProfileEvents/);

    // fetchEvents's catch must not touch posts/reposts/stats-only state.
    const eventsCatchBody = fetchEventsBody.slice(fetchEventsBody.indexOf("catch"), fetchEventsBody.indexOf("finally"));
    assert.doesNotMatch(eventsCatchBody, /setPosts|setReposts/);
  }
});

test("own profile: a wallet-events failure cannot clear the main feed (posts/reposts untouched in its catch)", () => {
  const fetchWalletBody = ownProfileSource.slice(
    ownProfileSource.indexOf("const fetchWalletEvents"),
    ownProfileSource.indexOf("const loadTimeline"),
  );
  assert.match(fetchWalletBody, /catch \{/);
  const catchBody = fetchWalletBody.slice(fetchWalletBody.indexOf("catch"));
  assert.doesNotMatch(catchBody, /setPosts|setReposts/);
});

test("other profile: identity fetch failure preserves prior content and only alerts on a genuine first load", () => {
  const loadProfileBody = otherProfileSource.slice(
    otherProfileSource.indexOf("const loadProfile = useCallback"),
    otherProfileSource.indexOf("const loadMoreFeed"),
  );
  const identityCatch = loadProfileBody.slice(
    loadProfileBody.indexOf("} catch (error) {"),
    loadProfileBody.indexOf("hasLoadedIdentityRef.current = true;"),
  );
  assert.match(identityCatch, /if \(!hasLoadedIdentityRef\.current\) \{/);
  assert.match(identityCatch, /Alert\.alert\("Unable to load profile"/);
  assert.doesNotMatch(identityCatch, /setPosts|setReposts|setProfileEvents|setProfileUser/);
});

test("own profile: three sections + wallet events run via Promise.allSettled, not Promise.all", () => {
  assert.match(ownProfileSource, /await Promise\.allSettled\(\[\s*fetchStats\(user\.id\),\s*fetchFeed\(user\.id\),\s*fetchEvents\(user\.id\),\s*fetchWalletEvents\(user\.id\),\s*\]\);/);
});

test("other profile: privacy gate preserved — stats/feed/events only fire after identity resolves as non-blocked", () => {
  const loadProfileBody = otherProfileSource.slice(
    otherProfileSource.indexOf("const loadProfile = useCallback"),
    otherProfileSource.indexOf("}, [fetchEvents, fetchFeed, fetchStats"),
  );
  const blockedBranchEnd = loadProfileBody.indexOf('profileAccess === "blocked"');
  const allSettledIndex = loadProfileBody.indexOf("Promise.allSettled");
  assert.ok(blockedBranchEnd > -1 && allSettledIndex > -1);
  assert.ok(allSettledIndex > blockedBranchEnd, "stats/feed/events fetch must be textually after the blocked-profile check/return");
  assert.match(loadProfileBody, /await Promise\.allSettled\(\[\s*fetchStats\(userId\),\s*fetchFeed\(userId, nextAvatar\),\s*fetchEvents\(userId\),\s*\]\);/);
});

test("blocked-profile branch resets all loading flags so it never sits behind a spinner or skeleton", () => {
  const blockedCheckIndex = otherProfileSource.indexOf('profileAccess === "blocked"');
  const nextNonBlockedSetProfileUser = otherProfileSource.indexOf("setProfileUser((current) => ({", blockedCheckIndex);
  const blockedBranch = otherProfileSource.slice(blockedCheckIndex, nextNonBlockedSetProfileUser);
  assert.match(blockedBranch, /setIdentityLoading\(false\)/);
  assert.match(blockedBranch, /setStatsLoading\(false\)/);
  assert.match(blockedBranch, /setFeedLoading\(false\)/);
  assert.match(blockedBranch, /setEventsLoading\(false\)/);
});

test("no artificial delay was introduced anywhere in the reworked loading paths", () => {
  for (const source of [ownProfileSource, otherProfileSource]) {
    assert.doesNotMatch(source, /setTimeout\(\s*\(\)\s*=>\s*(setStatsLoading|setFeedLoading|setEventsLoading|setIdentityLoading|loadProfile|loadTimeline)/);
  }
});
