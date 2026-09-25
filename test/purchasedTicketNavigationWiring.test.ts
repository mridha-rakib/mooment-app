import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(import.meta.dirname, "..", file), "utf8");
const checkout = read("app/event-screen/checkout.tsx");
const explore = read("app/(tabs)/explore.tsx");
const layout = read("app/_layout.tsx");
const ticketDetail = read("app/event-screen/ticket-detail.tsx");
const helper = read("lib/purchasedTicketNavigation.ts");

test("paid and free checkout use the confirmed first pass to replace with Ticket Detail", () => {
  assert.match(checkout, /notifySuccess\(order\.totalAmount <= 0 \? "Ticket confirmed" : "Payment complete"\)/);
  assert.match(checkout, /await openPurchasedTicket\(router,[\s\S]*orderId: order\.id,[\s\S]*ticketId: selectedPass\.ticketId,[\s\S]*ticketIndex: selectedPass\.ticketIndex,[\s\S]*"replace"/);
  assert.doesNotMatch(checkout, /pathname: "\/event-screen\/event",\s*params: \{ eventId \}/);
});

test("new buyer notifications use exact ticket identity and legacy notifications retain Event Details fallback", () => {
  assert.match(explore, /item\.type === "ticket_buyer" && item\.orderId && item\.ticketId && item\.ticketIndex/);
  assert.match(explore, /openPurchasedTicket\(router/);
  assert.match(explore, /else if \(item\.eventId\)/);
  assert.match(layout, /data\.type === "ticket_buyer" && data\.orderId && data\.ticketId && data\.ticketIndex/);
});

test("ticket detail only renders backend-derived remaining eligibility when positive", () => {
  assert.match(ticketDetail, /remainingPurchasableQuantity > 0/);
  assert.match(ticketDetail, /more .*ticket.*of this type available/);
  assert.match(helper, /remainingPurchasableQuantity/);
});

test("the selected pass is deterministic and uses the canonical Ticket Detail wallet route", () => {
  assert.match(helper, /ticketPasses: JSON\.stringify\(\[pass\]\)/);
  assert.match(helper, /selectedOrderId: pass\.orderId/);
  assert.match(helper, /pathname: "\/event-screen\/ticket-detail"/);
});
