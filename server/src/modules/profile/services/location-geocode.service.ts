import config from "@/shared/config/config";

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  place_id: string;
  formatted_address: string;
  address_components: GoogleAddressComponent[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results: GoogleGeocodeResult[];
};

type GooglePlacesAutocompletePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type GooglePlacesAutocompleteResponse = {
  status: string;
  error_message?: string;
  predictions: GooglePlacesAutocompletePrediction[];
};

type GooglePlaceDetailsResult = {
  place_id: string;
  name?: string;
  formatted_address: string;
  address_components: GoogleAddressComponent[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

type GooglePlaceDetailsResponse = {
  status: string;
  error_message?: string;
  result?: GooglePlaceDetailsResult;
};

export type ResolvedLocation = {
  country: string;
  countryCode: string;
  region: string | null;
  regionCode: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
};

export type ResolvedLocationSuggestion = ResolvedLocation & {
  placeId: string;
  label: string;
  primaryText?: string;
  secondaryText?: string;
};

export class GoogleMapsApiNotConfiguredError extends Error {
  constructor() {
    super("GOOGLE_MAPS_API_NOT_CONFIGURED");
    this.name = "GoogleMapsApiNotConfiguredError";
  }
}

function getGoogleMapsApiKey(): string {
  const key = config.googleMapsApiKey?.trim();
  if (!key) {
    throw new GoogleMapsApiNotConfiguredError();
  }
  return key;
}

function getAddressComponent(
  components: GoogleAddressComponent[],
  type: string,
): GoogleAddressComponent | undefined {
  return components.find((c) => c.types.includes(type));
}

function parseResolvedLocation(result: GoogleGeocodeResult): ResolvedLocation {
  const country = getAddressComponent(result.address_components, "country");
  if (!country) {
    throw new Error("Could not resolve country from Google geocoding response");
  }

  const region = getAddressComponent(
    result.address_components,
    "administrative_area_level_1",
  );
  const city =
    getAddressComponent(result.address_components, "locality") ??
    getAddressComponent(result.address_components, "postal_town") ??
    getAddressComponent(result.address_components, "administrative_area_level_2") ??
    getAddressComponent(result.address_components, "sublocality");

  return {
    country: country.long_name,
    countryCode: country.short_name.toUpperCase(),
    region: region?.long_name ?? null,
    regionCode: region?.short_name ?? null,
    city: city?.long_name ?? null,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
  };
}

function parseResolvedLocationSuggestion(
  result: GoogleGeocodeResult,
): ResolvedLocationSuggestion {
  return {
    ...parseResolvedLocation(result),
    placeId: result.place_id,
    label: result.formatted_address,
  };
}

function buildSuggestionLabelFromNameAndAddress(
  name: string | undefined,
  formattedAddress: string | undefined,
  fallback: string,
): string {
  const safeName = name?.trim();
  const safeAddress = formattedAddress?.trim();
  if (!safeName && !safeAddress) return fallback;
  if (!safeName) return safeAddress ?? fallback;
  if (!safeAddress) return safeName;
  if (safeAddress.toLowerCase().includes(safeName.toLowerCase())) {
    return safeAddress;
  }
  return `${safeName}, ${safeAddress}`;
}

function getPredictionPrimaryText(prediction: GooglePlacesAutocompletePrediction): string {
  return prediction.structured_formatting?.main_text?.trim() || prediction.description;
}

function getPredictionSecondaryText(
  prediction: GooglePlacesAutocompletePrediction,
): string | undefined {
  return prediction.structured_formatting?.secondary_text?.trim() || undefined;
}

async function requestGoogleGeocode(
  url: URL,
  options?: { allowZeroResults?: boolean },
): Promise<GoogleGeocodeResponse> {
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google geocode HTTP error: ${res.status}`);
  }
  const json = (await res.json()) as GoogleGeocodeResponse;
  if (options?.allowZeroResults && json.status === "ZERO_RESULTS") {
    return { ...json, results: [] };
  }
  if (json.status !== "OK" || !json.results?.length) {
    const detail = json.error_message ? `: ${json.error_message}` : "";
    throw new Error(`Google geocode failed with status ${json.status}${detail}`);
  }
  return json;
}

async function requestGooglePlacesAutocomplete(
  url: URL,
): Promise<GooglePlacesAutocompleteResponse> {
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google places autocomplete HTTP error: ${res.status}`);
  }

  const json = (await res.json()) as GooglePlacesAutocompleteResponse;
  if (json.status === "ZERO_RESULTS") {
    return { ...json, predictions: [] };
  }
  if (json.status !== "OK") {
    const detail = json.error_message ? `: ${json.error_message}` : "";
    throw new Error(`Google places autocomplete failed with status ${json.status}${detail}`);
  }
  return json;
}

