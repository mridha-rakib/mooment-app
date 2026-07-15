export type CurrentLocationPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number | null;
};

type ExpoLocationModule = typeof import("expo-location");
type LocationPosition = Awaited<ReturnType<ExpoLocationModule["getCurrentPositionAsync"]>>;
type LocationAccuracyValue = ExpoLocationModule["Accuracy"][keyof ExpoLocationModule["Accuracy"]];
export type LocationSharingSubscription = {
  remove: () => void;
};
type RuntimeLocationModule = Partial<ExpoLocationModule> &
  Pick<
    ExpoLocationModule,
    | "Accuracy"
    | "getCurrentPositionAsync"
    | "getForegroundPermissionsAsync"
    | "requestForegroundPermissionsAsync"
    | "watchPositionAsync"
  >;

export type DeviceLocationSuccessStatus = "fresh" | "lastKnown";
export type DeviceLocationFailureStatus =
  | "permissionDenied"
  | "permissionBlocked"
  | "servicesDisabled"
  | "unavailable"
  | "failed"
  | "timeout";

export type DeviceLocationSuccessResult = {
  status: DeviceLocationSuccessStatus;
  location: CurrentLocationPayload;
  timestamp: number | null;
};

export type DeviceLocationResult =
  | DeviceLocationSuccessResult
  | {
      status: DeviceLocationFailureStatus;
      message?: string;
    };

type DeviceLocationRequestOptions = {
  requestPermission?: boolean;
  timeoutMs?: number;
  lastKnownMaxAgeMs?: number;
  lastKnownRequiredAccuracy?: number;
  onTemporaryLocation?: (result: DeviceLocationSuccessResult & { status: "lastKnown" }) => void;
};

export type MapLocationCandidate = {
  source: "fresh" | "lastKnown" | "stored" | "fallback" | "event";
  location: CurrentLocationPayload | null;
  timestamp?: number | null;
};

const FRESH_LOCATION_TIMEOUT_MS = 12000;
const RECENT_LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000;
const LAST_KNOWN_REQUIRED_ACCURACY_METERS = 5000;

const LOCATION_PERMISSION_MESSAGE =
  "Allow location access in your device settings before sharing your current location.";
const LOCATION_MODULE_MESSAGE =
  "Location support is not available in this Android build. Rebuild the development client with expo-location installed, then reopen the app.";

let locationModulePromise: Promise<ExpoLocationModule> | null = null;

const isFunction = (value: unknown): value is (...args: never[]) => unknown =>
  typeof value === "function";

export const isValidLocationCoordinate = (
  location: Pick<CurrentLocationPayload, "latitude" | "longitude"> | null | undefined,
): location is CurrentLocationPayload =>
  Boolean(
    location &&
      typeof location.latitude === "number" &&
      typeof location.longitude === "number" &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180,
  );

export const toMapboxCoordinate = (
  location: Pick<CurrentLocationPayload, "latitude" | "longitude">,
): [number, number] => [location.longitude, location.latitude];

export const isRecentLocationTimestamp = (
  timestamp: number | null | undefined,
  maxAgeMs: number,
  now = Date.now(),
) =>
  typeof timestamp === "number" &&
  Number.isFinite(timestamp) &&
  timestamp > 0 &&
  now - timestamp >= 0 &&
  now - timestamp <= maxAgeMs;

export const isUsableRecentLocation = (
  location: CurrentLocationPayload | null | undefined,
  maxAgeMs: number,
  now = Date.now(),
) => isValidLocationCoordinate(location) && isRecentLocationTimestamp(location.timestamp, maxAgeMs, now);

export const choosePreferredMapLocation = (
  candidates: MapLocationCandidate[],
  now = Date.now(),
  lastKnownMaxAgeMs = RECENT_LAST_KNOWN_MAX_AGE_MS,
): MapLocationCandidate | null => {
  const fresh = candidates.find(
    (candidate) => candidate.source === "fresh" && isValidLocationCoordinate(candidate.location),
  );

  if (fresh) {
    return fresh;
  }

  const lastKnown = candidates.find(
    (candidate) =>
      candidate.source === "lastKnown" &&
      isUsableRecentLocation(candidate.location, lastKnownMaxAgeMs, now),
  );

  if (lastKnown) {
    return lastKnown;
  }

  const stored = candidates.find(
    (candidate) => candidate.source === "stored" && isValidLocationCoordinate(candidate.location),
  );

  if (stored) {
    return stored;
  }

  const fallback = candidates.find(
    (candidate) => candidate.source === "fallback" && isValidLocationCoordinate(candidate.location),
  );

  return fallback ?? null;
};

const validateLocationModule = (Location: ExpoLocationModule): RuntimeLocationModule => {
  if (
    !isFunction(Location.getCurrentPositionAsync) ||
    !isFunction(Location.getForegroundPermissionsAsync) ||
    !isFunction(Location.requestForegroundPermissionsAsync) ||
    !isFunction(Location.watchPositionAsync) ||
    !Location.Accuracy ||
    typeof Location.Accuracy.Balanced !== "number"
  ) {
    throw new Error(LOCATION_MODULE_MESSAGE);
  }

  return Location;
};

const loadLocationModule = async (): Promise<RuntimeLocationModule> => {
  if (!locationModulePromise) {
    locationModulePromise = import("expo-location").catch(() => {
      locationModulePromise = null;
      throw new Error(LOCATION_MODULE_MESSAGE);
    });
  }

  return validateLocationModule(await locationModulePromise);
};

const areLocationServicesEnabled = async (Location: RuntimeLocationModule): Promise<boolean> => {
  if (isFunction(Location.hasServicesEnabledAsync)) {
    return Location.hasServicesEnabledAsync();
  }

  if (isFunction(Location.getProviderStatusAsync)) {
    const providerStatus = await Location.getProviderStatusAsync();
    return Boolean(providerStatus.locationServicesEnabled);
  }

  throw new Error(LOCATION_MODULE_MESSAGE);
};

