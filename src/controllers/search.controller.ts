import { Request, Response } from 'express';
import { MeiliSearch } from 'meilisearch';
import { MEILISEARCH_INDICES } from '../services/meilisearch/indexing.service';
import { meilisearchClient } from '../services/meilisearch/meilisearch.client';
import { mongodbFallback } from '../services/meilisearch/mongodb-fallback.service';
import { SportModel } from '../models/sport.model';
import { CoachingCenterModel } from '../models/coachingCenter.model';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { getCorrectedSearchQuery, buildSearchDictionary, normalizeSearchQuery } from '../utils';

/** TTL for search correction dictionary cache (ms) – avoid DB hit on every request */
const SEARCH_DICTIONARY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let searchDictionaryCache: { dictionary: string[]; expiresAt: number } | null = null;

/**
 * Build search correction dictionary from sports, coaching center names, cities, states, and description words.
 * Cached in-memory with TTL to avoid bottleneck: no DB hit on every autocomplete/search request.
 */
const getSearchCorrectionDictionary = async (): Promise<string[]> => {
  const now = Date.now();
  if (searchDictionaryCache && searchDictionaryCache.expiresAt > now) {
    return searchDictionaryCache.dictionary;
  }

  const [sportList, centerList] = await Promise.all([
    SportModel.find({ is_active: true }).select('name').lean(),
    CoachingCenterModel.find({
      is_deleted: false,
      approval_status: 'approved',
      is_active: true,
    })
      .select('center_name location.address sport_details.description')
      .lean(),
  ]);

  const sportNames = sportList.map((s: any) => s.name).filter(Boolean);
  const centerNames: string[] = [];
  const cities: string[] = [];
  const stateNames: string[] = [];
  const descriptionWordsSet = new Set<string>();

  for (const c of centerList as any[]) {
    if (c.center_name?.trim()) centerNames.push(c.center_name.trim());
    const addr = c.location?.address;
    if (addr?.city?.trim()) cities.push(addr.city.trim());
    if (addr?.state?.trim()) stateNames.push(addr.state.trim());
    if (Array.isArray(c.sport_details)) {
      for (const sd of c.sport_details) {
        if (sd.description?.trim()) {
          sd.description
            .replace(/\s+/g, ' ')
            .trim()
            .split(/\s+/)
            .map((w: string) => w.replace(/[^a-zA-Z0-9]/g, ''))
            .filter((w: string) => w.length >= 3)
            .forEach((w: string) => descriptionWordsSet.add(w));
        }
      }
    }
  }

  const dictionary = buildSearchDictionary({
    sportNames,
    centerNames,
    cities: [...new Set(cities)],
    stateNames: [...new Set(stateNames)],
    descriptionWords: descriptionWordsSet.size > 0 ? Array.from(descriptionWordsSet) : undefined,
  });

  searchDictionaryCache = {
    dictionary,
    expiresAt: now + SEARCH_DICTIONARY_CACHE_TTL_MS,
  };
  return dictionary;
};

/**
 * Get Meilisearch client (returns null if disabled - will use MongoDB fallback)
 */
const getClient = (): MeiliSearch | null => {
  if (!meilisearchClient.isEnabled()) {
    return null; // Return null instead of throwing - will use MongoDB fallback
  }

  return meilisearchClient.getClient();
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return (R * c) / 1000; // Distance in km
};

/**
 * Determine category from index name
 */
const determineCategory = (indexName: string): string => {
  const lowerIndex = indexName.toLowerCase();
  if (lowerIndex.includes('coaching') || lowerIndex.includes('centre')) {
    return 'coaching_center';
  }
  if (lowerIndex.includes('sport') && !lowerIndex.includes('coaching')) {
    return 'sport';
  }
  if (lowerIndex.includes('highlight') || lowerIndex.includes('live') || lowerIndex.includes('stream')) {
    return 'live_stream';
  }
  if (lowerIndex.includes('reel')) {
    return 'reel';
  }
  return 'other';
};

/**
 * Category priority for sorting
 */
const categoryPriority: Record<string, number> = {
  sport: 1,
  coaching_center: 2,
  live_stream: 3,
  reel: 4,
  other: 5,
};

/**
 * Get attributes to retrieve based on index name
 */
const getAttributesToRetrieve = (indexName: string): string[] => {
  const lowerIndex = indexName.toLowerCase();
  if (lowerIndex.includes('live') || lowerIndex.includes('stream') || lowerIndex.includes('highlight')) {
    return ['id', 'name', 'title', 'stream_key'];
  }
  if (lowerIndex.includes('coaching') || lowerIndex.includes('centre')) {
    return ['id', 'name', 'title', 'latitude', 'longitude', 'lat', 'long', '_geo'];
  }
  return ['id', 'name', 'title'];
};

/**
 * Create result object for autocomplete
 */
const createAutocompleteResult = (
  hit: any,
  indexName: string,
  options?: { category?: string; highlight?: string; distance?: number | null }
): any | null => {
  if (!hit) return null;

  const category = options?.category || determineCategory(indexName);
  const id = hit.id;
  const name = hit.name || hit.title || '';

  if (!id || !name) return null;

  const highlightValue =
    options?.highlight !== undefined
      ? options.highlight
      : hit._formatted?.name || hit._formatted?.title || null;

  const result: any = {
    index: indexName,
    id,
    name,
    type: category,
    priority: categoryPriority[category] || 999,
    highlight: highlightValue,
  };

  if (category === 'coaching_center' && typeof options?.distance === 'number' && Number.isFinite(options.distance)) {
    result._distance = options.distance;
  }

  if ((category === 'live_stream' || category === 'highlight') && hit.stream_key) {
    result.stream_key = hit.stream_key;
  }

  return result;
};

