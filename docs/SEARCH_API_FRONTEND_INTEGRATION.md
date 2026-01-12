# Search API Frontend Integration Guide

This document provides comprehensive guidance for frontend developers to integrate the Search APIs into their applications.

## Overview

The Search API provides two main endpoints:
1. **Autocomplete API** - For search-as-you-type functionality
2. **Full Search API** - For comprehensive search results with pagination

Both APIs search across multiple indices:
- **Sports** (`sports_index`)
- **Coaching Centers** (`coaching_centres_index`)
- **Reels** (`reels_index`)
- **Live Streams/Highlights** (`live_streams_index`)

## Base URL

```
Production: https://api.playasport.in/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication

Both search endpoints are **public** and do not require authentication. However, providing user location (latitude/longitude) improves search results for coaching centers.

---

## 1. Autocomplete API

### Endpoint

```
GET /api/v1/search/autocomplete
```

### Use Case

Use this API for:
- Search-as-you-type suggestions
- Quick search dropdowns
- Autocomplete input fields
- Real-time search suggestions

### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query string |
| `size` | integer | No | 5 | Number of results per index (max: 50) |
| `index` | string | No | all | Specific index to search (optional) |
| `latitude` | number | No | - | User's latitude for geo-sorting |
| `longitude` | number | No | - | User's longitude for geo-sorting |
| `radius` | integer | No | 50 | Search radius in km (for coaching centers) |

### Example Request

```javascript
// Basic autocomplete
GET /api/v1/search/autocomplete?q=cricket&size=5

// With location for geo-sorting
GET /api/v1/search/autocomplete?q=cricket&size=5&latitude=28.6139&longitude=77.2090&radius=50

// Search specific index only
GET /api/v1/search/autocomplete?q=cricket&index=coaching_centres_index&size=10
```

### Response Structure

```json
{
  "success": true,
  "message": "Autocomplete results",
  "data": {
    "query": "cricket",
    "total": 10,
    "total_available": 25,
    "size": 10,
    "from": 0,
    "has_more": true,
    "results": [
      {
        "index": "sports_index",
        "id": "sport-uuid",
        "name": "Cricket",
        "type": "sport",
        "priority": 1,
        "highlight": "<em class=\"text-orange-600\">Cricket</em>"
      },
      {
        "index": "coaching_centres_index",
        "id": "center-uuid",
        "name": "Cricket Academy",
        "type": "coaching_center",
        "priority": 2,
        "highlight": "<em class=\"text-orange-600\">Cricket</em> Academy",
        "_distance": 5.2
      }
    ],
    "totals_by_index": {
      "sports_index": 1,
      "coaching_centres_index": 24
    },
    "indices_searched": [
      "sports_index",
      "coaching_centres_index",
      "live_streams_index",
      "reels_index"
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `query` | string | The search query used |
| `total` | integer | Total number of results returned |
| `total_available` | integer | Total number of results available (may be more) |
| `size` | integer | Number of results returned |
| `from` | integer | Starting offset (always 0 for autocomplete) |
| `has_more` | boolean | Whether more results are available |
| `results` | array | Array of search results |
| `results[].index` | string | Index name (sports_index, coaching_centres_index, etc.) |
| `results[].id` | string | Document ID |
| `results[].name` | string | Display name |
| `results[].type` | string | Result type (sport, coaching_center, live_stream, reel) |
| `results[].priority` | integer | Priority for sorting (lower = higher priority) |
| `results[].highlight` | string | HTML highlighted search term match |
| `results[]._distance` | number | Distance in km (only for coaching centers with location) |
| `totals_by_index` | object | Total results per index |
| `indices_searched` | array | List of indices that were searched |

### Frontend Implementation Example

#### React/Next.js Example

```typescript
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface AutocompleteResult {
  index: string;
  id: string;
  name: string;
  type: 'sport' | 'coaching_center' | 'live_stream' | 'reel';
  priority: number;
  highlight: string | null;
  _distance?: number;
}

interface AutocompleteResponse {
  success: boolean;
  message: string;
  data: {
    query: string;
    total: number;
    total_available: number;
    results: AutocompleteResult[];
    totals_by_index: Record<string, number>;
  };
}

const useAutocomplete = (query: string, userLocation?: { lat: number; lng: number }) => {
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: searchQuery.trim(),
          size: '5',
        });

        if (userLocation) {
          params.append('latitude', userLocation.lat.toString());
          params.append('longitude', userLocation.lng.toString());
          params.append('radius', '50');
        }

        const response = await axios.get<AutocompleteResponse>(
          `${process.env.NEXT_PUBLIC_API_URL}/search/autocomplete`,
          { params }
        );

        if (response.data.success) {
          setResults(response.data.data.results);
        } else {
          setError('Search failed');
        }
      } catch (err) {
        setError('Failed to fetch autocomplete results');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [userLocation]
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      search(query);
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [query, search]);

  return { results, loading, error };
};

// Usage in component
const SearchAutocomplete = () => {
  const [query, setQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();

  // Get user location (optional)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Location access denied or failed
        }
      );
    }
  }, []);

  const { results, loading } = useAutocomplete(query, userLocation);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sports, academies, reels..."
      />
      {loading && <div>Loading...</div>}
      {results.length > 0 && (
        <ul>
          {results.map((result) => (
            <li key={`${result.index}-${result.id}`}>
              <div
                dangerouslySetInnerHTML={{ __html: result.highlight || result.name }}
              />
              {result.type === 'coaching_center' && result._distance && (
                <span>{result._distance.toFixed(1)} km away</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

#### Vanilla JavaScript Example

```javascript
class SearchAutocomplete {
  constructor(apiUrl, options = {}) {
    this.apiUrl = apiUrl;
    this.debounceDelay = options.debounceDelay || 300;
    this.minQueryLength = options.minQueryLength || 2;
    this.userLocation = options.userLocation || null;
    this.timeoutId = null;
  }

  async search(query, callback) {
    if (!query || query.trim().length < this.minQueryLength) {
      callback([]);
      return;
    }

    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          size: '5',
        });

        if (this.userLocation) {
          params.append('latitude', this.userLocation.lat.toString());
          params.append('longitude', this.userLocation.lng.toString());
          params.append('radius', '50');
        }

        const response = await fetch(
          `${this.apiUrl}/search/autocomplete?${params.toString()}`
        );
        const data = await response.json();

        if (data.success) {
          callback(data.data.results);
        } else {
          callback([]);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        callback([]);
      }
    }, this.debounceDelay);
  }
}

