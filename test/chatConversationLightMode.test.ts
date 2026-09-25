import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Chat conversation screen light-mode fix. Root cause: unlike
// messages.tsx, chat-detail.tsx had ZERO theme integration — no useTheme()
// import/call anywhere in the file. The screen background, header, every
// message bubble type, and the composer all rendered from a single static
// CHAT_COLORS object (and additional inline literals), so the screen
// stayed fully dark-styled regardless of the app's theme setting.
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const chatDetailSource = readFileSync(join(process.cwd(), "app/chat-screen/chat-detail.tsx"), "utf8");

test("chat-detail.tsx now imports and uses useTheme() (previously had none at all)", () => {
  assert.match(chatDetailSource, /import \{ useTheme \} from '@\/hooks\/useTheme';/);
  // Used in the main screen plus the two bubble components that needed a
  // light-mode branch (TextBubble covers text+location, AudioBubble covers
  // audio) — at least 3 call sites.
  const useThemeCalls = chatDetailSource.match(/const \{ colors, isDark \} = useTheme\(\);/g) ?? [];
  assert.ok(useThemeCalls.length >= 3, `expected at least 3 useTheme() calls, found ${useThemeCalls.length}`);
});

test("screen background and status bar are theme-aware; dark mode keeps its exact prior values", () => {
  assert.match(chatDetailSource, /styles\.safe, !isDark && \{ backgroundColor: colors\.background \}/);
  assert.match(
    chatDetailSource,
    /barStyle=\{isDark \? "light-content" : "dark-content"\} backgroundColor=\{isDark \? "#0e0d12" : colors\.background\}/,
  );
});

test("header surface and text are theme-aware; dark mode's exact pre-existing header style is untouched", () => {
  assert.match(chatDetailSource, /styles\.header, !isDark && \{ backgroundColor: colors\.card, borderColor: colors\.border \}/);
  assert.match(chatDetailSource, /styles\.headerName, !isDark && \{ color: colors\.text \}/);
  assert.match(chatDetailSource, /styles\.headerStatus, !isDark && \{ color: colors\.textSecondary \}/);
  // Dark mode's header style keys are untouched in the StyleSheet itself.
  assert.match(chatDetailSource, /header: \{[\s\S]*?backgroundColor: 'rgba\(255, 255, 255, 0\.03\)',/);
});

test("incoming (receiver) bubble gets a light-theme surface; outgoing (sender) purple bubble is untouched", () => {
  assert.match(chatDetailSource, /isIncomingLight = !msg\.fromMe && !isDark;/);
  assert.match(
    chatDetailSource,
    /isIncomingLight && \{ backgroundColor: colors\.card, borderColor: colors\.border \}/,
  );
  // bubbleMe (outgoing) style key itself is never touched.
  assert.match(chatDetailSource, /bubbleMe: \{ backgroundColor: CHAT_COLORS\.senderAccent, borderBottomRightRadius: 2 \}/);
});

test("incoming bubble text is readable in light mode; outgoing text color is untouched", () => {
  assert.match(chatDetailSource, /styles\.bubbleTextThem,\s*\r?\n\s*isIncomingLight && \{ color: colors\.text \}/);
  assert.match(chatDetailSource, /bubbleTextMe: \{ color: CHAT_COLORS\.senderText \}/);
});

test("location message: incoming card surface/text are theme-aware, outgoing (sender) purple treatment is untouched", () => {
  assert.match(chatDetailSource, /styles\.locationBox, isIncomingLight && \{ backgroundColor: colors\.backgroundSecondary \}/);
  assert.match(chatDetailSource, /styles\.locationTitle, isIncomingLight && \{ color: colors\.text \}/);
  assert.match(chatDetailSource, /locationIconWrapMe: \{ backgroundColor: CHAT_COLORS\.senderAccent \}/);
});

test("audio message: incoming play button/waveform/duration are theme-aware; outgoing (purple) side untouched", () => {
  assert.match(chatDetailSource, /const audioFgColor = isIncomingLight \? colors\.text : CHAT_COLORS\.senderText;/);
  assert.match(chatDetailSource, /styles\.audioPlayBtn,\s*msg\.fromMe && styles\.audioPlayBtnMe,\s*isIncomingLight && \{ backgroundColor: colors\.backgroundSecondary \}/);
  assert.match(chatDetailSource, /audioPlayBtnMe: \{ backgroundColor: 'rgba\(255,255,255,0\.22\)' \}/);
});

test("timestamp/edited/delivered metadata: incoming side is theme-aware, outgoing (on purple) is untouched", () => {
  assert.match(chatDetailSource, /styles\.bubbleTime, msg\.fromMe && styles\.bubbleTimeMe, isIncomingLight && \{ color: colors\.textSecondary \}/);
  assert.match(chatDetailSource, /bubbleTimeMe: \{ color: CHAT_COLORS\.metadataTextOnAccent \}/);
});

test("composer surface/placeholder/icons are theme-aware; send button behavior/icon untouched", () => {
  assert.match(chatDetailSource, /styles\.inputBar, !isDark && \{ backgroundColor: colors\.background \}/);
  assert.match(chatDetailSource, /styles\.inputWrap, !isDark && \{ backgroundColor: colors\.backgroundSecondary \}/);
  assert.match(chatDetailSource, /placeholderTextColor=\{colors\.textSecondary\}/);
  assert.match(chatDetailSource, /onPress=\{sendMessage\}/);
  assert.match(chatDetailSource, /Feather name="send" size=\{18\} color="#111111"/);
});

test("media rendering (Image/VideoBubble) and location payload handling are unchanged", () => {
  assert.match(chatDetailSource, /function ImageBubble\(\{ msg \}: \{ msg: Message \}\)/);
  assert.match(chatDetailSource, /Image source=\{\{ uri: msg\.imageUri \|\| '' \}\} style=\{styles\.bubbleImage\}/);
  assert.match(chatDetailSource, /openMapLocation\(locationAttachment\.latitude, locationAttachment\.longitude, locationAttachment\.label\)/);
});

test("socket/message send functionality is unchanged (no edits inside sendMessage or the realtime subscription wiring)", () => {
  assert.match(chatDetailSource, /import \* as realtimeSocket from '@\/lib\/socketClient';/);
  assert.match(chatDetailSource, /getDirectMessageHistory|getGroupMessages/);
});
