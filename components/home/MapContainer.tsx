import React from "react";
import MapScreen, { MapMarkerData } from "@/components/ui/MapScreen";
import { getMapEvents, type EventResponse } from "@/lib/events";
import { getStorageFileUrl } from "@/lib/storage";

const EVENT_MARKER_COLOR = "#5C30BB";
const EVENT_MAP_RADIUS_KM = 50;
const EVENT_MAP_LIMIT = 100;
const ACTIVE_EVENT_WINDOW_MS = 12 * 60 * 60 * 1000;
const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop";

type MapContainerProps = {
  onBack?: () => void;
  logoText?: string;
};

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMiles = (from: [number, number], to: [number, number]) => {
  const earthRadiusKm = 6371;
  const [fromLongitude, fromLatitude] = from;
  const [toLongitude, toLatitude] = to;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const distanceKm = 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return distanceKm * 0.621371;
};

const formatDistance = (userLocation: [number, number] | null, eventLocation: [number, number]) => {
  if (!userLocation) {
    return "nearby";
  }

  const miles = getDistanceMiles(userLocation, eventLocation);

  if (miles < 0.1) {
    return "nearby";
  }

  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()} mi`;
};

const formatEventDate = (scheduledAt?: string | null) => {
  if (!scheduledAt) {
    return "Date TBA";
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return "Date TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatEventTime = (scheduledAt?: string | null) => {
  if (!scheduledAt) {
    return "Time TBA";
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return "Time TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatLocation = (event: EventResponse) =>
  event.location?.venue || event.location?.address || event.location?.searchLabel || "Location TBA";

const formatAgeLimit = (ageRestriction: EventResponse["ageRestriction"]) => {
  if (ageRestriction === "18_plus") {
    return "18+";
  }

  if (ageRestriction === "21_plus") {
    return "21+";
  }

  return "All Ages";
};

const formatPrice = (event: EventResponse) => {
  const prices = event.tickets
    .map((ticket) => (ticket.type === "free" ? 0 : ticket.price))
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0 || Math.min(...prices) <= 0) {
    return "Free";
  }

  const price = Math.min(...prices);
  const fractionDigits = Number.isInteger(price) ? 0 : 2;

  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
};

const isLiveEvent = (scheduledAt?: string | null) => {
  if (!scheduledAt) {
    return false;
  }

  const scheduledTime = new Date(scheduledAt).getTime();
  const now = Date.now();

  return Number.isFinite(scheduledTime) && scheduledTime <= now && now - scheduledTime <= ACTIVE_EVENT_WINDOW_MS;
};

const getHostName = (event: EventResponse) =>
  (event.host?.username || event.host?.name || `user-${event.userId.slice(-4)}`).replace(/^@/, "");

const toMapMarker = (event: EventResponse, userLocation: [number, number] | null): MapMarkerData | null => {
  const latitude = event.location?.latitude;
  const longitude = event.location?.longitude;

  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
    return null;
  }

  return {
    id: event.id,
    latitude,
    longitude,
    image: event.bannerImageKey ? getStorageFileUrl(event.bannerImageKey) : FALLBACK_EVENT_IMAGE,
    label: event.name || "Event",
    glowColor: EVENT_MARKER_COLOR,
    category: event.category ?? null,
    scheduledAt: event.scheduledAt ?? null,
    hostName: getHostName(event),
    distance: formatDistance(userLocation, [longitude, latitude]),
    isLive: isLiveEvent(event.scheduledAt),
    eventDate: formatEventDate(event.scheduledAt),
    eventTime: formatEventTime(event.scheduledAt),
    location: formatLocation(event),
    attendeesCount: 0,
    ageLimit: formatAgeLimit(event.ageRestriction),
    price: formatPrice(event),
  };
};

export default function MapContainer({ onBack, logoText = "Mooment" }: MapContainerProps) {
  const [markers, setMarkers] = React.useState<MapMarkerData[]>([]);
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const queryLongitude = userLocation ? Number(userLocation[0].toFixed(3)) : undefined;
  const queryLatitude = userLocation ? Number(userLocation[1].toFixed(3)) : undefined;

  React.useEffect(() => {
    let isMounted = true;

    const loadMapEvents = async () => {
      try {
        const events = await getMapEvents({
          ...(queryLatitude !== undefined && queryLongitude !== undefined
            ? {
                latitude: queryLatitude,
                longitude: queryLongitude,
                radiusKm: EVENT_MAP_RADIUS_KM,
              }
            : {}),
          limit: EVENT_MAP_LIMIT,
        });

        if (!isMounted) {
          return;
        }

        setMarkers(events.map((event) => toMapMarker(event, userLocation)).filter((marker): marker is MapMarkerData => Boolean(marker)));
      } catch {
        if (isMounted) {
          setMarkers([]);
        }
      }
    };

    void loadMapEvents();

    return () => {
      isMounted = false;
    };
  }, [queryLatitude, queryLongitude, userLocation]);

  const handleUserLocationChange = React.useCallback((coordinate: [number, number]) => {
    setUserLocation(coordinate);
  }, []);

  return (
    <MapScreen
      markers={markers}
      logoText={logoText}
      onBack={onBack}
      onUserLocationChange={handleUserLocationChange}
    />
  );
}
