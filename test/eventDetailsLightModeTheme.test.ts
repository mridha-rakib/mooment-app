import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const eventDetailsSource = readFileSync(
  join(process.cwd(), "app/event-screen/event.tsx"),
  "utf8",
);

const footerSection = eventDetailsSource.slice(
  eventDetailsSource.indexOf("{shouldRenderEventFooter && ("),
  eventDetailsSource.indexOf("visible={privacyDropdownVisible}"),
);
const privacyDropdownSection = eventDetailsSource.slice(
  eventDetailsSource.indexOf("visible={privacyDropdownVisible}"),
  eventDetailsSource.indexOf("visible={menuVisible}"),
);
const overflowMenuSection = eventDetailsSource.slice(
  eventDetailsSource.indexOf("visible={menuVisible}"),
  eventDetailsSource.indexOf("visible={selectedReward"),
);
const stylesSection = eventDetailsSource.slice(eventDetailsSource.indexOf("const styles = StyleSheet.create({"));

test("Publish Event button gets a light-mode-only readable treatment", () => {
  assert.match(footerSection, /styles\.publishDraftBtn,\s*\n\s*!isDark && styles\.publishDraftBtnLight/);
  assert.match(stylesSection, /publishDraftBtnLight: \{[^}]*borderWidth: 1/s);
  // background/text stay the same in both themes — only a light-mode border/shadow was added
  assert.match(stylesSection, /publishDraftBtn: \{[^}]*backgroundColor: "#FFFFFF"/s);
  assert.match(footerSection, /color: "#111111"/);
});

test("Cancel Event button gets a light-mode destructive treatment instead of the dark-mode-only style", () => {
  assert.match(footerSection, /styles\.cancelEventBtn,\s*\n\s*!isDark && styles\.cancelEventBtnLight/);
  assert.match(stylesSection, /cancelEventBtnLight: \{[^}]*backgroundColor: "rgba\(212, 67, 67,/s);
  // dark mode's near-black approved background is untouched
  assert.match(stylesSection, /cancelEventBtn: \{[^}]*backgroundColor: "#150B0B"/s);
  // destructive red text/icon color unchanged in both themes
  assert.match(footerSection, /color="#D44343"/);
});

test("Privacy dropdown (Public/Locked) is theme-aware instead of hardcoded white-on-white", () => {
  assert.doesNotMatch(privacyDropdownSection, /color="#FFFFFF"/);
  assert.match(privacyDropdownSection, /color=\{isDark \? "#FFFFFF" : colors\.text\}/);
  assert.match(privacyDropdownSection, /backgroundColor: isDark \? "#2A2A2A" : colors\.card/);
});

test("3-dot overflow menu uses theme-aware icon/text colors in light mode", () => {
  assert.doesNotMatch(overflowMenuSection, /color="#FFF"(?!\s*:)/);
  assert.match(overflowMenuSection, /color=\{isDark \? "#FFF" : colors\.text\}/);
});

test("3-dot overflow menu distinguishes destructive (Delete) from normal (Edit) actions in light mode", () => {
  assert.match(
    overflowMenuSection,
    /icon=\{Delete02Icon\} size=\{20\} color=\{isDark \? "#FFF" : colors\.danger\}/,
  );
});

test("Dark-mode overflow menu and privacy dropdown values are preserved", () => {
  assert.match(overflowMenuSection, /backgroundColor: isDark \? "#4A4A4A" : colors\.card/);
  assert.match(overflowMenuSection, /isDark \? "#FFF" : colors\.text/);
  assert.match(overflowMenuSection, /isDark \? "#FFF" : colors\.danger/);
  assert.match(privacyDropdownSection, /isDark \? "#FFFFFF" : colors\.text/);
});

test("main tab row (About/Access/Window/Chat) keeps its existing shared theme-aware coloring", () => {
  const tabBarStart = eventDetailsSource.indexOf("styles.tabBar,");
  const tabBarSection = eventDetailsSource.slice(
    tabBarStart,
    eventDetailsSource.indexOf("styles.contentPadding}>", tabBarStart),
  );
  assert.match(tabBarSection, /activeTab === tab && \{ borderBottomColor: colors\.primary \}/);
  assert.match(tabBarSection, /color: activeTab === tab \? colors\.text : colors\.textSecondary/);
  // no per-tab special-casing (e.g. a hardcoded Access-only color) was introduced
  assert.doesNotMatch(tabBarSection, /tab === "Access"/);
});

test("event action handlers and navigation wiring are unchanged by the theme fix", () => {
  assert.match(footerSection, /onPress=\{handleEdit\}/);
  assert.match(footerSection, /onPress=\{handlePublishDraft\}/);
  assert.match(footerSection, /onPress=\{handleCancelEvent\}/);
  assert.match(overflowMenuSection, /onPress=\{handleEdit\}/);
  assert.match(overflowMenuSection, /onPress=\{handleDelete\}/);
  assert.match(overflowMenuSection, /onPress=\{handleReportPress\}/);
  assert.match(overflowMenuSection, /onPress=\{handleSave\}/);
  assert.match(privacyDropdownSection, /onPress=\{\(\) => handlePrivacyChange\("public"\)\}/);
  assert.match(privacyDropdownSection, /onPress=\{\(\) => handlePrivacyChange\("locked"\)\}/);
});
