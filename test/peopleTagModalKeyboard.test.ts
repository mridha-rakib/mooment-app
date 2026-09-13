import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// CRT-005 — Friend search sheet must follow the keyboard.
//
// Source-string assertions, matching this repo's convention (taggedPeopleSheet /
// createPostDoubleTapSafety / repostShareManagement): the project has no React
// Native render/interaction harness, so the keyboard-safe layout fix is verified
// against the exact component source. Real keyboard overlap / small-screen
// visibility / iOS geometry are explicitly NOT covered here (see the audit
// report — they require on-device verification).

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");

const source = read("components/post/PeopleTagModal.tsx");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const appBaseJson = read("app.base.json");
const packageJson = read("package.json");

// ── 1. A sheet-local keyboard-aware mechanism exists ──────────────────

test("the sheet tracks the keyboard locally via RN Keyboard events (not a global config)", () => {
  assert.match(source, /import \{[^}]*\bKeyboard\b[^}]*\} from 'react-native';/);
  assert.match(source, /Keyboard\.addListener\(\s*showEvent/);
  assert.match(source, /Keyboard\.addListener\(\s*hideEvent/);
  // Platform-correct event names on each OS.
  assert.match(source, /Platform\.OS === 'ios' \? 'keyboardWillShow' : 'keyboardDidShow'/);
  assert.match(source, /Platform\.OS === 'ios' \? 'keyboardWillHide' : 'keyboardDidHide'/);
});

test("keyboard state updates only on show/hide and the listeners are cleaned up", () => {
  assert.match(source, /const \[keyboardHeight, setKeyboardHeight\] = useState\(0\)/);
  assert.match(source, /setKeyboardHeight\(event\.endCoordinates\?\.height \?\? 0\)/);
  assert.match(source, /showSub\.remove\(\);\s*\n\s*hideSub\.remove\(\);/);
  // No per-frame polling / interval / requestAnimationFrame loop.
  assert.doesNotMatch(source, /setInterval|requestAnimationFrame|keyboardDidChangeFrame/);
});