async function requestGooglePlaceDetailsById(placeId: string): Promise<GooglePlaceDetailsResult> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("language", "en");
  url.searchParams.set("fields", "place_id,name,formatted_address,address_component,geometry");
  url.searchParams.set("key", getGoogleMapsApiKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google place details HTTP error: ${res.status}`);
  }

  const json = (await res.json()) as GooglePlaceDetailsResponse;
  if (json.status !== "OK" || !json.result) {
    const detail = json.error_message ? `: ${json.error_message}` : "";
    throw new Error(`Google place details failed with status ${json.status}${detail}`);
  }
  return json.result;
}

async function geocodeLocationByPlaceId(placeId: string): Promise<ResolvedLocation> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("language", "en");
  url.searchParams.set("key", getGoogleMapsApiKey());
  const json = await requestGoogleGeocode(url);
  return parseResolvedLocation(json.results[0]);
}

export async function geocodeLocationByQuery(query: string): Promise<ResolvedLocation> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("key", getGoogleMapsApiKey());
  const json = await requestGoogleGeocode(url);
  return parseResolvedLocation(json.results[0]);
}

export async function geocodeLocationSuggestionsByQuery(
  query: string,
  limit = 5,
): Promise<ResolvedLocationSuggestion[]> {
  const safeLimit = Math.max(1, Math.min(limit, 10));

  try {
    const autocompleteUrl = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    autocompleteUrl.searchParams.set("input", query);
    autocompleteUrl.searchParams.set("language", "en");
    autocompleteUrl.searchParams.set("key", getGoogleMapsApiKey());

    const autocomplete = await requestGooglePlacesAutocomplete(autocompleteUrl);
    const topPredictions = autocomplete.predictions.slice(0, safeLimit);
    if (!topPredictions.length) return [];

    const resolvedSuggestions = await Promise.all(
      topPredictions.map(async (prediction) => {
        try {
          const details = await requestGooglePlaceDetailsById(prediction.place_id);
          const resolved = parseResolvedLocation({
            place_id: details.place_id,
            formatted_address: details.formatted_address,
            address_components: details.address_components,
            geometry: details.geometry,
          });
          return {
            ...resolved,
            placeId: prediction.place_id,
            label: buildSuggestionLabelFromNameAndAddress(
              details.name ?? getPredictionPrimaryText(prediction),
              details.formatted_address ?? getPredictionSecondaryText(prediction),
              prediction.description,
            ),
            primaryText:
              details.name?.trim() || getPredictionPrimaryText(prediction) || undefined,
            secondaryText:
              details.formatted_address?.trim() || getPredictionSecondaryText(prediction),
          } satisfies ResolvedLocationSuggestion;
        } catch {
          try {
            const resolved = await geocodeLocationByPlaceId(prediction.place_id);
            return {
              ...resolved,
              placeId: prediction.place_id,
              label: prediction.description,
              primaryText: getPredictionPrimaryText(prediction),
              secondaryText: getPredictionSecondaryText(prediction),
            } satisfies ResolvedLocationSuggestion;
          } catch {
            return null;
          }
        }
      }),
    );

    const parsed = resolvedSuggestions.filter(
      (item): item is ResolvedLocationSuggestion => item !== null,
    );
    if (parsed.length) return parsed;
  } catch {
    // Fall back to geocoding search if Places Autocomplete is unavailable.
  }

  const geocodeUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  geocodeUrl.searchParams.set("address", query);
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("key", getGoogleMapsApiKey());
  const geocodeJson = await requestGoogleGeocode(geocodeUrl, { allowZeroResults: true });
  return geocodeJson.results.slice(0, safeLimit).map((result) => {
    const parsed = parseResolvedLocationSuggestion(result);
    return {
      ...parsed,
      primaryText: parsed.label,
      secondaryText: undefined,
    };
  });
}

export async function reverseGeocodeLocationByCoordinates(
  latitude: number,
  longitude: number,
): Promise<ResolvedLocation> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${latitude},${longitude}`);
  url.searchParams.set("language", "en");
  url.searchParams.set("key", getGoogleMapsApiKey());
  const json = await requestGoogleGeocode(url);
  const resolved = parseResolvedLocation(json.results[0]);
  return {
    ...resolved,
    // Keep coordinates from device for deterministic storage/filtering.
    latitude,
    longitude,
  };
}
