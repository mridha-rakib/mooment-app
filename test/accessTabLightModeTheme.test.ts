import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const accessSource = readFileSync(
  join(process.cwd(), "components/eventTabs/AccessTab.tsx"),
  "utf8",
);

const stylesSection = accessSource.slice(accessSource.indexOf("const styles = StyleSheet.create({"));

const getStyleBlock = (styleName: string) => {
  const match = stylesSection.match(new RegExp(`\\b${styleName}: \\{([\\s\\S]*?)\\n  \\},`));
  assert.ok(match, `Expected ${styleName} style block to exist`);
  return match[1] ?? "";
};

const renderCreatorTicketsSection = accessSource.slice(
  accessSource.indexOf("const renderCreatorTickets = ()"),
  accessSource.indexOf("const renderRewards = ()"),
);
const renderCreatorRewardsSection = accessSource.slice(
  accessSource.indexOf("const renderCreatorRewards = ()"),
  accessSource.indexOf("return (\n    <View>"),
);
const selectorSection = accessSource.slice(
  accessSource.indexOf("<SegmentedControl"),
  accessSource.indexOf("/>", accessSource.indexOf("<SegmentedControl")),
);

test("ticket card uses a light surface with a separating border in light mode", () => {
  assert.match(renderCreatorTicketsSection, /styles\.creatorTicketCard,\s*!isDark && styles\.creatorTicketCardLight/);
  assert.match(getStyleBlock("creatorTicketCardLight"), /backgroundColor:\s*"#FFFFFF"/);
  assert.match(getStyleBlock("creatorTicketCardLight"), /borderWidth:\s*1/);
});

test("ticket title renders as primary readable text in light mode", () => {
  assert.match(renderCreatorTicketsSection, /styles\.creatorTicketTitle,\s*\{\s*color:\s*isDark \? "#B3B3B3" : colors\.text\s*\}/);
});

test("ticket description and expiry render as secondary readable text in light mode", () => {
  assert.match(renderCreatorTicketsSection, /styles\.creatorTicketDescription,\s*\{\s*color:\s*isDark \? "#B3B3B3" : colors\.textSecondary\s*\}/);
  assert.match(renderCreatorTicketsSection, /styles\.creatorTicketExpiry,\s*\{\s*color:\s*isDark \? "#B3B3B3" : colors\.textSecondary\s*\}/);
});

test("ticket price renders as primary readable text in light mode", () => {
  assert.match(renderCreatorTicketsSection, /styles\.creatorTicketPrice,\s*\{\s*color:\s*isDark \? "#FFFFFF" : colors\.text\s*\}/);
});

test("sold stat is readable in light mode", () => {
  assert.match(renderCreatorTicketsSection, /styles\.creatorTicketStatsRow,\s*!isDark && styles\.creatorTicketStatsRowLight/);
  assert.match(renderCreatorTicketsSection, /styles\.creatorTicketStatSoldValue,\s*\{\s*color:\s*isDark \? "#FFFFFF" : colors\.text\s*\}/);
});

test("available stat preserves the success semantic in light mode", () => {
  assert.match(renderCreatorTicketsSection, /styles\.creatorTicketStatAvailable,\s*!isDark && styles\.creatorTicketStatAvailableLight/);
  assert.match(renderCreatorTicketsSection, /styles\.creatorTicketStatAvailableValue,\s*\{\s*color:\s*isDark \? "#1D9E75" : colors\.success\s*\}/);
});

test("ticket edit icon is a readable secondary foreground and delete icon uses the destructive token in light mode", () => {
  assert.match(renderCreatorTicketsSection, /name="edit-2" size=\{20\} color=\{isDark \? "#B3B3B3" : colors\.textSecondary\}/);
  assert.match(renderCreatorTicketsSection, /name="trash-2" size=\{20\} color=\{isDark \? "#B3B3B3" : colors\.danger\}/);
});

