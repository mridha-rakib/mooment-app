export const getVisibleFeedEvents = <T>(events: T[], isEventLoading: boolean): T[] =>
  isEventLoading ? [] : events;

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
