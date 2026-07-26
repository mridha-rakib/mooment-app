import {
  MAX_EVENT_RADIUS_MILES,
  MIN_EVENT_RADIUS_MILES,
  buildEventFilterRequestParams,
  isValidEventLocationFilter,
  normalizeEventRadiusMiles,
  type SharedEventFilters,
} from "@/lib/eventFilters";
import type { EventMapQuery } from "@/lib/events";

export type EventMapViewport = {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
};

const LOW_ZOOM_THRESHOLD = 3;
const MID_ZOOM_THRESHOLD = 5;
const LOW_ZOOM_COORDINATE_PRECISION = 0;
const MID_ZOOM_COORDINATE_PRECISION = 1;
const HIGH_ZOOM_COORDINATE_PRECISION = 3;
const LOW_ZOOM_BUCKET_SIZE = 0.5;
const HIGH_ZOOM_BUCKET_SIZE = 0.25;
const MIN_FILTER_RECENTER_ZOOM = 6;
const MAX_FILTER_RECENTER_ZOOM = 14;

const roundToPrecision = (value: number, precision: number) =>
  Number(value.toFixed(precision));

const getCoordinatePrecision = (zoom: number) => {
  if (zoom <= LOW_ZOOM_THRESHOLD) {
    return LOW_ZOOM_COORDINATE_PRECISION;
  }

  if (zoom <= MID_ZOOM_THRESHOLD) {
    return MID_ZOOM_COORDINATE_PRECISION;
  }

  return HIGH_ZOOM_COORDINATE_PRECISION;
};

const getZoomBucket = (zoom: number) => {
  const bucketSize = zoom <= LOW_ZOOM_THRESHOLD ? LOW_ZOOM_BUCKET_SIZE : HIGH_ZOOM_BUCKET_SIZE;

  return Number((Math.round(zoom / bucketSize) * bucketSize).toFixed(2));
};

const isFiniteViewportNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const normalizeMapViewport = (
  viewport: EventMapViewport | null | undefined,
): EventMapViewport | null => {
  if (
    !viewport ||
    !isFiniteViewportNumber(viewport.north) ||
    !isFiniteViewportNumber(viewport.south) ||
    !isFiniteViewportNumber(viewport.east) ||
    !isFiniteViewportNumber(viewport.west) ||
    !isFiniteViewportNumber(viewport.zoom)
  ) {
    return null;
  }

  const zoomBucket = getZoomBucket(viewport.zoom);
  const coordinatePrecision = getCoordinatePrecision(zoomBucket);

  return {
    north: roundToPrecision(Math.max(viewport.north, viewport.south), coordinatePrecision),
    south: roundToPrecision(Math.min(viewport.north, viewport.south), coordinatePrecision),
    east: roundToPrecision(viewport.east, coordinatePrecision),
    west: roundToPrecision(viewport.west, coordinatePrecision),
    zoom: zoomBucket,
  };
};

export const getMapViewportPageBudget = (
  filters: SharedEventFilters,
  viewport: EventMapViewport | null | undefined,
): number | null => {
  if (isValidEventLocationFilter(filters.nearby)) {
    return null;
  }

  const normalizedViewport = normalizeMapViewport(viewport);
  if (!normalizedViewport) {
    return null;
  }

  if (normalizedViewport.zoom <= LOW_ZOOM_THRESHOLD) {
    return 1;
  }

  if (normalizedViewport.zoom <= MID_ZOOM_THRESHOLD) {
    return 2;
  }

  return null;
};

export const getMapViewportRequestKey = (
  viewport: EventMapViewport | null | undefined,
): string | null => {
  const normalized = normalizeMapViewport(viewport);

  return normalized ? JSON.stringify(normalized) : null;
};

export const getRadiusAwareMapZoom = (radiusMiles: number): number => {
  const normalizedRadius = normalizeEventRadiusMiles(radiusMiles);
  const radiusProgress = Math.log2(normalizedRadius / MIN_EVENT_RADIUS_MILES);
  const maxProgress = Math.log2(MAX_EVENT_RADIUS_MILES / MIN_EVENT_RADIUS_MILES);
  const zoom = MAX_FILTER_RECENTER_ZOOM -
    (radiusProgress / maxProgress) * (MAX_FILTER_RECENTER_ZOOM - MIN_FILTER_RECENTER_ZOOM);

  return Number(Math.max(MIN_FILTER_RECENTER_ZOOM, Math.min(MAX_FILTER_RECENTER_ZOOM, zoom)).toFixed(2));
};

export const buildMapEventRequestParams = (
  filters: SharedEventFilters,
  viewport: EventMapViewport | null,
  limit: number,
): EventMapQuery | null => {
  const hasValidNearbyFilter = isValidEventLocationFilter(filters.nearby);
  const params = buildEventFilterRequestParams(filters, {
    includeLocation: hasValidNearbyFilter,
    limit,
  });

  if (hasValidNearbyFilter) {
    return params;
  }

  const normalizedViewport = normalizeMapViewport(viewport);
  if (!normalizedViewport) {
    return null;
  }

  params.north = normalizedViewport.north;
  params.south = normalizedViewport.south;
  params.east = normalizedViewport.east;
  params.west = normalizedViewport.west;

  return params;
};