test("reward card uses a light surface with a separating border in light mode", () => {
  assert.match(renderCreatorRewardsSection, /styles\.creatorRewardCard,\s*\n\s*!isDark && styles\.creatorRewardCardLight,/);
  assert.match(getStyleBlock("creatorRewardCardLight"), /backgroundColor:\s*"#FFFFFF"/);
  assert.match(getStyleBlock("creatorRewardCardLight"), /borderWidth:\s*1/);
});

test("reward title renders as primary readable text and description as secondary in light mode", () => {
  assert.match(renderCreatorRewardsSection, /styles\.creatorRewardTitle,\s*\{\s*color:\s*isDark \? "#B3B3B3" : colors\.text\s*\}/);
  assert.match(renderCreatorRewardsSection, /styles\.creatorRewardDescription,\s*\{\s*color:\s*isDark \? "#B3B3B3" : colors\.textSecondary\s*\}/);
});

test('reward "users left" badge is readable in light mode', () => {
  assert.match(renderCreatorRewardsSection, /styles\.creatorRewardCountBadge,\s*!isDark && styles\.creatorRewardCountBadgeLight/);
  assert.match(renderCreatorRewardsSection, /styles\.creatorRewardCountText,\s*\{\s*color:\s*isDark \? "#FFFFFF" : colors\.text\s*\}/);
});

test("reward edit/delete icons are readable in light mode", () => {
  assert.match(renderCreatorRewardsSection, /name="edit-2" size=\{20\} color=\{isDark \? "#B3B3B3" : colors\.textSecondary\}/);
  assert.match(renderCreatorRewardsSection, /name="trash-2" size=\{20\} color=\{isDark \? "#B3B3B3" : colors\.danger\}/);
});

test("Create ticket and Create Rewards buttons are readable in light mode", () => {
  assert.match(renderCreatorTicketsSection, /!isDark && styles\.createTicketButtonLight/);
  assert.match(renderCreatorTicketsSection, /color=\{isDark \? "#111111" : colors\.text\}/);
  assert.match(renderCreatorRewardsSection, /!isDark && styles\.createTicketButtonLight/);
  assert.match(renderCreatorRewardsSection, /color=\{isDark \? "#111111" : colors\.text\}/);
  assert.match(getStyleBlock("createTicketButtonLight"), /borderWidth:\s*1/);
});

test("Ticket/Reward selector icons stay on the existing theme-aware coloring", () => {
  assert.match(selectorSection, /color=\{isSelected \? colors\.text : colors\.textSecondary\}/);
});

test("dark mode creator card colors are unchanged", () => {
  assert.match(getStyleBlock("creatorTicketCard"), /backgroundColor:\s*"rgba\(17, 17, 17, 0\.8\)"/);
  assert.match(getStyleBlock("creatorRewardCard"), /backgroundColor:\s*"rgba\(17, 17, 17, 0\.8\)"/);
  assert.match(getStyleBlock("createTicketButton"), /backgroundColor:\s*"#B3B3B3"/);
  assert.match(getStyleBlock("creatorTicketStatAvailable"), /backgroundColor:\s*"rgba\(29, 158, 117, 0\.1\)"/);
});

test("ticket/reward action handlers are unchanged by the theme fix", () => {
  assert.match(renderCreatorTicketsSection, /onPress=\{onCreateTicket\}/);
  assert.match(renderCreatorTicketsSection, /onPress=\{\(\) => onViewTicket\?\.\(ticket\)\}/);
  assert.match(renderCreatorTicketsSection, /onPress=\{\(\) => onEditTicket\(ticket\)\}/);
  assert.match(renderCreatorTicketsSection, /onPress=\{\(\) => onDeleteTicket\(ticket\)\}/);
  assert.match(renderCreatorRewardsSection, /onPress=\{onCreateReward\}/);
  assert.match(renderCreatorRewardsSection, /onPress=\{\(\) => onViewReward\?\.\(item\)\}/);
  assert.match(renderCreatorRewardsSection, /onPress=\{\(\) => onEditReward\(item\)\}/);
  assert.match(renderCreatorRewardsSection, /onPress=\{\(\) => onDeleteReward\(item\)\}/);
});
