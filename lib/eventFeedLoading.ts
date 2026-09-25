import { isValidEventLocationFilter, type EventLocationFilter } from "@/lib/eventFilters";

export const getVisibleFeedEvents = <T>(events: T[], isEventLoading: boolean): T[] =>
  isEventLoading ? [] : events;

// Pure so it's directly unit-testable without importing the RN screen. The
// text must reflect *where* the filter is centered (current vs a manually
// selected place), not just "some filter is active" — see FilterModal's
// EventLocationSource.
export const getEventFilterSectionHeading = (
  nearby: EventLocationFilter | null | undefined,
): string => {
  if (!isValidEventLocationFilter(nearby)) {
    return "Filtered Events";
  }

  if (nearby.source === "current") {
    return "Nearby Events you can join";
  }

  const place = nearby.shortLabel?.trim() || nearby.label?.trim();

  return place ? `Events around ${place}` : "Filtered Events";
};

export const getEventFilterSectionEvents = <T>(
  events: T[],
  hasAppliedEventFilters: boolean,
  isEventLoading: boolean,
): T[] => (hasAppliedEventFilters ? getVisibleFeedEvents(events, isEventLoading) : []);

export const getMixedFeedEvents = <T>(
  events: T[],
  showEventFilterSection: boolean,
  isEventLoading: boolean,
): T[] => (showEventFilterSection ? [] : getVisibleFeedEvents(events, isEventLoading));

export const shouldShowEventFilterSection = (
  hasAppliedEventFilters: boolean,
  isEventLoading: boolean,
): boolean => hasAppliedEventFilters || isEventLoading;

export const shouldShowEventFilterEmptyState = ({
  hasAppliedEventFilters,
  isEventLoading,
  isFeedLoading,
  eventCount,
}: {
  hasAppliedEventFilters: boolean;
  isEventLoading: boolean;
  isFeedLoading: boolean;
  eventCount: number;
}): boolean =>
  hasAppliedEventFilters &&
  !isEventLoading &&
  !isFeedLoading &&
  eventCount === 0;

export const isLatestEventRequest = (requestId: number, currentRequestId: number): boolean =>
  requestId === currentRequestId;
