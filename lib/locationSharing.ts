export type CurrentLocationPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

type ExpoLocationModule = typeof import("expo-location");
type LocationPosition = Awaited<ReturnType<ExpoLocationModule["getCurrentPositionAsync"]>>;
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

const LOCATION_PERMISSION_MESSAGE =
  "Allow location access in your device settings before sharing your current location.";
const LOCATION_MODULE_MESSAGE =
  "Location support is not available in this Android build. Rebuild the development client with expo-location installed, then reopen the app.";

let locationModulePromise: Promise<ExpoLocationModule> | null = null;

const isFunction = (value: unknown): value is (...args: never[]) => unknown =>
  typeof value === "function";

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
});

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