// Usage
const autocomplete = new SearchAutocomplete('https://api.playasport.in/api/v1', {
  debounceDelay: 300,
  userLocation: { lat: 28.6139, lng: 77.2090 },
});

const input = document.getElementById('search-input');
input.addEventListener('input', (e) => {
  autocomplete.search(e.target.value, (results) => {
    // Update UI with results
    console.log('Results:', results);
  });
});
```

---

## 2. Full Search API

### Endpoint

```
GET /api/v1/search
```

### Use Case

Use this API for:
- Search results pages
- Paginated search results
- Detailed search with filters
- Search result listings

### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` or `query` | string | Yes | - | Search query string |
| `size` | integer | No | 10 | Number of results per page (max: 100) |
| `from` | integer | No | 0 | Pagination offset |
| `index` | string | No | all | Specific index to search (optional) |
| `latitude` | number | No | - | User's latitude for geo-sorting |
| `longitude` | number | No | - | User's longitude for geo-sorting |
| `radius` | integer | No | 50 | Search radius in km (for coaching centers) |

### Example Request

```javascript
// Basic search
GET /api/v1/search?q=cricket academy&size=10&from=0

// With location and pagination
GET /api/v1/search?q=cricket&size=20&from=0&latitude=28.6139&longitude=77.2090&radius=50

// Search specific index
GET /api/v1/search?q=cricket&index=coaching_centres_index&size=10&from=0
```

### Response Structure