export const hasLocationSharingPermission = async (): Promise<boolean> => {
  const Location = await loadLocationModule();
  const [servicesEnabled, permission] = await Promise.all([
    areLocationServicesEnabled(Location),
    Location.getForegroundPermissionsAsync(),
  ]);

  return servicesEnabled && permission.granted;
};

export const requestLocationSharingPermission = async (): Promise<void> => {
  const Location = await loadLocationModule();
  await requestLocationSharingPermissionForModule(Location);
};

const requestLocationSharingPermissionForModule = async (Location: RuntimeLocationModule): Promise<void> => {
  const [servicesEnabled, existingPermission] = await Promise.all([
    areLocationServicesEnabled(Location),
    Location.getForegroundPermissionsAsync(),
  ]);

  if (!servicesEnabled) {
    throw new Error("Turn on Location Services before sharing your current location.");
  }

  if (existingPermission.granted) {
    return;
  }

  const requestedPermission = await Location.requestForegroundPermissionsAsync();

  if (!requestedPermission.granted) {
    throw new Error(LOCATION_PERMISSION_MESSAGE);
  }
};

const toCurrentLocationPayload = (position: LocationPosition): CurrentLocationPayload => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  timestamp: position.timestamp,
});

const toValidDeviceLocationResult = (
  status: DeviceLocationSuccessStatus,
  position: LocationPosition,
): DeviceLocationSuccessResult | null => {
  const location = toCurrentLocationPayload(position);

  if (!isValidLocationCoordinate(location)) {
    return null;
  }

  return {
    status,
    location,
    timestamp: typeof position.timestamp === "number" ? position.timestamp : null,
  };
};

const getMapCurrentAccuracy = (Location: RuntimeLocationModule): LocationAccuracyValue =>
  typeof Location.Accuracy.High === "number"
    ? Location.Accuracy.High
    : Location.Accuracy.Balanced;

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | "timeout"> =>
  Promise.race([
    promise,
    new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), timeoutMs);
    }),
  ]);

export const getBestCurrentDeviceLocation = async ({
  requestPermission = true,
  timeoutMs = FRESH_LOCATION_TIMEOUT_MS,
  lastKnownMaxAgeMs = RECENT_LAST_KNOWN_MAX_AGE_MS,
  lastKnownRequiredAccuracy = LAST_KNOWN_REQUIRED_ACCURACY_METERS,
  onTemporaryLocation,
}: DeviceLocationRequestOptions = {}): Promise<DeviceLocationResult> => {
  let Location: RuntimeLocationModule;

  try {
    Location = await loadLocationModule();
  } catch (error) {
    return {
      status: "unavailable",
      message: error instanceof Error ? error.message : LOCATION_MODULE_MESSAGE,
    };
  }

  const servicesEnabled = await areLocationServicesEnabled(Location);

  if (!servicesEnabled) {
    return { status: "servicesDisabled" };
  }

  let permission = await Location.getForegroundPermissionsAsync();

  if (!permission.granted && requestPermission && permission.canAskAgain !== false) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (!permission.granted) {
    return {
      status: permission.canAskAgain === false ? "permissionBlocked" : "permissionDenied",
    };
  }

  let lastKnownResult: (DeviceLocationSuccessResult & { status: "lastKnown" }) | null = null;

  if (isFunction(Location.getLastKnownPositionAsync)) {
    const lastKnownPosition = await Location.getLastKnownPositionAsync({
      maxAge: lastKnownMaxAgeMs,
      requiredAccuracy: lastKnownRequiredAccuracy,
    });
    const validLastKnown = lastKnownPosition
      ? toValidDeviceLocationResult("lastKnown", lastKnownPosition)
      : null;

    if (
      validLastKnown?.status === "lastKnown" &&
      isUsableRecentLocation(validLastKnown.location, lastKnownMaxAgeMs)
    ) {
      lastKnownResult = { ...validLastKnown, status: "lastKnown" };
      onTemporaryLocation?.(lastKnownResult);
    }
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: getMapCurrentAccuracy(Location),
      }),
      timeoutMs,
    );

    if (position === "timeout") {
      return lastKnownResult ?? { status: "timeout" };
    }

    const freshResult = toValidDeviceLocationResult("fresh", position);

    if (freshResult) {
      return freshResult;
    }

    return lastKnownResult ?? { status: "failed" };
  } catch {
    return lastKnownResult ?? { status: "failed" };
  }
};

export const getCurrentLocationForSharing = async (): Promise<CurrentLocationPayload> => {
  const Location = await loadLocationModule();
  await requestLocationSharingPermissionForModule(Location);

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return toCurrentLocationPayload(position);
  } catch {
    throw new Error("Unable to read your current location. Check Location Services and try again.");
  }
};

export const getCurrentLocationIfPermissionGranted = async (): Promise<CurrentLocationPayload | null> => {
  const Location = await loadLocationModule();
  const [servicesEnabled, permission] = await Promise.all([
    areLocationServicesEnabled(Location),
    Location.getForegroundPermissionsAsync(),
  ]);

  if (!servicesEnabled || !permission.granted) {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return toCurrentLocationPayload(position);
};

export const watchCurrentLocationForSharing = async (
  onLocation: (location: CurrentLocationPayload) => void,
): Promise<LocationSharingSubscription> => {
  const Location = await loadLocationModule();
  await requestLocationSharingPermissionForModule(Location);

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 10,
      timeInterval: 15000,
    },
    (position) => {
      onLocation(toCurrentLocationPayload(position));
    },
  );
};
