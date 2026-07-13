import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";
import {
  geocodeSuggestionsQuerySchema,
  geocodeLocationBodySchema,
  reverseGeocodeLocationBodySchema,
} from "../schemas/location-geocode.schema";
import {
  geocodeLocationByQuery,
  geocodeLocationSuggestionsByQuery,
  GoogleMapsApiNotConfiguredError,
  reverseGeocodeLocationByCoordinates,
} from "../services/location-geocode.service";

export const handleGeocodeLocation = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = geocodeLocationBodySchema.safeParse(body);
    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400,
      );
    }
    const data = await geocodeLocationByQuery(parsed.data.query);
    return c.json(ApiResponse.success(data, "Location resolved", 200), 200);
  } catch (error: unknown) {
    if (error instanceof GoogleMapsApiNotConfiguredError) {
      return c.json(
        ApiResponse.error({
          message: "Location service is not configured",
          statusCode: 503,
          code: "LOCATION_PROVIDER_NOT_CONFIGURED",
        }),
        503,
      );
    }
    logger.error("Geocode location error", { error });
    return internalError(c, error, "GEOCODE_LOCATION_FAILED");
  }
};

export const handleGeocodeLocationSuggestions = async (c: Context) => {
  try {
    const parsed = geocodeSuggestionsQuerySchema.safeParse({
      query: c.req.query("query"),
      limit: c.req.query("limit"),
    });
    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid query parameters",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400,
      );
    }
    const suggestions = await geocodeLocationSuggestionsByQuery(
      parsed.data.query,
      parsed.data.limit,
    );
    return c.json(
      ApiResponse.success({ suggestions }, "Location suggestions resolved", 200),
      200,
    );
  } catch (error: unknown) {
    if (error instanceof GoogleMapsApiNotConfiguredError) {
      return c.json(
        ApiResponse.error({
          message: "Location service is not configured",
          statusCode: 503,
          code: "LOCATION_PROVIDER_NOT_CONFIGURED",
        }),
        503,
      );
    }
    logger.error("Geocode location suggestions error", { error });
    return internalError(c, error, "GEOCODE_LOCATION_SUGGESTIONS_FAILED");
  }
};

export const handleReverseGeocodeLocation = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = reverseGeocodeLocationBodySchema.safeParse(body);
    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400,
      );
    }
    const data = await reverseGeocodeLocationByCoordinates(
      parsed.data.latitude,
      parsed.data.longitude,
    );
    return c.json(ApiResponse.success(data, "Location resolved", 200), 200);
  } catch (error: unknown) {
    if (error instanceof GoogleMapsApiNotConfiguredError) {
      return c.json(
        ApiResponse.error({
          message: "Location service is not configured",
          statusCode: 503,
          code: "LOCATION_PROVIDER_NOT_CONFIGURED",
        }),
        503,
      );
    }
    logger.error("Reverse geocode location error", { error });
    return internalError(c, error, "REVERSE_GEOCODE_LOCATION_FAILED");
  }
};