```json
{
  "success": true,
  "message": "Search results",
  "data": {
    "query": {
      "text": "cricket academy",
      "indices": [
        "coaching_centres_index",
        "sports_index",
        "live_streams_index",
        "reels_index"
      ]
    },
    "pagination": {
      "total": 15,
      "total_available": 25,
      "size": 10,
      "from": 0,
      "has_more": true
    },
    "results_by_index": {
      "coaching_centres": {
        "results": [
          {
            "index": "coaching_centres",
            "id": "center-uuid",
            "score": 0.95,
            "source": {
              "id": "center-uuid",
              "name": "Elite Cricket Academy",
              "description": "Best cricket coaching in Delhi",
              "address": "123 Main Street",
              "latitude": 28.6139,
              "longitude": 77.2090,
              "logo": "https://...",
              "images": ["https://image1.jpg", "https://image2.jpg"],
              "sports_names": ["Cricket"],
              "distance": 2.5
            },
            "highlight": {
              "name": "<em>Cricket</em> Academy",
              "description": "Best <em>cricket</em> coaching..."
            }
          }
        ],
        "total": 20,
        "has_more": true
      },
      "sports": {
        "results": [...],
        "total": 1,
        "has_more": false
      }
    },
    "results": [...],
    "took": 12
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `query.text` | string | The search query used |
| `query.indices` | array | List of indices searched |
| `pagination.total` | integer | Total results on current page |
| `pagination.total_available` | integer | Total results available |
| `pagination.size` | integer | Results per page |
| `pagination.from` | integer | Current offset |
| `pagination.has_more` | boolean | Whether more results available |
| `results_by_index` | object | Results grouped by index type |
| `results_by_index[type].results` | array | Results for this index type |
| `results_by_index[type].total` | integer | Total results for this type |
| `results_by_index[type].has_more` | boolean | More results available for this type |
| `results` | array | Flattened results from all indices |
| `results[].index` | string | Index type (coaching_centres, sports, etc.) |
| `results[].id` | string | Document ID |
| `results[].score` | number | Relevance score (0-1) |
| `results[].source` | object | Full document data |
| `results[].highlight` | object | Highlighted search matches |
| `took` | integer | Processing time in milliseconds |

### Frontend Implementation Example

#### React/Next.js Example

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface SearchResult {
  index: string;
  id: string;
  score: number;
  source: {
    id: string;
    name: string;
    description?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    logo?: string;
    images?: string[]; // Maximum 2 images (prioritized by is_banner)
    sports_names?: string[];
    distance?: number;
    thumbnail?: string;
    video_url?: string;
    views?: number;
    sport_specific_data?: any;
  };
  highlight: Record<string, string>;
}

interface SearchResponse {
  success: boolean;
  message: string;
  data: {
    query: {
      text: string;
      indices: string[];
    };
    pagination: {
      total: number;
      total_available: number;
      size: number;
      from: number;
      has_more: boolean;
    };
    results_by_index: Record<string, {
      results: SearchResult[];
      total: number;
      has_more: boolean;
    }>;
    results: SearchResult[];
    took: number;
  };
}

const useSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultsByIndex, setResultsByIndex] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    total_available: 0,
    size: 10,
    from: 0,
    has_more: false,
  });

  const search = async (
    query: string,
    options: {
      size?: number;
      from?: number;
      latitude?: number;
      longitude?: number;
      radius?: number;
      index?: string;
    } = {}
  ) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        size: (options.size || 10).toString(),
        from: (options.from || 0).toString(),
      });

      if (options.latitude && options.longitude) {
        params.append('latitude', options.latitude.toString());
        params.append('longitude', options.longitude.toString());
        params.append('radius', (options.radius || 50).toString());
      }

      if (options.index) {
        params.append('index', options.index);
      }

      const response = await axios.get<SearchResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/search`,
        { params }
      );

      if (response.data.success) {
        setResults(response.data.data.results);
        setResultsByIndex(response.data.data.results_by_index);
        setPagination(response.data.data.pagination);
      } else {
        setError('Search failed');
      }
    } catch (err) {
      setError('Failed to fetch search results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return { results, resultsByIndex, pagination, loading, error, search };
};

// Usage in component
const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const { results, resultsByIndex, pagination, loading, search } = useSearch();

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      );
    }
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) {
      search(query, {
        size: 10,
        from: page * 10,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
        radius: 50,
      });
    }
  }, [query, page, userLocation]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
        placeholder="Search..."
      />

      {loading && <div>Loading...</div>}

      {results.length > 0 && (
        <>
          <div>Found {pagination.total_available} results</div>
          
          {/* Group by type */}
          {Object.entries(resultsByIndex).map(([type, data]: [string, any]) => (
            <div key={type}>
              <h3>{type.replace('_', ' ').toUpperCase()} ({data.total})</h3>
              {data.results.map((result: SearchResult) => (
                <div key={result.id}>
                  <h4>{result.source.name}</h4>
                  {result.source.description && (
                    <p dangerouslySetInnerHTML={{ __html: result.highlight.description || result.source.description }} />
                  )}
                  {result.source.distance && (
                    <span>{result.source.distance.toFixed(1)} km away</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Pagination */}
          {pagination.has_more && (
            <button onClick={() => setPage(page + 1)}>Load More</button>
          )}
        </>
      )}
    </div>
  );
};
```

---

## Result Types

### 1. Sport Results

```typescript
{
  index: "sports",
  id: "sport-uuid",
  source: {
    id: "sport-uuid",
    name: "Cricket",
    sport_id: "sport-uuid",
    sport_name: "Cricket",
    sport_logo: "https://...",
    description: "Cricket sport description",
    images: [],
    videos: [],
    is_active: true,
    is_popular: true,
    sport_specific_data: {
      sport_id: "sport-uuid",
      sport_name: "Cricket",
      sport_logo: "https://...",
      description: "...",
      images: [],
      videos: [],
      has_sport_bio: true
    }
  }
}
```

### 2. Coaching Center Results

```typescript
{
  index: "coaching_centres",
  id: "center-uuid",
  source: {
    id: "center-uuid",
    name: "Elite Cricket Academy",
    description: "Best cricket coaching...",
    address: "123 Main Street",
    latitude: 28.6139,
    longitude: 77.2090,
    logo: "https://...",
    images: ["https://image1.jpg", "https://image2.jpg"], // Maximum 2 images (prioritized by is_banner=true)
    sports_names: ["Cricket", "Football"],
    distance: 2.5, // km (if location provided)
    experience: 10,
    pincode: "110001"
  }
}
```

### 3. Reel Results

```typescript
{
  index: "reels",
  id: "reel-uuid",
  source: {
    id: "reel-uuid",
    name: "Cricket Highlights",
    title: "Cricket Highlights",
    description: "Amazing cricket moments",
    thumbnail: "https://...",
    video_url: "https://...",
    views: 1500,
    views_count: 1500,
    likes: 120,
    likes_count: 120,
    comments: 45,
    comments_count: 45
  }
}
```

### 4. Stream Highlight Results

```typescript
{
  index: "live_streams",
  id: "highlight-uuid",
  source: {
    id: "highlight-uuid",
    name: "Live Match Highlights",
    title: "Live Match Highlights",
    description: "Highlights from live match",
    thumbnail: "https://...",
    video_url: "https://...",
    stream_key: "stream-session-id",
    views: 2000,
    views_count: 2000,
    likes: 150,
    likes_count: 150,
    comments: 60,
    comments_count: 60,
    duration: 300 // seconds
  }
}
```

---

## Best Practices

### 1. Debouncing

Always debounce autocomplete requests to avoid excessive API calls:

```javascript
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const debouncedSearch = debounce((query) => {
  // Make API call
}, 300);
```

### 2. Minimum Query Length

Don't search for queries shorter than 2-3 characters:

```javascript
if (query.trim().length < 2) {
  return; // Don't search
}
```

### 3. Error Handling

Always handle errors gracefully:

```javascript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Search failed');
  }
  const data = await response.json();
  // Handle success
} catch (error) {
  // Show user-friendly error message
  console.error('Search error:', error);
}
```

### 4. Loading States

Show loading indicators during search:

```javascript
const [loading, setLoading] = useState(false);

// Before API call
setLoading(true);

// After API call
setLoading(false);
```

### 5. Caching

Consider caching recent search results:

```javascript
const searchCache = new Map();

const search = async (query) => {
  if (searchCache.has(query)) {
    return searchCache.get(query);
  }
  
  const results = await fetchSearchResults(query);
  searchCache.set(query, results);
  return results;
};
```

### 6. Location Handling

Request location permission gracefully:

```javascript
const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        // User denied or error occurred
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};
```

---

## Source Fields Reference

### Coaching Center Source Fields

The `source` object for coaching centers contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique coaching center ID |
| `name` | string | Coaching center name |
| `description` | string \| null | Description/bio |
| `address` | string \| null | Full address |
| `latitude` | number \| null | Latitude coordinate |
| `longitude` | number \| null | Longitude coordinate |
| `logo` | string \| null | Logo URL |
| `images` | string[] | **Maximum 2 image URLs** (prioritized by `is_banner=true`) |
| `allowed_gender` | string[] | Allowed genders (e.g., ["male", "female"]) |
| `sports_names` | string[] | List of sport names |
| `location_name` | string \| null | Location name |
| `experience` | number \| null | Years of experience |
| `pincode` | string \| null | Pincode |
| `distance` | number \| null | Distance in km (if location provided) |

**Note:** The following fields are **NOT included** in the response:
- `city`, `city_id`, `state`, `state_id`, `state_name`
- `facilities`, `facility_ids`
- `rating`, `review_count`
- `sports`, `sports_ids` (only `sports_names` is included)

### Image Handling

- Images are limited to **maximum 2** per coaching center
- Images with `is_banner: true` are prioritized and appear first
- Only active, non-deleted images are included
- Images are returned as URL strings (not full objects)

---

## Response Handling

### Highlighted Text

The API returns HTML-highlighted text in the `highlight` field. Render it safely:

```javascript
// React
<div dangerouslySetInnerHTML={{ __html: result.highlight.name || result.name }} />

// Vue
<div v-html="result.highlight.name || result.name"></div>

// Angular
<div [innerHTML]="result.highlight?.name || result.name"></div>
```

### Distance Display

For coaching centers, show distance if available:

```javascript
{result.source.distance && (
  <span>{result.source.distance.toFixed(1)} km away</span>
)}
```

### Result Grouping

Group results by type for better UX:

```javascript
const groupedResults = results.reduce((acc, result) => {
  const type = result.index;
  if (!acc[type]) {
    acc[type] = [];
  }
  acc[type].push(result);
  return acc;
}, {});
```

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Query parameter \"q\" or \"query\" is required"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

### 503 Service Unavailable

```json
{
  "success": false,
  "message": "Meilisearch is not enabled"
}
```

**Note:** Even if Meilisearch is disabled (503), the API will automatically fall back to MongoDB search and return results. The 503 status is informational only.

---

## Performance Tips

1. **Use Autocomplete for Real-time Search**: Use autocomplete API for search-as-you-type, full search for results pages
2. **Implement Pagination**: Load results in pages (10-20 items) instead of all at once
3. **Cache Results**: Cache recent searches to reduce API calls
4. **Debounce Input**: Wait 300-500ms after user stops typing before searching
5. **Lazy Load Images**: Load images only when results are visible
6. **Request Location Once**: Cache user location and reuse it

---

## Example Integration Flow

```javascript
// 1. User types in search box
onInputChange(query) {
  // 2. Debounce the input
  debouncedAutocomplete(query);
}

// 3. Autocomplete API call
async function autocomplete(query) {
  const results = await fetch('/api/v1/search/autocomplete?q=' + query);
  // 4. Show suggestions dropdown
  showSuggestions(results);
}

// 5. User selects a suggestion or presses Enter
onSearchSubmit(query) {
  // 6. Navigate to search results page
  navigate('/search?q=' + query);
}

// 7. Search results page loads
async function loadSearchResults(query, page) {
  const results = await fetch(
    `/api/v1/search?q=${query}&size=10&from=${page * 10}`
  );
  // 8. Display results
  displayResults(results);
}
```

---

## Testing

### Test Cases

1. **Empty Query**: Should return empty results
2. **Short Query**: Should not search for queries < 2 characters
3. **No Results**: Should handle "no results found" gracefully
4. **With Location**: Should show distance for coaching centers
5. **Without Location**: Should work normally without distance
6. **Pagination**: Should load next page correctly
7. **Error Handling**: Should show error message on failure

### Example Test

```javascript
describe('Search API', () => {
  it('should return autocomplete results', async () => {
    const response = await fetch(
      '/api/v1/search/autocomplete?q=cricket&size=5'
    );
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.results).toBeInstanceOf(Array);
  });

  it('should handle empty query', async () => {
    const response = await fetch('/api/v1/search/autocomplete?q=');
    const data = await response.json();
    
    expect(data.data.total).toBe(0);
    expect(data.data.results).toEqual([]);
  });
});
```

---

## Support

For issues or questions:
- Check API documentation: `/api-docs`
- Review error messages in response
- Check server logs for detailed errors
- Contact API support team

---

## Important Notes

### Image Limiting
- **Images are limited to maximum 2 per coaching center**
- Images are **prioritized by `is_banner=true`** (banner images appear first)
- Only active, non-deleted images are included
- Images are returned as URL strings (not full objects)

### Removed Fields
The following fields are **NOT included** in search results to reduce response size:
- `city`, `city_id`, `state`, `state_id`, `state_name`
- `facilities`, `facility_ids`
- `rating`, `review_count`
- `sports`, `sports_ids` (only `sports_names` is included)

---

## Changelog

### Version 1.1.0
- **Image optimization**: Limited to 2 images per coaching center, prioritized by `is_banner`
- **Response optimization**: Removed unnecessary fields (city, state, facilities, rating, sports_ids)
- **Performance improvements**: Reduced response payload size

### Version 1.0.0
- Initial release
- Autocomplete API
- Full Search API
- MongoDB fallback support
- Geo-based sorting
- Sport-based prioritization
