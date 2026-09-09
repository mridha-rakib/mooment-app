// Small shared layout constants for the event-card surfaces.
//
// This is deliberately NOT a design system. It exists only to remove the
// audited magic-number coupling on the Map swipe card (EventPreviewModal) and
// to hold the one deterministic height budget that stops that card's footprint
// from changing with content (live vs non-live, ticket-type present vs absent,
// long host names, longer localized date strings, changing attendee counts).
//
// EventFeedCard's own geometry (image box 250, card radius 12, inner padding
// 12, header/action paddings) is intentionally left inline in that component —
// it is already deterministic and is locked by existing regression tests.

/**
 * Outer horizontal inset of an event card from the screen edge.
 * Matches EventFeedCard's `card.marginHorizontal` (16) so the two surfaces
 * sit on the same left/right rhythm.
 */
export const EVENT_CARD_HORIZONTAL_INSET = 16;

/** Inner padding of the Map swipe card container (EventPreviewModal `container`). */
export const MAP_PREVIEW_CONTAINER_PADDING = 20;

// ── Map swipe slide deterministic height budget ────────────────────────────
// Derived from the existing EventPreviewModal rows (not an arbitrary number).
// Every swipe slide reserves this content-column height, and a flexible spacer
// before the CTA takes up any slack, so the `View Event` button sits at the
// same vertical offset on every slide and the horizontal carousel never jumps
// vertically while swiping.

/** Reserved height of the live / crowd status region, kept even when not live. */
export const MAP_PREVIEW_STATUS_REGION_HEIGHT = 28;

const HEADER_BLOCK = 48 + 12; //  iconBox (tallest header child) + header.marginBottom
const STATUS_BLOCK = MAP_PREVIEW_STATUS_REGION_HEIGHT + 16; //  reserved badge row + statusRow.marginBottom
const DIVIDER_BLOCK = 1 + 16; //  divider height + divider.marginBottom

const METADATA_ROW = 20; //  one icon + single-line-text metadata row
const BADGE_ROW = 28; //  one pill row (paddingVertical 6 + single-line text)

//  primary / shared-core block: Start row, Location row, Attending pill
const PRIMARY_BLOCK = METADATA_ROW + METADATA_ROW + BADGE_ROW + 12 * 2 + 16;

//  map-specific secondary block: End row, Age + Price pills,
//  ticket info (worst case = 3 sub-rows incl. ticketTypeCount)
const SECONDARY_BLOCK =
  METADATA_ROW + BADGE_ROW + (METADATA_ROW * 3 + 8 * 2) + 12 * 2;

const CTA_BLOCK = 48; //  primaryBtn.height

/** Reserved content-column height for a single Map swipe slide. */
export const MAP_PREVIEW_SLIDE_MIN_HEIGHT =
  HEADER_BLOCK +
  STATUS_BLOCK +
  DIVIDER_BLOCK +
  PRIMARY_BLOCK +
  SECONDARY_BLOCK +
  CTA_BLOCK;
