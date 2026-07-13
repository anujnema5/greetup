import { z } from "zod";

export const geocodeLocationBodySchema = z.object({
  query: z.string().trim().min(2).max(200),
});

export const reverseGeocodeLocationBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const geocodeSuggestionsQuerySchema = z.object({
  query: z.string().trim().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

export type GeocodeLocationBody = z.infer<typeof geocodeLocationBodySchema>;
export type ReverseGeocodeLocationBody = z.infer<typeof reverseGeocodeLocationBodySchema>;
export type GeocodeSuggestionsQuery = z.infer<typeof geocodeSuggestionsQuerySchema>;