test("the keyboard effect is scoped to the modal being visible", () => {
  assert.match(source, /React\.useEffect\(\(\) => \{\s*\n\s*if \(!visible\) \{\s*\n\s*setKeyboardHeight\(0\);/);
  assert.match(source, /\}, \[visible\]\);/);
});

// ── 2/3. FlatList keyboard props ─────────────────────────────────────

test("FlatList keeps first-tap selection: keyboardShouldPersistTaps=\"handled\"", () => {
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.doesNotMatch(source, /keyboardShouldPersistTaps="never"/);
});

test("FlatList has an explicit keyboardDismissMode that still allows scrolling + Add", () => {
  assert.match(source, /keyboardDismissMode="on-drag"/);
});

// ── 4. List height is responsive, not a rigid 340 ───────────────────

test("the result list can shrink with available space — no lone fixed maxHeight:340", () => {
  // The inline `style={{ maxHeight: 340 }}` on the FlatList is gone.
  assert.doesNotMatch(source, /style=\{\{ maxHeight: 340 \}\}/);
  // maxHeight is retained ONLY alongside flexShrink so the closed-keyboard
  // layout is visually identical but the list can still give up space.
  assert.match(source, /list: \{ flexGrow: 0, flexShrink: 1, maxHeight: 340 \}/);
  assert.match(source, /listWrapper: \{ flexShrink: 1, minHeight: 0 \}/);
  assert.match(source, /<View style=\{styles\.listWrapper\} \{\.\.\.contentPanHandlers\}>/);
  assert.match(source, /style=\{styles\.list\}/);
});

test("the sheet is bounded to the keyboard-adjusted viewport", () => {
  assert.match(source, /const \{ height: windowHeight \} = useWindowDimensions\(\)/);
  assert.match(source, /sheetMaxHeight = Math\.max\(240, windowHeight - keyboardHeight - insets\.top - 12\)/);
  assert.match(source, /maxHeight: sheetMaxHeight/);
});

// ── 3 (safe area). No double bottom inset when the keyboard is open ──

test("safe-area padding is not stacked with keyboard padding", () => {
  // Closed keyboard: original bottomInset + 16 is preserved.
  assert.match(source, /sheetPaddingBottom = isKeyboardOpen \? 12 : bottomInset \+ 16/);
  // Open keyboard: the sheet is lifted by exactly the keyboard height on the
  // overlay, and the in-sheet bottom inset collapses to a small constant.
  assert.match(source, /isKeyboardOpen && \{ paddingBottom: keyboardHeight \}/);
  assert.match(source, /const bottomInset = Platform\.OS === 'android'\s*\n\s*\? Math\.max\(insets\.bottom, ANDROID_NAV_FALLBACK\)/);
});

// ── 5. Selection semantics are untouched ────────────────────────────

test("selection state ownership is unchanged (localSelected + onSelect(next), synced from `selected`)", () => {
  assert.match(source, /const \[localSelected, setLocalSelected\] = useState<TaggedFriend\[\]>\(selected\)/);
  assert.match(
    source,
    /const toggle = \(friend: Friend\) => \{[\s\S]*?setLocalSelected\(next\);\s*\n\s*onSelect\(next\); \/\/ ← instant update to parent\s*\n\s*\}/,
  );
  assert.match(source, /React\.useEffect\(\(\) => \{\s*\n\s*setLocalSelected\(selected\);\s*\n\s*\}, \[visible, selected\]\);/);
  assert.match(source, /onPress=\{\(\) => toggle\(item\)\}/);
  assert.match(source, /\{isAdded \? 'Added' : 'Add'\}/);
});

// ── 6. Drag-to-dismiss still wired to the shared hook ───────────────

test("drag-to-dismiss still uses the shared hook, unchanged", () => {
  assert.match(source, /import \{ useBottomSheetDragDismiss \} from '@\/components\/ui\/useBottomSheetDragDismiss';/);
  assert.match(source, /sheetTranslateY,\s*\n\s*dragPanHandlers,\s*\n\s*contentPanHandlers,\s*\n\s*\} = useBottomSheetDragDismiss\(\{/);
  assert.match(source, /canStartContentDrag: \(\) => listOffsetYRef\.current <= 0/);
  assert.match(source, /<View \{\.\.\.dragPanHandlers\}>/);
  assert.match(source, /transform: \[\{ translateY: sheetTranslateY \}\]/);
});

// ── 7. Backdrop + system-back close still wired ─────────────────────

test("backdrop tap and Android back still close the sheet", () => {
  assert.match(source, /<Modal [^>]*onRequestClose=\{onClose\}>/);
  assert.match(source, /<TouchableOpacity style=\{\{ flex: 1 \}\} activeOpacity=\{1\} onPress=\{onClose\} \/>/);
});

// ── 8. No global keyboard config / no dependency change ─────────────

test("no global Android keyboard config was touched", () => {
  // Activity keyboard mode is still the pre-existing adjustResize.
  assert.match(manifest, /android:windowSoftInputMode="adjustResize"/);
  // No softwareKeyboardLayoutMode / expo-build-properties keyboard plugin added.
  assert.doesNotMatch(appBaseJson, /softwareKeyboardLayoutMode|windowSoftInputMode/);
  // The component does not reach for app config / native config.
  assert.doesNotMatch(source, /expo-build-properties|softwareKeyboardLayoutMode|AndroidManifest/);
});

test("no bottom-sheet / keyboard dependency was added", () => {
  assert.doesNotMatch(source, /@gorhom\/bottom-sheet|react-native-keyboard-controller|react-native-bottom-sheet|reanimated-bottom-sheet/);
  assert.doesNotMatch(packageJson, /@gorhom\/bottom-sheet|react-native-keyboard-controller/);
});

// ── Visual lock: no redesign of the sheet chrome ───────────────────

test("sheet visual identity is unchanged (palette, radius, handle, title, row + Add button styles)", () => {
  assert.match(source, /backgroundColor: '#1E1E1E'/);
  assert.match(source, /borderTopLeftRadius: 24,\s*\n\s*borderTopRightRadius: 24/);
  assert.match(source, /handle: \{\s*\n\s*width: 80, height: 3, borderRadius: 2/);
  assert.match(source, /<Text style=\{styles\.title\}>Friend List<\/Text>/);
  assert.match(source, /addBtn: \{\s*\n\s*borderWidth: 1\.5,\s*\n\s*borderColor: '#FFFFFF'/);
  assert.match(source, /animationType="slide"/);
});

// ── Data source untouched ─────────────────────────────────────────

test("friend fetching is unchanged (getFriendUsers, same args)", () => {
  assert.match(source, /import \{ getFriendUsers \} from '@\/lib\/users';/);
  assert.match(source, /getFriendUsers\(undefined, 100\)/);
});
