export type MapCarouselCoordinate = [number, number];

export type MapCarouselMarker = {
  id: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number | null;
  category?: string | null;
  categories?: readonly string[] | null;
};

export type MapCarouselReference = {
  userLocation?: MapCarouselCoordinate | null;
  cameraCenter?: MapCarouselCoordinate | null;
};

export type MapCarouselSwipeDirection = "left" | "right";

const toRadians = (value: number) => (value * Math.PI) / 180;

export const isValidCarouselCoordinate = (
  coordinate: MapCarouselCoordinate | null | undefined,
): coordinate is MapCarouselCoordinate =>
  Boolean(
    coordinate &&
      coordinate.length === 2 &&
      Number.isFinite(coordinate[0]) &&
      Number.isFinite(coordinate[1]) &&
      coordinate[1] >= -90 &&
      coordinate[1] <= 90 &&
      coordinate[0] >= -180 &&
      coordinate[0] <= 180,
  );

export const getCoordinateDistanceMeters = (
  from: MapCarouselCoordinate,
  to: MapCarouselCoordinate,
) => {
  const earthRadiusMeters = 6371000;
  const [fromLongitude, fromLatitude] = from;
  const [toLongitude, toLatitude] = to;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const hasReliableDistanceOrder = (markers: readonly MapCarouselMarker[]) =>
  markers.length > 0 &&
  markers.every((marker) => (
    typeof marker.distanceMeters === "number" && Number.isFinite(marker.distanceMeters)
  ));

const getMarkerCoordinate = (marker: MapCarouselMarker): MapCarouselCoordinate | null => {
  const coordinate: MapCarouselCoordinate = [marker.longitude, marker.latitude];

  return isValidCarouselCoordinate(coordinate) ? coordinate : null;
};

export const getNearestEventSequence = <T extends MapCarouselMarker>(
  markers: readonly T[],
  reference: MapCarouselReference = {},
): T[] => {
  if (markers.length <= 1) {
    return [...markers];
  }

  if (hasReliableDistanceOrder(markers)) {
    return markers
      .map((marker, index) => ({ marker, index }))
      .sort((first, second) => (
        (first.marker.distanceMeters ?? 0) - (second.marker.distanceMeters ?? 0) ||
        first.index - second.index
      ))
      .map(({ marker }) => marker);
  }

  const referenceCoordinate = isValidCarouselCoordinate(reference.userLocation)
    ? reference.userLocation
    : isValidCarouselCoordinate(reference.cameraCenter)
      ? reference.cameraCenter
      : null;

  if (!referenceCoordinate) {
    return [...markers];
  }

  return markers
    .map((marker, index) => {
      const markerCoordinate = getMarkerCoordinate(marker);

      return {
        marker,
        index,
        distance: markerCoordinate
          ? getCoordinateDistanceMeters(referenceCoordinate, markerCoordinate)
          : Number.POSITIVE_INFINITY,
      };
    })
    .sort((first, second) => first.distance - second.distance || first.index - second.index)
    .map(({ marker }) => marker);
};

export const getCarouselIndexByMarkerId = (
  markers: readonly MapCarouselMarker[],
  markerId?: string | null,
) => {
  if (!markerId) {
    return -1;
  }

  return markers.findIndex((marker) => marker.id === markerId);
};

export const clampCarouselIndex = (index: number, length: number) => {
  if (length <= 0) {
    return 0;
  }

  return Math.min(Math.max(Math.round(index), 0), length - 1);
};

export const getSwipeTargetIndex = (
  currentIndex: number,
  direction: MapCarouselSwipeDirection,
  length: number,
) => {
  const delta = direction === "left" ? 1 : -1;

  return clampCarouselIndex(currentIndex + delta, length);
};

export const resolveCarouselSelection = <T extends MapCarouselMarker>(
  markers: readonly T[],
  selectedMarkerId?: string | null,
) => {
  if (markers.length === 0) {
    return null;
  }

  const selectedIndex = getCarouselIndexByMarkerId(markers, selectedMarkerId);

  return markers[selectedIndex >= 0 ? selectedIndex : 0] ?? null;
};

export const markerMatchesCategory = (
  marker: MapCarouselMarker,
  category: string,
) => Boolean(marker.categories?.includes(category) || marker.category === category);
