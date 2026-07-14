import React from "react";
import MapScreen, { MapMarkerData } from "@/components/ui/MapScreen";
import { getMapEvents, type EventResponse } from "@/lib/events";
import { buildEventFilterRequestParams, createEmptyEventFilters, type SharedEventFilters } from "@/lib/eventFilters";
import { getStorageFileUrl } from "@/lib/storage";
import { getCategoryColor } from "@/constants/categoryColors";
import type { EventCategory } from "@/constants/eventCategories";

const EVENT_MAP_RADIUS_KM = 50;
const EVENT_MAP_LIMIT = 100;
const ACTIVE_EVENT_WINDOW_MS = 12 * 60 * 60 * 1000;
const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop";

type MapContainerProps = {
  onBack?: () => void;
  logoText?: string;
  eventFilters?: SharedEventFilters;
  onCategoryChange?: (category: EventCategory | null) => void;
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

const formatTicketsAvailable = (event: EventResponse) => {
  const ticketsLeft = event.tickets.reduce((total, ticket) => total + Math.max(0, ticket.capacity), 0);

  if (event.tickets.length === 0) {
    return "Tickets TBA";
  }

  if (ticketsLeft === 0) {
    return "Sold out";
  }

  return `${ticketsLeft} ${ticketsLeft === 1 ? "ticket" : "tickets"} left`;
};

const formatTicketSalesEndDate = (event: EventResponse) => {
  const salesEndTimes = event.tickets
    .map((ticket) => (ticket.salesEndAt ? new Date(ticket.salesEndAt).getTime() : NaN))
    .filter((time) => Number.isFinite(time));

  if (salesEndTimes.length === 0) {
    return "Sales end TBA";
  }

  const lastSalesEndDate = new Date(Math.max(...salesEndTimes));
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(lastSalesEndDate);

  return `Buy by ${formattedDate}`;
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
    glowColor: getCategoryColor(event.category ?? null),
    category: event.category ?? null,
    categories: event.categories?.length ? event.categories : event.category ? [event.category] : [],
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
    ticketsAvailable: formatTicketsAvailable(event),
    ticketSalesEndDate: formatTicketSalesEndDate(event),
  };
};

export default function MapContainer({
  onBack,
  logoText = "Mooment",
  eventFilters = createEmptyEventFilters(),
  onCategoryChange,
}: MapContainerProps) {
  const [markers, setMarkers] = React.useState<MapMarkerData[]>([]);
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const mapRequestIdRef = React.useRef(0);

  // Keep a ref so the async fetch always reads the latest location without
  // being listed as an effect dependency (which would re-trigger fetches on
  // every raw GPS update even when the rounded query coords are unchanged).
  const userLocationRef = React.useRef<[number, number] | null>(null);
  React.useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // Round to 3 decimal places (~111 m precision) so the effect only
  // re-fires when the user has moved far enough to warrant a new query.
  const queryLongitude = userLocation ? Number(userLocation[0].toFixed(3)) : undefined;
  const queryLatitude = userLocation ? Number(userLocation[1].toFixed(3)) : undefined;
  const mapRequestParams = React.useMemo(() => {
    const params = buildEventFilterRequestParams(eventFilters, {
      includeLocation: Boolean(eventFilters.nearby),
      limit: EVENT_MAP_LIMIT,
    });

    if (!eventFilters.nearby && queryLatitude !== undefined && queryLongitude !== undefined) {
      params.latitude = queryLatitude;
      params.longitude = queryLongitude;
      params.radiusKm = EVENT_MAP_RADIUS_KM;
    }

    return params;
  }, [eventFilters, queryLatitude, queryLongitude]);
  const mapRequestKey = React.useMemo(() => JSON.stringify(mapRequestParams), [mapRequestParams]);

  React.useEffect(() => {
    let isMounted = true;
    const requestId = ++mapRequestIdRef.current;

    const loadMapEvents = async () => {
      try {
        const events = await getMapEvents(mapRequestParams);

        if (!isMounted || requestId !== mapRequestIdRef.current) {
          return;
        }

        const distanceReference = eventFilters.nearby
          ? [eventFilters.nearby.longitude, eventFilters.nearby.latitude] as [number, number]
          : userLocationRef.current;

        setMarkers(
          events
            .map((event) => toMapMarker(event, distanceReference))
            .filter((marker): marker is MapMarkerData => Boolean(marker)),
        );
      } catch {
        // Leave existing markers visible; don't wipe them on a failed refetch.
      }
    };

    void loadMapEvents();

    return () => {
      isMounted = false;
    };
  }, [eventFilters.nearby, mapRequestKey, mapRequestParams]);

  const handleUserLocationChange = React.useCallback((coordinate: [number, number]) => {
    setUserLocation(coordinate);
  }, []);

  return (
    <MapScreen
      markers={markers}
      logoText={logoText}
      onBack={onBack}
      onUserLocationChange={handleUserLocationChange}
      selectedCategory={eventFilters.category ?? null}
      onCategoryChange={onCategoryChange}
    />
  );
}
