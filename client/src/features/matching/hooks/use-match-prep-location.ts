import { useCallback, useEffect, useState } from "react";
import {
  useFetchLocationSuggestions,
  useGeocodeLocation,
  useReverseGeocodeLocation,
} from "@/features/profile-setup/api";
import type {
  ResolvedLocationData,
  ResolvedLocationSuggestionData,
} from "@/features/profile-setup/types/profile-setup-api.types";

import type { MatchPrepLocation } from "../types/match-prep.types";

export function getLocationLabel(location: MatchPrepLocation | null): string {
  if (!location) return "No location selected";
  const cityBits = [location.city, location.region].filter(Boolean).join(", ");
  if (cityBits) return `${cityBits}, ${location.country}`;
  return `${location.country}${location.countryCode ? ` (${location.countryCode})` : ""}`;
}

function normalizeResolvedLocation(
  location: ResolvedLocationData,
  source: "current" | "manual",
): MatchPrepLocation {
  return {
    country: location.country,
    countryCode: location.countryCode,
    region: location.region ?? undefined,
    regionCode: location.regionCode ?? undefined,
    city: location.city ?? undefined,
    latitude: location.latitude,
    longitude: location.longitude,
    source,
  };
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  return "";
}

function isGeoPositionError(error: unknown): error is GeolocationPositionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "number"
  );
}

function getGeoPositionErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission is blocked. Allow location access in browser settings.";
  }
  if (error.code === error.TIMEOUT) {
    return "Location request timed out. Try again in an open area or with better signal.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Device location is unavailable right now. Try again or type location manually.";
  }
  return "Could not read device location. You can type location manually.";
}

export function useMatchPrepLocation() {
  const { mutateAsync: geocodeLocation } = useGeocodeLocation();
  const { mutateAsync: reverseGeocodeLocation } = useReverseGeocodeLocation();
  const fetchSuggestions = useFetchLocationSuggestions();
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MatchPrepLocation | null>(null);
  const [manualLocationText, setManualLocationText] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<
    ResolvedLocationSuggestionData[]
  >([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [isLocatingCurrent, setIsLocatingCurrent] = useState(false);
  const [isResolvingManualLocation, setIsResolvingManualLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!suggestionsOpen) return;
    const query = manualLocationText.trim();
    if (query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const suggestions = await fetchSuggestions({ query, limit: 5 });
        setLocationSuggestions(suggestions);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [manualLocationText, fetchSuggestions, suggestionsOpen]);

  const resetLocationUiState = useCallback(() => {
    setLocationError(null);
    setManualLocationText("");
    setLocationSuggestions([]);
    setSuggestionsOpen(false);
    setIsLocatingCurrent(false);
    setIsResolvingManualLocation(false);
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocatingCurrent(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 60_000,
        });
      });
      const resolved = await reverseGeocodeLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setSelectedLocation(normalizeResolvedLocation(resolved, "current"));
      setLocationSuggestions([]);
      setManualLocationText("");
      setSuggestionsOpen(false);
    } catch (error) {
      if (isGeoPositionError(error)) {
        setLocationError(getGeoPositionErrorMessage(error));
        return;
      }
      const message = extractErrorMessage(error);
      if (message.toLowerCase().includes("not configured")) {
        setLocationError("Location service is not configured. Please contact support.");
      } else setLocationError("Could not fetch your current location. You can type one manually.");
    } finally {
      setIsLocatingCurrent(false);
    }
  }, [reverseGeocodeLocation]);

  const handleUseTypedLocation = useCallback(async () => {
    const query = manualLocationText.trim();
    if (!query) {
      setLocationError("Type a city, state, or country first.");
      return;
    }

    setLocationError(null);
    setIsResolvingManualLocation(true);
    try {
      const resolved = await geocodeLocation({ query });
      setSelectedLocation(normalizeResolvedLocation(resolved, "manual"));
      setLocationSuggestions([]);
      setSuggestionsOpen(false);
    } catch (error) {
      const message = extractErrorMessage(error);
      if (message.toLowerCase().includes("not configured")) {
        setLocationError("Location service is not configured. Please contact support.");
      } else setLocationError("Could not resolve that location. Try a more specific place.");
    } finally {
      setIsResolvingManualLocation(false);
    }
  }, [geocodeLocation, manualLocationText]);

  const handleSelectLocationSuggestion = useCallback(
    (suggestion: ResolvedLocationSuggestionData) => {
      setLocationError(null);
      setSelectedLocation(normalizeResolvedLocation(suggestion, "manual"));
      setManualLocationText(suggestion.primaryText ?? suggestion.label);
      setLocationSuggestions([]);
      setSuggestionsOpen(false);
    },
    [],
  );

  const handleManualLocationInputChange = useCallback((value: string) => {
    setManualLocationText(value);
    setSuggestionsOpen(true);
  }, []);

  const handleManualLocationInputFocus = useCallback(() => {
    if (manualLocationText.trim().length >= 2) {
      setSuggestionsOpen(true);
    }
  }, [manualLocationText]);

  return {
    selectedLocation,
    setSelectedLocation,
    manualLocationText,
    setManualLocationText,
    handleManualLocationInputChange,
    handleManualLocationInputFocus,
    locationSuggestions,
    isFetchingSuggestions,
    suggestionsOpen,
    isLocatingCurrent,
    isResolvingManualLocation,
    locationError,
    setLocationError,
    resetLocationUiState,
    handleSelectLocationSuggestion,
    handleUseCurrentLocation,
    handleUseTypedLocation,
  };
}