/**
 * Autocomplete API
 * GET /api/v1/search/autocomplete?q=searchterm&size=5&latitude=28.6139&longitude=77.2090&radius=50
 */
export const autocomplete = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string) || '';
    const sizePerIndex = parseInt((req.query.size as string) || '5', 10);
    const specificIndex = req.query.index as string | undefined;
    const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : null;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : null;
    const radius = parseInt((req.query.radius as string) || '50', 10);

    if (!query || query.trim() === '') {
      res.status(200).json(
        new ApiResponse(
          200,
          {
            query: '',
            total: 0,
            size: 0,
            from: 0,
            has_more: false,
            results: [],
          },
          'Autocomplete results'
        )
      );
      return;
    }

    const client = getClient();

    // If Meilisearch is disabled, use MongoDB fallback
    if (!client) {
      logger.info('Meilisearch disabled, using MongoDB fallback for autocomplete');

      const allIndices = specificIndex
        ? [specificIndex]
        : [
            MEILISEARCH_INDICES.SPORTS,
            MEILISEARCH_INDICES.COACHING_CENTRES,
            MEILISEARCH_INDICES.LIVE_STREAMS,
            MEILISEARCH_INDICES.REELS,
          ];

      // Normalize ("popular cricket academy near me" → "cricket academy") then auto-correct ("cricaket acaemy" → "cricket academy")
      const normalized = normalizeSearchQuery(query.trim());
      const queryForSearch = normalized || query.trim();
      const dictionary = await getSearchCorrectionDictionary();
      const correction = getCorrectedSearchQuery(queryForSearch, dictionary);
      const searchQuery = correction.wasCorrected ? correction.corrected : queryForSearch;

      const searchPromises = allIndices.map(async (indexName) => {
        try {
          const lowerIndex = indexName.toLowerCase();
          let results: any = { hits: [], estimatedTotalHits: 0 };

          if (lowerIndex.includes('coaching') || lowerIndex.includes('centre')) {
            results = await mongodbFallback.searchCoachingCenters(searchQuery, {
              size: sizePerIndex,
              from: 0,
              latitude,
              longitude,
              radius,
            });
          } else if (lowerIndex.includes('sport') && !lowerIndex.includes('coaching')) {
            results = await mongodbFallback.searchSports(searchQuery, { size: sizePerIndex, from: 0 });
          } else if (lowerIndex.includes('reel')) {
            results = await mongodbFallback.searchReels(searchQuery, { size: sizePerIndex, from: 0 });
          } else if (lowerIndex.includes('live') || lowerIndex.includes('stream') || lowerIndex.includes('highlight')) {
            results = await mongodbFallback.searchStreamHighlights(searchQuery, { size: sizePerIndex, from: 0 });
          }

          // Transform to autocomplete format
          const transformedHits = results.hits.slice(0, sizePerIndex).map((hit: any) => {
            const distance = hit.distance !== null && hit.distance !== undefined 
              ? hit.distance 
              : (hit._distanceKm !== null && hit._distanceKm !== undefined ? hit._distanceKm : null);
            return createAutocompleteResult(hit, indexName, {
              highlight: hit.name || hit.title || '',
              distance: distance !== null ? distance : undefined,
            });
          }).filter((r: any) => r !== null);

          return {
            indexName,
            hits: transformedHits,
            fullResults: results,
            success: true,
          };
        } catch (error: any) {
          logger.error(`[Autocomplete MongoDB] Failed to search index "${indexName}":`, error);
          return {
            indexName,
            hits: [],
            fullResults: null,
            success: false,
            error: error.message,
          };
        }
      });

      const searchResults = await Promise.all(searchPromises);
      const transformedResults: any[] = [];
      const seenResultKeys = new Set<string>();

      for (const { hits, success } of searchResults) {
        if (!success || !hits || hits.length === 0) continue;
        hits.forEach((hit: any) => {
          const key = `${hit.index}|${hit.id}`;
          if (seenResultKeys.has(key)) return;
          seenResultKeys.add(key);
          transformedResults.push(hit);
        });
      }

      transformedResults.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        if (a.type === 'coaching_center' && b.type === 'coaching_center') {
          const distA = a._distance !== null && a._distance !== undefined ? a._distance : Number.POSITIVE_INFINITY;
          const distB = b._distance !== null && b._distance !== undefined ? b._distance : Number.POSITIVE_INFINITY;
          if (distA !== distB) {
            return distA - distB;
          }
        }
        return 0;
      });

      const totalsByIndex: Record<string, number> = {};
      searchResults.forEach(({ indexName, fullResults }) => {
        if (fullResults && fullResults.estimatedTotalHits) {
          totalsByIndex[indexName] = fullResults.estimatedTotalHits;
        }
      });

      const totalAvailable = searchResults.reduce((sum, { fullResults }) => {
        return sum + (fullResults?.estimatedTotalHits || 0);
      }, 0);

      const sanitizedResults = transformedResults.map((result) => {
        if (result && Object.prototype.hasOwnProperty.call(result, '_distance')) {
          const { _distance, ...rest } = result;
          return rest;
        }
        return result;
      });

      res.status(200).json(
        new ApiResponse(
          200,
          {
            success: true,
            query: searchQuery,
            query_original: correction.wasCorrected ? query.trim() : undefined,
            query_corrected: correction.wasCorrected ? correction.corrected : undefined,
            was_corrected: correction.wasCorrected,
            corrections: correction.corrections,
            total: sanitizedResults.length,
            total_available: totalAvailable,
            size: sanitizedResults.length,
            from: 0,
            has_more: totalAvailable > sanitizedResults.length,
            results: sanitizedResults,
            totals_by_index: totalsByIndex,
            indices_searched: allIndices,
          },
          'Autocomplete results (MongoDB fallback)'
        )
      );
      return;
    }

    // Define all indices to search
    const allIndices = specificIndex
      ? [specificIndex]
      : [
          MEILISEARCH_INDICES.SPORTS,
          MEILISEARCH_INDICES.COACHING_CENTRES,
          MEILISEARCH_INDICES.LIVE_STREAMS,
          MEILISEARCH_INDICES.REELS,
        ];

    const baseSearchOptions = {
      limit: sizePerIndex,
      attributesToHighlight: ['name', 'title'],
      highlightPreTag: '<em class="text-orange-600">',
      highlightPostTag: '</em>',
      attributesToRetrieve: ['id', 'name', 'title'],
    };

    // Search all indices in parallel
    const searchPromises = allIndices.map(async (indexName) => {
      try {
        const searchOptions: any = { ...baseSearchOptions };
        searchOptions.attributesToRetrieve = getAttributesToRetrieve(indexName);

        const index = client!.index(indexName);
        const lowerIndex = indexName.toLowerCase();
        const isCoachingIndex = lowerIndex.includes('coaching') || lowerIndex.includes('centre');

        if (isCoachingIndex && latitude !== null && longitude !== null) {
          const radiusKm = Number.isFinite(radius) ? Math.max(radius, 1) : 50;
          const radiusInMeters = radiusKm * 1000;
          const searchLimit = Math.max(sizePerIndex * 4, sizePerIndex + 10, 50);

          const geoOptions = {
            ...searchOptions,
            limit: searchLimit,
            offset: 0,
            aroundLatLng: `${latitude},${longitude}`,
            filter: [`_geoRadius(${latitude}, ${longitude}, ${radiusInMeters})`],
          };

          try {
            const geoResults = await index.search(query, geoOptions);
            const hitsWithDistance = (geoResults.hits || []).map((hit) => {
              const hitLat = hit.latitude ?? hit.lat ?? hit._geo?.lat ?? null;
              const hitLng = hit.longitude ?? hit.long ?? hit._geo?.lng ?? null;

              let distanceKm =
                typeof hit._geoDistance === 'number' ? hit._geoDistance / 1000 : null;

              if ((distanceKm === null || Number.isNaN(distanceKm)) && hitLat !== null && hitLng !== null) {
                distanceKm = calculateDistance(latitude, longitude, hitLat, hitLng);
              }

              return {
                ...hit,
                _distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
                _latitude: hitLat,
                _longitude: hitLng,
              };
            });

            hitsWithDistance.sort((a, b) => {
              const distA = a._distanceKm !== null && Number.isFinite(a._distanceKm) ? a._distanceKm : Number.POSITIVE_INFINITY;
              const distB = b._distanceKm !== null && Number.isFinite(b._distanceKm) ? b._distanceKm : Number.POSITIVE_INFINITY;
              return distA - distB;
            });

            const finiteHits = hitsWithDistance.filter((hit) => Number.isFinite(hit._distanceKm));
            const candidates = finiteHits.length > 0 ? finiteHits : hitsWithDistance;
            const trimmedHits = candidates.slice(0, sizePerIndex);

            if (trimmedHits.length > 0) {
              return {
                indexName,
                hits: trimmedHits.map((hit) => ({
                  ...hit,
                  _autocompleteDistance: hit._distanceKm,
                })),
                fullResults: {
                  ...geoResults,
                  hits: trimmedHits,
                },
                success: true,
                geoFiltered: true,
              };
            }
          } catch (geoError) {
            logger.error(`[Autocomplete] Geo search failed for index "${indexName}":`, geoError);
          }
        }

        const results = await index.search(query, searchOptions);
        return {
          indexName,
          hits: results.hits || [],
          fullResults: results,
          success: true,
        };
      } catch (error: any) {
        logger.error(`[Autocomplete] Failed to search index "${indexName}":`, error);
        return {
          indexName,
          hits: [],
          fullResults: null,
          success: false,
          error: error.message,
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // Transform results
    const transformedResults: any[] = [];
    const seenResultKeys = new Set<string>();

    for (const { indexName, hits, success } of searchResults) {
      if (!success || !hits || hits.length === 0) continue;

      hits.forEach((hit) => {
        let distanceCandidate =
          typeof hit._autocompleteDistance === 'number' && Number.isFinite(hit._autocompleteDistance)
            ? hit._autocompleteDistance
            : typeof hit._distanceKm === 'number' && Number.isFinite(hit._distanceKm)
            ? hit._distanceKm
            : null;

        const latitudeCandidate = hit._latitude ?? hit.latitude ?? hit.lat ?? hit._geo?.lat ?? null;
        const longitudeCandidate = hit._longitude ?? hit.longitude ?? hit.long ?? hit._geo?.lng ?? null;

        if (
          distanceCandidate === null &&
          latitude !== null &&
          longitude !== null &&
          latitudeCandidate !== null &&
          longitudeCandidate !== null
        ) {
          distanceCandidate = calculateDistance(latitude, longitude, latitudeCandidate, longitudeCandidate);
        }

        const result = createAutocompleteResult(hit, indexName, {
          highlight: hit._formatted?.name || hit._formatted?.title,
          distance: distanceCandidate !== null ? distanceCandidate : undefined,
        });

        if (!result) return;

        const key = `${result.index}|${result.id}`;
        if (seenResultKeys.has(key)) return;

        seenResultKeys.add(key);
        transformedResults.push(result);
      });
    }

    // Sort results by priority first, then by distance for academies
    transformedResults.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      if (a.type === 'coaching_center' && b.type === 'coaching_center') {
        const distA = Number.isFinite(a._distance) ? a._distance : Number.POSITIVE_INFINITY;
        const distB = Number.isFinite(b._distance) ? b._distance : Number.POSITIVE_INFINITY;
        if (distA !== distB) {
          return distA - distB;
        }
      }
      return 0;
    });

    // Calculate totals
    const totalsByIndex: Record<string, number> = {};
    searchResults.forEach(({ indexName, fullResults }) => {
      if (fullResults && fullResults.estimatedTotalHits) {
        totalsByIndex[indexName] = fullResults.estimatedTotalHits;
      }
    });

    const totalAvailable = searchResults.reduce((sum, { fullResults }) => {
      return sum + (fullResults?.estimatedTotalHits || 0);
    }, 0);

    const sanitizedResults = transformedResults.map((result) => {
      if (result && Object.prototype.hasOwnProperty.call(result, '_distance')) {
        const { _distance, ...rest } = result;
        return rest;
      }
      return result;
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          success: true,
          query: query,
          total: sanitizedResults.length,
          total_available: totalAvailable,
          size: sanitizedResults.length,
          from: 0,
          has_more: totalAvailable > sanitizedResults.length,
          results: sanitizedResults,
          totals_by_index: totalsByIndex,
          indices_searched: allIndices,
        },
        'Autocomplete results'
      )
    );
  } catch (error: any) {
    logger.error('Meilisearch autocomplete error:', error);
    throw new ApiError(500, error.message || 'Internal server error');
  }
};

