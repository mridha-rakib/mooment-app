import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const accessSource = readFileSync(
  join(process.cwd(), "components/eventTabs/AccessTab.tsx"),
  "utf8",
);

const getStyleBlock = (styleName: string) => {
  const match = accessSource.match(new RegExp(`${styleName}: \\{([\\s\\S]*?)\\n  \\},`));
  assert.ok(match, `Expected ${styleName} style block to exist`);
  return match[1] ?? "";
};

test("ticket offer summary reserves content-driven height above nested ticket card", () => {
  const rewardRow = getStyleBlock("rewardRow");
  const rewardRowLeft = getStyleBlock("rewardRowLeft");
  const benefitText = getStyleBlock("bogoDescText");
  const claimedBadge = getStyleBlock("claimedRewardBannerBadge");

  assert.doesNotMatch(rewardRow, /\bheight:\s*46\b/);
  assert.match(rewardRow, /paddingVertical:\s*12/);
  assert.match(rewardRow, /alignItems:\s*"flex-start"/);
  assert.match(rewardRow, /gap:\s*12/);
  assert.match(rewardRowLeft, /minWidth:\s*0/);
  assert.match(benefitText, /flexShrink:\s*1/);
  assert.match(claimedBadge, /alignSelf:\s*"flex-start"/);
  assert.match(claimedBadge, /minHeight:\s*24/);
});
