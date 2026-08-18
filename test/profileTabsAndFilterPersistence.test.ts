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
