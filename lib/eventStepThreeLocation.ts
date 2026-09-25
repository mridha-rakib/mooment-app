import type { EventLocation } from "@/lib/events";

type StepThreeLocationInput = {
  draftLocation: EventLocation;
  venue: string;
  address: string;
  additionalInfo: string;
};

export const getStepThreeLocationDisplayLabel = (
  draftLocation: EventLocation,
  address: string,
): string => draftLocation.searchLabel ?? address;

export const buildStepThreeValidationLocation = (
  draftLocation: EventLocation,
  venue: string,
  address: string,
) => ({
  searchLabel: draftLocation.searchLabel ?? null,
  venue: venue.trim() || null,
  address: address.trim() || null,
});

export const buildStepThreePersistedLocation = ({
  draftLocation,
  venue,
  address,
  additionalInfo,
}: StepThreeLocationInput): EventLocation => ({
  ...draftLocation,
  address: address.trim() || null,
  searchLabel: draftLocation.searchLabel ?? null,
  venue: venue.trim() || null,
  additionalInfo: additionalInfo.length > 0 ? additionalInfo : null,
});
