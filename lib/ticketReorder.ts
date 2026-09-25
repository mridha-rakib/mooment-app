// EVT-014 — pure array-position reorder helper. Deliberately touches nothing
// but array order: it never reads or writes any ticket field (price,
// capacity, availableCount, salesEndAt, id, ...), so a ticket's data and
// identity are always carried through byte-for-byte — only its position in
// the returned array can differ from the input.
export type ReorderableTicket = { localId: string };

export const moveTicketInArray = <T extends ReorderableTicket>(
  tickets: T[],
  localId: string,
  direction: "up" | "down",
): T[] => {
  const index = tickets.findIndex((ticket) => ticket.localId === localId);

  if (index === -1) {
    return tickets;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= tickets.length) {
    return tickets;
  }

  const next = [...tickets];
  const moved = next[index] as T;
  next[index] = next[targetIndex] as T;
  next[targetIndex] = moved;

  return next;
};
