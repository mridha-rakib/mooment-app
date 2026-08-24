import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the ticket-sharing UI regression where Wallet split grouped passes
// into one card per pass and then navigated with only the selected pass.
// These source-level assertions match this repo's existing mobile test style.

const walletSource = readFileSync(join(process.cwd(), "app/event-screen/wallet.tsx"), "utf8");
const ticketDetailSource = readFileSync(join(process.cwd(), "app/event-screen/ticket-detail.tsx"), "utf8");
const qrSource = readFileSync(join(process.cwd(), "app/event-screen/qr-code.tsx"), "utf8");
const paymentsSource = readFileSync(join(process.cwd(), "lib/payments.ts"), "utf8");

test("wallet still renders one display card per pass while preserving sibling pass context", () => {
  assert.match(walletSource, /return passes\.map\(\(pass\) => \{/);
  assert.match(walletSource, /ticketPasses: \[pass\],/);
  assert.match(walletSource, /const walletContextPasses = item\.walletContextPasses \?\? item\.ticketPasses \?\? \[\];/);
  assert.match(walletSource, /walletContextPasses,/);
});

test("wallet passes selected pass plus full sibling context into Ticket Detail", () => {
  assert.match(walletSource, /ticketPasses: JSON\.stringify\(item\.ticketPasses \?\? \[\]\),/);
  assert.match(walletSource, /walletContextPasses: JSON\.stringify\(item\.walletContextPasses \?\? item\.ticketPasses \?\? \[\]\),/);
  assert.match(walletSource, /selectedOrderId: item\.ticketPasses\?\.\[0\]\?\.orderId \?\? item\.orderId,/);
  assert.match(walletSource, /selectedTicketIndex: String\(item\.ticketPasses\?\.\[0\]\?\.ticketIndex \?\? 1\),/);
});

test("Ticket Detail keeps selected-pass display separate from share context eligibility", () => {
  assert.match(ticketDetailSource, /const \[walletTicketPasses, setWalletTicketPasses\] = useState<TicketWalletPass\[\]>\(initialWalletTicketPasses\);/);
  assert.match(ticketDetailSource, /const \[walletContextPasses, setWalletContextPasses\] = useState<TicketWalletPass\[\]>\(initialWalletContextPasses\);/);
  assert.match(ticketDetailSource, /const selectedWalletPass = walletVisibleTicketPasses\[0\] \?\? null;/);
  assert.match(ticketDetailSource, /const walletActiveVisiblePassCount = walletShareContextPasses\.length;/);
  assert.match(ticketDetailSource, /const walletCanShare = !walletIsCancelled && walletSource === "owned" && walletActiveVisiblePassCount >= 2;/);
  assert.match(ticketDetailSource, /const walletCanManageShares = !walletIsCancelled && walletSource === "owned" && walletRevokeContextPasses\.length > 0;/);
  assert.match(ticketDetailSource, /const walletCanOpenShareModal = walletCanShare \|\| walletCanManageShares;/);
});

test("Ticket Detail sends QR the full context and selected pass identity", () => {
  assert.match(ticketDetailSource, /ticketPasses: JSON\.stringify\(walletShareContextPasses\),/);
  assert.match(ticketDetailSource, /selectedOrderId: selectedWalletPass\?\.orderId \?\? getParamValue\(params\.orderId, ""\),/);
  assert.match(ticketDetailSource, /selectedTicketIndex: String\(selectedWalletPass\?\.ticketIndex \?\? 1\),/);
});

test("QR initializes on the selected pass while preserving two-pass context for sharing and Ticket X of Y", () => {
  assert.match(qrSource, /const initialVisiblePasses = getVisibleQrTicketPasses\(initialTicketPasses, walletSource\);/);
  assert.match(qrSource, /const selectedIndex = findTicketPassIndex\(initialVisiblePasses, selectedOrderId, selectedTicketIndex\);/);
  assert.match(qrSource, /const shareablePassCount = visibleTicketPasses\.filter\(\(pass\) => pass\.status === 'active'\)\.length;/);
  assert.match(qrSource, /shareablePassCount >= 2/);
  assert.match(qrSource, /Ticket \{selectedVisiblePassNumber\} of \{visibleTicketPasses\.length \|\| 1\}/);
});

test("Ticket Detail share context excludes canceled unavailable sibling passes", () => {
  assert.match(ticketDetailSource, /const getWalletShareContextPasses = \(passes: TicketWalletPass\[\], walletSource: string\) =>/);
  assert.match(ticketDetailSource, /walletSource === "owned"[\s\S]*?passes\.filter\(\(pass\) =>[\s\S]*?!pass\.currentShare[\s\S]*?pass\.status === "active"[\s\S]*?!pass\.cancellation[\s\S]*?Boolean\(pass\.qrCode\)/);
});

test("Ticket Detail keeps revoke context separate from new-share eligibility", () => {
  assert.match(ticketDetailSource, /const getWalletRevokeContextPasses = \(passes: TicketWalletPass\[\], walletSource: string\) =>/);
  assert.match(ticketDetailSource, /walletSource === "owned"[\s\S]*?passes\.filter\(\(pass\) =>[\s\S]*?Boolean\(pass\.currentShare\)[\s\S]*?pass\.status === "active"[\s\S]*?!pass\.cancellation/);
  assert.match(ticketDetailSource, /const walletRevokeContextPasses = useMemo\([\s\S]*?getWalletRevokeContextPasses\(walletContextPasses, walletSource\)/);
  assert.match(ticketDetailSource, /const selectedRevokeSharePass =[\s\S]*?walletRevokeContextPasses\.find/);
  assert.match(ticketDetailSource, /const selectedShare = selectedRevokeSharePass\?\.currentShare \?\? null;/);
});

test("Share QR selector renders only the filtered owner-held active context", () => {
  assert.match(ticketDetailSource, /const initialShareContextPasses = getWalletShareContextPasses\(initialWalletContextPasses, walletSource\);/);
  assert.match(ticketDetailSource, /const walletShareContextPasses = useMemo\([\s\S]*?getWalletShareContextPasses\(walletContextPasses, walletSource\)/);
  assert.match(ticketDetailSource, /const selectedSharePass = walletShareContextPasses\[Math\.min\(selectedSharePassIndex, Math\.max\(0, walletShareContextPasses\.length - 1\)\)\] \?\? null;/);
  assert.match(ticketDetailSource, /walletShareContextPasses\.length > 1[\s\S]*?walletShareContextPasses\.map\(\(pass, index\) =>/);
  assert.doesNotMatch(ticketDetailSource, /walletContextPasses\.length > 1[\s\S]*?walletContextPasses\.map\(\(pass, index\) =>/);
});

test("shared-away, used, and canceled passes are still excluded by existing filters", () => {
  assert.match(ticketDetailSource, /!pass\.currentShare/);
  assert.match(ticketDetailSource, /pass\.status === "active"/);
  assert.match(ticketDetailSource, /!pass\.cancellation/);
  assert.match(qrSource, /walletSource === 'owned' \? passes\.filter\(\(pass\) => !pass\.currentShare\) : passes/);
  assert.match(qrSource, /\.filter\(\(pass\) => pass\.status !== 'cancelled' && !pass\.cancellation\)/);
});

test("cancel share uses revoke pass identity and restores owner-held active QR state", () => {
  assert.match(ticketDetailSource, /const cancelledShare = await cancelTicketShare\(selectedShare\.id\);/);
  assert.match(ticketDetailSource, /pass\.orderId === selectedRevokeSharePass\.orderId && pass\.ticketIndex === selectedRevokeSharePass\.ticketIndex/);
  assert.match(ticketDetailSource, /status: "active"[\s\S]*?ticketNo: cancelledShare\.qrCode[\s\S]*?qrCode: cancelledShare\.qrCode[\s\S]*?currentShare: null/);
  assert.match(qrSource, /const cancelledShare = await cancelTicketShare\(selectedCurrentShare\.id\);/);
  assert.match(qrSource, /pass\.orderId === selectedRevokePass\.orderId && pass\.ticketIndex === selectedRevokePass\.ticketIndex/);
  assert.match(qrSource, /status: 'active'[\s\S]*?ticketNo: cancelledShare\.qrCode[\s\S]*?qrCode: cancelledShare\.qrCode[\s\S]*?currentShare: null/);
});

test("QR keeps create-share and revoke-share contexts separate", () => {
  assert.match(qrSource, /const getVisibleQrTicketPasses = \(passes: TicketWalletPass\[\], walletSource: string\) =>/);
  assert.match(qrSource, /const getRevokeQrTicketPasses = \(passes: TicketWalletPass\[\], walletSource: string\) =>/);
  assert.match(qrSource, /passes\.filter\(\(pass\) => Boolean\(pass\.currentShare\) && pass\.status === 'active' && !pass\.cancellation\)/);
  assert.match(qrSource, /const canManageSelectedShare = \([\s\S]*?Boolean\(selectedCurrentShare && selectedRevokePass\)/);
  assert.match(qrSource, /\(canShareSelectedPass \|\| canManageSelectedShare\)/);
  assert.match(qrSource, /disabled=\{isShareSubmitting \|\| !canShareSelectedPass\}/);
});

test("full cancel then re-share lifecycle keeps the same pass identity available", () => {
  assert.match(ticketDetailSource, /const sharePass = selectedSharePass;/);
  assert.match(ticketDetailSource, /orderId: sharePass\.orderId,[\s\S]*?ticketIndex: sharePass\.ticketIndex/);
  assert.match(ticketDetailSource, /selectedRevokeSharePass\.orderId[\s\S]*?selectedRevokeSharePass\.ticketIndex/);
  assert.match(ticketDetailSource, /currentShare: share/);
  assert.match(ticketDetailSource, /currentShare: null/);
});

test("existing share modal API wiring is reused; no new ticket-share API is introduced", () => {
  assert.match(paymentsSource, /api\.post\("\/payments\/ticket-shares"/);
  assert.match(paymentsSource, /api\.delete\(`\/payments\/ticket-shares\/\$\{encodeURIComponent\(shareId\)\}`\)/);
  assert.match(ticketDetailSource, /const share = await shareTicketWithFriend\(\{/);
  assert.match(qrSource, /const share = await shareTicketWithFriend\(\{/);
  assert.doesNotMatch(ticketDetailSource, /\/ticket-share-screen|\/share-ticket/);
  assert.doesNotMatch(qrSource, /\/ticket-share-screen|\/share-ticket/);
});
