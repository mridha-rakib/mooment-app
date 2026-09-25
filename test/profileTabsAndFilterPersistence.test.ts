import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers two things: (1) Feed <-> Events tab switching in ProfileContent
// already reused parent-held data with no network refetch, which must not
// regress; (2) the pre-existing bug where ProfileEvents' local Active/Past
// filter state reset to "active" every time the Events tab unmounted (since
// ProfileContent renders 'feed' and 'events' as mutually exclusive branches)
// is fixed by lifting that state to ProfileContent, which stays mounted
// across tab switches. Source-level regex assertions, matching this repo's
// convention.

const profileContentSource = readFileSync(join(process.cwd(), "components/profile/ProfileContent.tsx"), "utf8");
const profileEventsSource = readFileSync(join(process.cwd(), "components/profile/ProfileEvents.tsx"), "utf8");
const profileViewSource = readFileSync(join(process.cwd(), "components/profile/ProfileView.tsx"), "utf8");

test("switching tabs still triggers no data fetch: ProfileContent has no fetch/axios/api call of its own", () => {
  assert.doesNotMatch(profileContentSource, /await (get|post|axios)/i);
  assert.doesNotMatch(profileContentSource, /useEffect\(\(\) => \{\s*(get|fetch)/);
});

test("ProfileContent renders 'feed' and 'events' as mutually exclusive branches (still an unmount/remount boundary)", () => {
  assert.match(profileContentSource, /if \(activeTab === 'feed'\) \{/);
  assert.match(profileContentSource, /return \(\s*<FlatList/);
  assert.match(profileContentSource, /<ProfileEvents/);
});

test("ProfileEvents' Active/Past filter is now a controlled prop owned by ProfileContent, not local state", () => {
  assert.doesNotMatch(profileEventsSource, /const \[filter, setFilter\] = useState/);
  assert.match(profileEventsSource, /filter,\s*onFilterChange,/);
  assert.match(profileContentSource, /const \[eventsFilter, setEventsFilter\] = useState<ProfileEventsFilter>\("active"\)/);
});

test("ProfileContent passes its lifted filter state into ProfileEvents, surviving the tab remount", () => {
  assert.match(profileContentSource, /filter=\{eventsFilter\}/);
  assert.match(profileContentSource, /onFilterChange=\{setEventsFilter\}/);
});

test("ProfileView and ProfileContent pass profile event error/retry state through the shared events path", () => {
  assert.match(profileViewSource, /eventsError\?: string \| null/);
  assert.match(profileViewSource, /onRetryEvents\?: \(\) => void/);
  assert.match(profileViewSource, /eventsError=\{eventsError\}/);
  assert.match(profileViewSource, /onRetryEvents=\{onRetryEvents\}/);
  assert.match(profileContentSource, /eventsError\?: string \| null/);
  assert.match(profileContentSource, /onRetryEvents\?: \(\) => void/);
  assert.match(profileContentSource, /errorMessage=\{eventsError\}/);
  assert.match(profileContentSource, /onRetry=\{onRetryEvents\}/);
});

test("the Active/Past toggle still defaults to 'active' and the visible toggle UI is unchanged", () => {
  assert.match(profileContentSource, /useState<ProfileEventsFilter>\("active"\)/);
  assert.match(profileEventsSource, /Active Events/);
  assert.match(profileEventsSource, /Past Events/);
  assert.match(profileEventsSource, /onPress=\{\(\) => onFilterChange\("active"\)\}/);
  assert.match(profileEventsSource, /onPress=\{\(\) => onFilterChange\("past"\)\}/);
});

test("events tab shows its skeleton only while eventsLoading is true and there is no cached data yet", () => {
  assert.match(profileEventsSource, /ListEmptyComponent=\{isLoading \? \(\s*<ProfileEventsSkeletonList \/>/);
});

test("post tab loading architecture remains on the existing feed skeleton branch", () => {
  assert.match(profileContentSource, /ListEmptyComponent=\{feedLoading \? \(\s*<ProfileFeedSkeletonList \/>/);
  assert.match(profileContentSource, /<Text style=\{\[styles\.emptyText, \{ color: colors\.textSecondary \}\]\}>No posts yet<\/Text>/);
});

test("profile events render request failures before true empty copy", () => {
  const emptyComponentSource = profileEventsSource.slice(
    profileEventsSource.indexOf("ListEmptyComponent={"),
    profileEventsSource.indexOf("ListFooterComponent="),
  );
  const skeletonIndex = emptyComponentSource.indexOf("<ProfileEventsSkeletonList />");
  const errorIndex = emptyComponentSource.indexOf("errorMessage ? (");
  const activeEmptyIndex = emptyComponentSource.indexOf("No active events yet");
  const pastEmptyIndex = emptyComponentSource.indexOf("No past events yet");

  assert.ok(skeletonIndex > -1);
  assert.ok(errorIndex > skeletonIndex);
  assert.ok(activeEmptyIndex > errorIndex);
  assert.ok(pastEmptyIndex > errorIndex);
  assert.match(emptyComponentSource, /\{errorMessage\}/);
  assert.match(emptyComponentSource, />Retry</);
});

test("active and past initial loading share the same skeleton branch, not false empty states", () => {
  const emptyComponentSource = profileEventsSource.slice(
    profileEventsSource.indexOf("ListEmptyComponent={"),
    profileEventsSource.indexOf("ListFooterComponent="),
  );

  assert.match(profileEventsSource, /filter === "active" \? "No active events yet" : "No past events yet"/);
  assert.match(profileEventsSource, /onPress=\{\(\) => onFilterChange\("active"\)\}/);
  assert.match(profileEventsSource, /onPress=\{\(\) => onFilterChange\("past"\)\}/);
  assert.doesNotMatch(emptyComponentSource, /filter === "active" \? \(\s*<ProfileEventsSkeletonList/);
});

test("background refresh errors keep existing profile event cards visible", () => {
  assert.match(profileEventsSource, /const inlineError = errorMessage && visibleEvents\.length > 0 \? \(/);
  assert.match(profileEventsSource, /data=\{visibleEvents\}/);
  assert.match(profileEventsSource, /renderItem=\{renderEvent\}/);
  assert.match(profileEventsSource, /<EventFeedCard[\s\S]*event=\{item\}/);
});