/**
 * Full Search API
 * GET /api/v1/search?q=searchterm&size=10&from=0&index=coaching_centres_index&latitude=28.6139&longitude=77.2090&radius=50
 */
export const search = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string) || (req.query.query as string) || '';
    const specificIndex = req.query.index as string | undefined;
    const size = parseInt((req.query.size as string) || '10', 10);
    const from = parseInt((req.query.from as string) || '0', 10);
    const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : null;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : null;
    const radius = parseInt((req.query.radius as string) || '50', 10);

    if (!query || query.trim() === '') {
      throw new ApiError(400, 'Query parameter "q" or "query" is required');
    }

    const client = getClient();

    // For Meilisearch: "s&s" → "s s" so token search matches "S&S Football Academy"
    const queryForMeilisearch = query.trim().replace(/&/g, ' ').replace(/\s+/g, ' ').trim() || query.trim();

    // If Meilisearch is disabled, use MongoDB fallback
    if (!client) {
      logger.info('Meilisearch disabled, using MongoDB fallback for search');

      const allIndices = specificIndex
        ? [specificIndex]
        : [
            MEILISEARCH_INDICES.COACHING_CENTRES,
            MEILISEARCH_INDICES.SPORTS,
            MEILISEARCH_INDICES.LIVE_STREAMS,
            MEILISEARCH_INDICES.REELS,
          ];

      // Normalize ("popular cricket academy near me" → "cricket academy") then auto-correct ("cricaket acaemy" → "cricket academy")
      const normalized = normalizeSearchQuery(query.trim());
      const queryForSearch = normalized || query.trim();
      const dictionary = await getSearchCorrectionDictionary();
      const correction = getCorrectedSearchQuery(queryForSearch, dictionary);
      const searchQuery = correction.wasCorrected ? correction.corrected : queryForSearch;

      const resultsByIndex: Record<string, any> = {};

      const normalizeIndexName = (name: string): string => {
        if (name.includes('coaching') || name.includes('centre')) {
          return 'coaching_centres';
        } else if (name.includes('sport') && !name.includes('coaching')) {
          return 'sports';
        } else if (name.includes('live') || name.includes('stream')) {
          return 'live_streams';
        } else if (name.includes('reel')) {
          return 'reels';
        }
        return name;
      };

      // Search all indices
      for (const indexName of allIndices) {
        try {
          const lowerIndex = indexName.toLowerCase();
          let searchResults: any = { hits: [], estimatedTotalHits: 0 };

          if (lowerIndex.includes('coaching') || lowerIndex.includes('centre')) {
            searchResults = await mongodbFallback.searchCoachingCenters(searchQuery, {
              size: size * 2, // Get more for proper sorting
              from: 0,
              latitude,
              longitude,
              radius,
            });
          } else if (lowerIndex.includes('sport') && !lowerIndex.includes('coaching')) {
            searchResults = await mongodbFallback.searchSports(searchQuery, { size: size * 2, from: 0 });
          } else if (lowerIndex.includes('reel')) {
            searchResults = await mongodbFallback.searchReels(searchQuery, { size: size * 2, from: 0 });
          } else if (lowerIndex.includes('live') || lowerIndex.includes('stream') || lowerIndex.includes('highlight')) {
            searchResults = await mongodbFallback.searchStreamHighlights(searchQuery, { size: size * 2, from: 0 });
          }

          // Transform results to match Meilisearch format
          const normalizedIndexName = normalizeIndexName(indexName);
          const transformedResults = searchResults.hits.slice(from, from + size).map((hit: any) => {
            const source: any = {
              id: hit.id,
              name: hit.name || hit.coaching_name || hit.title || '',
              description: hit.description || hit.bio || '',
              address: hit.address || '',
              latitude: hit.latitude,
              longitude: hit.longitude,
              logo: hit.logo || null,
              images: (() => {
                // Exclude logo from images array, but use logo as fallback if no images
                const logoUrl = hit.logo || null;
                let imageArray: any[] = [];
                
                if (Array.isArray(hit.images)) {
                  imageArray = hit.images
                    .filter((img: any) => {
                      const imgUrl = typeof img === 'string' ? img : (img?.url || '');
                      return logoUrl ? imgUrl !== logoUrl : true;
                    })
                    .slice(0, 2);
                } else if (hit.images) {
                  const imgUrl = typeof hit.images === 'string' ? hit.images : (hit.images?.url || '');
                  if (!logoUrl || imgUrl !== logoUrl) {
                    imageArray = [hit.images].slice(0, 2);
                  }
                }
                
                // If no images available, use logo as fallback
                if (imageArray.length === 0 && logoUrl) {
                  return [logoUrl];
                }
                
                return imageArray;
              })(),
              allowed_gender: hit.allowed_gender || [],
              sports_names: hit.sports_names || [],
              location_name: hit.location_name || null,
              experience: hit.experience || null,
              pincode: hit.pincode || null,
              distance: hit.distance !== null && hit.distance !== undefined ? hit.distance : null,
            };

            if (indexName.includes('live') || indexName.includes('stream') || indexName.includes('reel')) {
              source.thumbnail = hit.thumbnail || hit.thumbnailUrl || null;
            }

            if (indexName.includes('live') || indexName.includes('stream')) {
              source.stream_key = hit.stream_key || null;
            }

            if (indexName.includes('reel')) {
              source.video_url = hit.video_url || hit.videoUrl || null;
              source.videoUrl = hit.video_url || hit.videoUrl || null;
              source.views = hit.views || hit.views_count || 0;
              source.views_count = hit.views || hit.views_count || 0;
            }

            if (indexName.includes('sport') && !indexName.includes('coaching')) {
              source.sport_specific_data = {
                sport_id: hit.sport_id || hit.id || null,
                sport_name: hit.sport_name || hit.name || '',
                sport_logo: hit.sport_logo || hit.logo || null,
                description: hit.description || hit.bio || '',
                images: hit.images || [],
                videos: hit.videos || [],
                has_sport_bio: hit.has_sport_bio || false,
              };
              source.sport_id = hit.sport_id || hit.id || null;
              source.sport_name = hit.sport_name || hit.name || '';
              source.sport_logo = hit.sport_logo || hit.logo || null;
              source.is_active = hit.is_active !== undefined ? hit.is_active : true;
              source.is_popular = hit.is_popular !== undefined ? hit.is_popular : false;
            }

            return {
              index: normalizedIndexName,
              id: hit.id,
              score: 0,
              source,
              highlight: {},
            };
          });

          resultsByIndex[normalizedIndexName] = {
            results: transformedResults,
            total: searchResults.estimatedTotalHits,
            has_more: searchResults.estimatedTotalHits > (from + size),
          };
        } catch (error: any) {
          logger.error(`[Search MongoDB] Failed to search index "${indexName}":`, error);
          const normalizedIndexName = normalizeIndexName(indexName);
          resultsByIndex[normalizedIndexName] = {
            results: [],
            total: 0,
            has_more: false,
          };
        }
      }

      const totalResults = Object.values(resultsByIndex).reduce(
        (sum: number, data: any) => sum + data.results.length,
        0
      );
      const totalAvailable = Object.values(resultsByIndex).reduce(
        (sum: number, data: any) => sum + data.total,
        0
      );

      res.status(200).json(
        new ApiResponse(
          200,
          {
            success: true,
            query: {
              text: searchQuery,
              indices: allIndices,
            },
            query_original: correction.wasCorrected ? query.trim() : undefined,
            query_corrected: correction.wasCorrected ? correction.corrected : undefined,
            was_corrected: correction.wasCorrected,
            corrections: correction.corrections,
            pagination: {
              total: totalResults,
              total_available: totalAvailable,
              size,
              from,
              has_more: totalAvailable > totalResults,
            },
            results_by_index: resultsByIndex,
            results: Object.values(resultsByIndex).flatMap((data: any) => data.results),
            took: 0,
          },
          'Search results (MongoDB fallback)'
        )
      );
      return;
    }

    const allIndices = specificIndex
      ? [specificIndex]
      : [
          MEILISEARCH_INDICES.COACHING_CENTRES,
          MEILISEARCH_INDICES.SPORTS,
          MEILISEARCH_INDICES.LIVE_STREAMS,
          MEILISEARCH_INDICES.REELS,
        ];

    const searchOptions: any = {
      limit: size,
      offset: from,
      attributesToHighlight: [
        'name',
        'description',
        'address',
        'sports_names',
      ],
      highlightPreTag: '<em>',
      highlightPostTag: '</em>',
      attributesToRetrieve: [
        'id',
        'name',
        'coaching_name',
        'description',
        'bio',
        'address',
        'address_line1',
        'address_line2',
        'latitude',
        'longitude',
        'lat',
        'long',
        'logo',
        'images',
        'allowed_gender',
        'sports_names',
        'location_name',
        'experience',
        'pincode',
        'created_at',
        'updated_at',
      ],
    };

    // Search all indices in parallel
    const searchPromises = allIndices.map(async (indexName) => {
      try {
        const indexSearchOptions = { ...searchOptions };

        // For coaching centres, implement prioritized search with geo-filtering
        let results = null;
        let usedGeoFilter = false;

        if (indexName.includes('coaching') || indexName.includes('centre')) {
          const index = client!.index(indexName);
          const radiusKm = radius || 50;
          const radiusInMeters = radiusKm * 1000;
          const searchLimit = 200; // Fetch large set for proper distance sorting

          const searchOptionsForIndex = {
            ...indexSearchOptions,
            limit: searchLimit,
            offset: 0,
          };

          if (latitude !== null && longitude !== null) {
            const geoFilterOptions: any = { ...searchOptionsForIndex };
            geoFilterOptions.filter = [`_geoRadius(${latitude}, ${longitude}, ${radiusInMeters})`];
            geoFilterOptions.aroundLatLng = `${latitude},${longitude}`;

            try {
              const searchResults = await index.search(queryForMeilisearch, geoFilterOptions);
              const queryLower = query.toLowerCase().trim();

              let prioritizedHits = (searchResults.hits || []).map((hit: any) => {
                const sportsNames = hit.sports_names || [];
                const sportsArray = Array.isArray(sportsNames)
                  ? sportsNames
                  : typeof sportsNames === 'string'
                  ? [sportsNames]
                  : [];
                const isSportMatch = sportsArray.some((sport: any) => {
                  const sportStr = typeof sport === 'string' ? sport : sport?.name || '';
                  return sportStr.toLowerCase().includes(queryLower);
                });

                return {
                  ...hit,
                  isSportMatch,
                  priority: isSportMatch ? 1 : 2,
                };
              });

              prioritizedHits.sort((a: any, b: any) => {
                if (a.priority !== b.priority) {
                  return a.priority - b.priority;
                }
                const distA = a._geoDistance !== undefined ? a._geoDistance / 1000 : Infinity;
                const distB = b._geoDistance !== undefined ? b._geoDistance / 1000 : Infinity;
                return distA - distB;
              });

              const paginatedHits = prioritizedHits.slice(from, from + size);

              results = {
                hits: paginatedHits,
                estimatedTotalHits: searchResults.estimatedTotalHits || prioritizedHits.length,
                processingTimeMs: searchResults.processingTimeMs || 0,
              };

              usedGeoFilter = true;
            } catch (geoError) {
              const searchResults = await index.search(queryForMeilisearch, searchOptionsForIndex);
              const queryLower = query.toLowerCase().trim();

              let prioritizedHits = (searchResults.hits || []).map((hit: any) => {
                const sportsNames = hit.sports_names || [];
                const sportsArray = Array.isArray(sportsNames)
                  ? sportsNames
                  : typeof sportsNames === 'string'
                  ? [sportsNames]
                  : [];
                const isSportMatch = sportsArray.some((sport: any) => {
                  const sportStr = typeof sport === 'string' ? sport : sport?.name || '';
                  return sportStr.toLowerCase().includes(queryLower);
                });
                return { ...hit, isSportMatch, priority: isSportMatch ? 1 : 2 };
              });

              const hitsWithDistance = prioritizedHits.map((hit: any) => {
                let distance = hit._geoDistance !== undefined ? hit._geoDistance / 1000 : null;

                if (distance === null && latitude !== null && longitude !== null) {
                  const hitLat = hit.latitude ?? hit.lat ?? hit._geo?.lat ?? null;
                  const hitLng = hit.longitude ?? hit.long ?? hit._geo?.lng ?? null;
                  if (hitLat && hitLng) {
                    distance = calculateDistance(latitude, longitude, hitLat, hitLng);
                  }
                }
                return { ...hit, calculatedDistance: distance };
              });

              hitsWithDistance.sort((a: any, b: any) => {
                if (a.priority !== b.priority) {
                  return a.priority - b.priority;
                }
                const distA = a.calculatedDistance !== null ? a.calculatedDistance : Infinity;
                const distB = b.calculatedDistance !== null ? b.calculatedDistance : Infinity;
                return distA - distB;
              });

              const paginatedHits = hitsWithDistance.slice(from, from + size);

              results = {
                hits: paginatedHits,
                estimatedTotalHits: searchResults.estimatedTotalHits || prioritizedHits.length,
                processingTimeMs: searchResults.processingTimeMs || 0,
              };
            }
          } else {
            const searchResults = await index.search(queryForMeilisearch, searchOptionsForIndex);
            const queryLower = query.toLowerCase().trim();

            let prioritizedHits = (searchResults.hits || []).map((hit: any) => {
              const sportsNames = hit.sports_names || [];
              const sportsArray = Array.isArray(sportsNames)
                ? sportsNames
                : typeof sportsNames === 'string'
                ? [sportsNames]
                : [];
              const isSportMatch = sportsArray.some((sport: any) => {
                const sportStr = typeof sport === 'string' ? sport : sport?.name || '';
                return sportStr.toLowerCase().includes(queryLower);
              });
              return { ...hit, isSportMatch, priority: isSportMatch ? 1 : 2 };
            });

            prioritizedHits.sort((a: any, b: any) => a.priority - b.priority);
            const paginatedHits = prioritizedHits.slice(from, from + size);

            results = {
              hits: paginatedHits,
              estimatedTotalHits: searchResults.estimatedTotalHits || prioritizedHits.length,
              processingTimeMs: searchResults.processingTimeMs || 0,
            };
          }
        } else {
          // Other indices - add index-specific fields
          const indexSpecificOptions = { ...indexSearchOptions };

          if (indexName.includes('live') || indexName.includes('stream')) {
            indexSpecificOptions.attributesToRetrieve = [
              ...(indexSearchOptions.attributesToRetrieve || []),
              'thumbnail',
              'stream_key',
              'title',
            ];
          }

          if (indexName.includes('reel')) {
            indexSpecificOptions.attributesToRetrieve = [
              ...(indexSearchOptions.attributesToRetrieve || []),
              'thumbnail',
              'thumbnailUrl',
              'video_url',
              'videoUrl',
              'views',
              'views_count',
              'title',
            ];
          }

          if (indexName.includes('sport') && !indexName.includes('coaching')) {
            indexSpecificOptions.attributesToRetrieve = [
              ...(indexSearchOptions.attributesToRetrieve || []),
              'sport_id',
              'sport_name',
              'sport_logo',
              'images',
              'videos',
              'has_sport_bio',
              'is_active',
              'is_popular',
            ];
          }

          const index = client!.index(indexName);
          results = await index.search(queryForMeilisearch, indexSpecificOptions);
        }

        return {
          indexName,
          hits: results.hits || [],
          fullResults: results,
          success: true,
          usedGeoFilter,
        };
      } catch (error: any) {
        logger.error(`[Search] Failed to search index "${indexName}":`, error);
        return {
          indexName,
          hits: [],
          fullResults: null,
          success: false,
          error: error.message,
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // Process results by index
    const resultsByIndex: Record<string, any> = {};

    const normalizeIndexName = (name: string): string => {
      if (name.includes('coaching') || name.includes('centre')) {
        return 'coaching_centres';
      } else if (name.includes('sport') && !name.includes('coaching')) {
        return 'sports';
      } else if (name.includes('live') || name.includes('stream')) {
        return 'live_streams';
      } else if (name.includes('reel')) {
        return 'reels';
      }
      return name;
    };

    for (const { indexName, hits, fullResults, success } of searchResults) {
      const normalizedIndexName = normalizeIndexName(indexName);

      if (!success || !hits || hits.length === 0) {
        resultsByIndex[normalizedIndexName] = {
          results: [],
          total: 0,
          has_more: false,
        };
        continue;
      }

      const transformedResults = hits.map((hit: any) => {
        let hitLatitude = hit.latitude ?? hit.lat ?? null;
        let hitLongitude = hit.longitude ?? hit.long ?? null;

        if (!hitLatitude && hit._geo && hit._geo.lat) {
          hitLatitude = hit._geo.lat;
        }
        if (!hitLongitude && hit._geo && hit._geo.lng) {
          hitLongitude = hit._geo.lng;
        }

        let distanceInMeters = null;
        if (hit._geoDistance !== undefined) {
          distanceInMeters = hit._geoDistance;
        } else if (hit.calculatedDistance !== null && hit.calculatedDistance !== undefined) {
          distanceInMeters = hit.calculatedDistance * 1000;
        } else if (latitude !== null && longitude !== null && hitLatitude && hitLongitude) {
          distanceInMeters = calculateDistance(latitude, longitude, hitLatitude, hitLongitude) * 1000;
        }

        // Process images - limit to 2, prioritize is_banner
        // If no images available, use logo as fallback
        const logoUrl = hit.logo || null;
        let processedImages: string[] = [];
        if (Array.isArray(hit.images)) {
          const validImages = hit.images
            .filter((img: any) => {
              if (typeof img === 'string') {
                // Exclude if it matches the logo URL
                return logoUrl ? img !== logoUrl : true;
              }
              const isActive = img.is_active !== false && img.is_deleted !== true && !img.deletedAt;
              if (!isActive) return false;
              // Exclude if image URL matches logo URL
              const imgUrl = img.url || '';
              return logoUrl ? imgUrl !== logoUrl : true;
            })
            .sort((a: any, b: any) => {
              const aIsBanner = typeof a === 'object' && a.is_banner === true ? 1 : 0;
              const bIsBanner = typeof b === 'object' && b.is_banner === true ? 1 : 0;
              return bIsBanner - aIsBanner;
            })
            .slice(0, 2)
            .map((img: any) => {
              if (typeof img === 'string') return img;
              return img.url || '';
            })
            .filter((url: string) => url && url.trim() !== '');
          processedImages = validImages;
        } else if (hit.images) {
          // Handle non-array images and exclude logo
          const imagesArray = Array.isArray(hit.images) ? hit.images : [hit.images];
          processedImages = imagesArray
            .filter((img: any) => {
              const imgUrl = typeof img === 'string' ? img : (img?.url || '');
              return logoUrl ? imgUrl !== logoUrl : true;
            })
            .slice(0, 2)
            .map((img: any) => typeof img === 'string' ? img : (img?.url || ''));
        }
        
        // If no images found and logo exists, use logo as fallback
        if (processedImages.length === 0 && logoUrl) {
          processedImages = [logoUrl];
        }

        const source: any = {
          id: hit.id,
          name: hit.name || hit.coaching_name || hit.title || '',
          description: hit.description || hit.bio || '',
          address: hit.address || `${hit.address_line1 || ''} ${hit.address_line2 || ''}`.trim() || '',
          latitude: hitLatitude,
          longitude: hitLongitude,
          logo: hit.logo || null,
          images: processedImages,
          allowed_gender: Array.isArray(hit.allowed_gender) ? hit.allowed_gender : [],
          sports_names: Array.isArray(hit.sports_names) ? hit.sports_names : [],
          location_name: hit.location_name || null,
          experience: hit.experience || null,
          pincode: hit.pincode || null,
          created_at: hit.created_at || null,
          updated_at: hit.updated_at || null,
          distance:
            distanceInMeters !== null ? Math.round(distanceInMeters / 10) / 100 : null,
        };

        if (indexName.includes('live') || indexName.includes('stream') || indexName.includes('reel')) {
          source.thumbnail = hit.thumbnail || hit.thumbnailUrl || null;
        }

        if (indexName.includes('live') || indexName.includes('stream')) {
          source.stream_key = hit.stream_key || null;
        }

        if (indexName.includes('reel')) {
          source.video_url = hit.video_url || hit.videoUrl || null;
          source.videoUrl = hit.video_url || hit.videoUrl || null;
          source.views = hit.views || hit.views_count || 0;
          source.views_count = hit.views || hit.views_count || 0;
        }

        if (indexName.includes('sport') && !indexName.includes('coaching')) {
          source.sport_specific_data = {
            sport_id: hit.sport_id || hit.id || null,
            sport_name: hit.sport_name || hit.name || '',
            sport_logo: hit.sport_logo || hit.logo || null,
            description: hit.description || hit.bio || '',
            images: Array.isArray(hit.images) ? hit.images : hit.images ? [hit.images] : [],
            videos: Array.isArray(hit.videos) ? hit.videos : hit.videos ? [hit.videos] : [],
            has_sport_bio: hit.has_sport_bio !== undefined ? hit.has_sport_bio : false,
          };
          source.sport_id = hit.sport_id || hit.id || null;
          source.sport_name = hit.sport_name || hit.name || '';
          source.sport_logo = hit.sport_logo || hit.logo || null;
          source.is_active = hit.is_active !== undefined ? hit.is_active : true;
          source.is_popular = hit.is_popular !== undefined ? hit.is_popular : false;
        }

        return {
          index: normalizedIndexName,
          id: hit.id,
          score: hit._rankingScore || 0,
          source,
          highlight: hit._formatted || {},
        };
      });

      // Filter and sort for coaching centres with location
      let finalTransformedResults = transformedResults;
      if ((indexName.includes('coaching') || indexName.includes('centre')) && latitude !== null && longitude !== null) {
        const radiusKm = radius || 50;
        const filteredResults = transformedResults.filter((result: any) => {
          if (result.source.distance === null || result.source.distance === undefined) {
            return false;
          }
          return result.source.distance <= radiusKm;
        });

        const queryLower = query.toLowerCase().trim();
        finalTransformedResults = filteredResults.sort((a: any, b: any) => {
          const aSports = a.source.sports_names || [];
          const aSportsArray = Array.isArray(aSports) ? aSports : [];
          const aIsSportMatch = aSportsArray.some((sport: any) => {
            const sportStr = typeof sport === 'string' ? sport : sport?.name || '';
            return sportStr.toLowerCase().includes(queryLower);
          });

          const bSports = b.source.sports_names || [];
          const bSportsArray = Array.isArray(bSports) ? bSports : [];
          const bIsSportMatch = bSportsArray.some((sport: any) => {
            const sportStr = typeof sport === 'string' ? sport : sport?.name || '';
            return sportStr.toLowerCase().includes(queryLower);
          });

          if (aIsSportMatch && !bIsSportMatch) return -1;
          if (!aIsSportMatch && bIsSportMatch) return 1;

          const distA = a.source.distance !== null ? a.source.distance : Infinity;
          const distB = b.source.distance !== null ? b.source.distance : Infinity;
          return distA - distB;
        });
      }

      if (resultsByIndex[normalizedIndexName]) {
        let mergedResults = [...resultsByIndex[normalizedIndexName].results, ...finalTransformedResults];

        if ((indexName.includes('coaching') || indexName.includes('centre')) && latitude !== null && longitude !== null) {
          const radiusKm = radius || 50;
          const queryLower = query.toLowerCase().trim();

          mergedResults = mergedResults.filter((result: any) => {
            if (result.source.distance === null || result.source.distance === undefined) {
              return false;
            }
            return result.source.distance <= radiusKm;
          });

          mergedResults.sort((a: any, b: any) => {
            const aSports = a.source.sports_names || [];
            const aSportsArray = Array.isArray(aSports) ? aSports : [];
            const aIsSportMatch = aSportsArray.some((sport: any) => {
              const sportStr = typeof sport === 'string' ? sport : sport?.name || '';
              return sportStr.toLowerCase().includes(queryLower);
            });

            const bSports = b.source.sports_names || [];
            const bSportsArray = Array.isArray(bSports) ? bSports : [];
            const bIsSportMatch = bSportsArray.some((sport: any) => {
              const sportStr = typeof sport === 'string' ? sport : sport?.name || '';
              return sportStr.toLowerCase().includes(queryLower);
            });

            if (aIsSportMatch && !bIsSportMatch) return -1;
            if (!aIsSportMatch && bIsSportMatch) return 1;

            const distA = a.source.distance !== null ? a.source.distance : Infinity;
            const distB = b.source.distance !== null ? b.source.distance : Infinity;
            return distA - distB;
          });
        }

        resultsByIndex[normalizedIndexName].results = mergedResults;
        resultsByIndex[normalizedIndexName].total =
          (resultsByIndex[normalizedIndexName].total || 0) +
          (fullResults?.estimatedTotalHits || finalTransformedResults.length);
        resultsByIndex[normalizedIndexName].has_more =
          (resultsByIndex[normalizedIndexName].total || 0) >
          resultsByIndex[normalizedIndexName].results.length;
      } else {
        resultsByIndex[normalizedIndexName] = {
          results: finalTransformedResults,
          total: fullResults?.estimatedTotalHits || finalTransformedResults.length,
          has_more: (fullResults?.estimatedTotalHits || 0) > finalTransformedResults.length,
        };
      }
    }

    const totalResults = Object.values(resultsByIndex).reduce(
      (sum: number, data: any) => sum + data.results.length,
      0
    );
    const totalAvailable = Object.values(resultsByIndex).reduce(
      (sum: number, data: any) => sum + data.total,
      0
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          success: true,
          query: {
            text: query,
            indices: allIndices,
          },
          pagination: {
            total: totalResults,
            total_available: totalAvailable,
            size,
            from,
            has_more: totalAvailable > totalResults,
          },
          results_by_index: resultsByIndex,
          results: Object.values(resultsByIndex).flatMap((data: any) => data.results),
          took: Math.max(
            ...searchResults
              .filter((r) => r.fullResults !== null)
              .map((r) => r.fullResults?.processingTimeMs || 0),
            0
          ),
        },
        'Search results'
      )
    );
  } catch (error: any) {
    logger.error('Meilisearch search error:', error);
    throw new ApiError(500, error.message || 'Internal server error');
  }
};
