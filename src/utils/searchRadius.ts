import { config } from '../config/env';
import { ApiError } from './ApiError';

/** Default search radius in km — `DEFAULT_SEARCH_RADIUS_KM` env */
export const DEFAULT_SEARCH_RADIUS_KM: number = config.location.defaultRadius;

/** Max allowed radius in km — `MAX_SEARCH_RADIUS_KM` env */
export const MAX_SEARCH_RADIUS_KM: number = config.location.maxRadius;

export function parseRadiusKmFromQuery(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  return parseFloat(String(raw).trim());
}

export function assertValidRadiusKmIfProvided(radius: number | undefined, errorMessage: string): void {
  if (radius === undefined) return;
  if (Number.isNaN(radius) || radius <= 0 || radius > MAX_SEARCH_RADIUS_KM) {
    throw new ApiError(400, errorMessage);
  }
}

export function resolveSearchRadiusKm(radius: number | undefined | null): number {
  if (radius == null || Number.isNaN(radius) || radius <= 0) {
    return DEFAULT_SEARCH_RADIUS_KM;
  }
  return Math.min(radius, MAX_SEARCH_RADIUS_KM);
}
