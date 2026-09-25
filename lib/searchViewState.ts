// Pure, unit-testable helpers for the Search screen's Loading / Error / Empty /
// Results state machine. No RN imports so the rules can be tested directly
// (repo convention — see lib/eventFeedLoading.ts).

export type SearchSourceState = "loading" | "error" | "empty" | "results";

// Rows are only "current" for the visible query when the query they were
// fetched for still matches the derived query in play right now. This is what
// prevents results known to belong to an older query (e.g. "cat") from being
// rendered under a newer visible query (e.g. "party") on the All tab, where the
// old rows would otherwise stay mounted while the newer request is in flight.
export const selectCurrentRows = <T>(
  derivedQuery: string,
  rowsQuery: string,
  rows: T[],
): T[] => (derivedQuery.length > 0 && derivedQuery === rowsQuery ? rows : []);

// State of a single network-driven search source (People / Events / Hashtag
// probe) for the query currently in the input.
//
// - no query            -> fall back to the zero-query recommendation list
// - latest request errored (and nothing newer is loading) -> ERROR
// - a request is in flight, OR the applied rows belong to an older query
//   -> LOADING (never surface stale rows, never call an in-flight request empty)
// - settled, rows match the current query -> RESULTS / EMPTY by count
export const getSearchSourceState = ({
  hasQuery,
  isFetching,
  hasError,
  rowsMatchQuery,
  rowCount,
}: {
  hasQuery: boolean;
  isFetching: boolean;
  hasError: boolean;
  rowsMatchQuery: boolean;
  rowCount: number;
}): SearchSourceState => {
  if (!hasQuery) {
    return rowCount > 0 ? "results" : "empty";
  }
  if (hasError && !isFetching) {
    return "error";
  }
  if (isFetching || !rowsMatchQuery) {
    return "loading";
  }
  return rowCount > 0 ? "results" : "empty";
};

// Combine the relevant per-section states into the screen-level state for the
// active tab. On the All tab `states` holds every visible section; on a
// dedicated tab it holds just that section.
//
// - at least one section has rows              -> RESULTS (partial failure of a
//   sibling source never hides a section that succeeded)
// - otherwise, anything still loading          -> LOADING
// - otherwise, every section errored           -> ERROR
// - otherwise                                  -> EMPTY
export const getScreenSearchState = (states: SearchSourceState[]): SearchSourceState => {
  if (states.length === 0) {
    return "empty";
  }
  if (states.some((state) => state === "results")) {
    return "results";
  }
  if (states.some((state) => state === "loading")) {
    return "loading";
  }
  if (states.every((state) => state === "error")) {
    return "error";
  }
  return "empty";
};
