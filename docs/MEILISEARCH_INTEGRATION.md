# Meilisearch Integration Guide

This document describes the Meilisearch integration for the Coaching Center Panel Node.js APIs.

## Overview

Meilisearch is a fast, typo-tolerant search engine that provides full-text search capabilities across multiple indices:
- **Sports** (`sports_index`)
- **Coaching Centers** (`coaching_centres_index`)
- **Reels** (`reels_index`)
- **Live Streams/Highlights** (`live_streams_index`)

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Meilisearch Configuration
MEILISEARCH_ENABLED=true                    # Enable/disable Meilisearch indexing (default: false)
MEILISEARCH_HOST=http://localhost:7700      # Meilisearch server URL
MEILISEARCH_KEY=DevLOpemNTmasterKey123     # Meilisearch API key
MEILISEARCH_INDEXING_CONCURRENCY=5        # Number of indexing jobs to process concurrently (default: 5)
```

### Configuration Options

- **MEILISEARCH_ENABLED**: Set to `true` to enable Meilisearch indexing and search. When `false`, all indexing operations are skipped and search APIs return errors.
- **MEILISEARCH_HOST**: The URL of your Meilisearch server (default: `http://localhost:7700`)
- **MEILISEARCH_KEY**: The API key for authenticating with Meilisearch
- **MEILISEARCH_INDEXING_CONCURRENCY**: Number of indexing jobs to process concurrently (default: 5). Increase for higher throughput, decrease if Meilisearch server is overloaded.

## Setup

### 1. Install Meilisearch

You can run Meilisearch using Docker:

```bash
docker run -d \
  -p 7700:7700 \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:latest \
  meilisearch --master-key="DevLOpemNTmasterKey123"
```

Or install it locally following the [official documentation](https://www.meilisearch.com/docs/learn/getting_started/installation).

### 2. Configure Environment Variables

Add the Meilisearch configuration to your `.env` file as shown above.

### 3. Configure Indices

Run the configuration script to set up searchable attributes, filterable attributes, and sortable attributes:

```bash
npm run meilisearch:configure
```

### 4. Index Existing Data

After configuring, index all existing data:

```bash
# Index all data
npm run meilisearch:index-all

# Or index specific types
npm run meilisearch:index-coaching-centers
npm run meilisearch:index-sports
npm run meilisearch:index-reels
npm run meilisearch:index-highlights
```

## Automatic Indexing

The system automatically indexes documents when they are created, updated, or deleted using a **BullMQ queue system**:

- **Coaching Centers**: Indexed when created/updated/deleted (only approved and active centers are indexed)
- **Sports**: Indexed when created/updated/deleted (only active sports are indexed)
- **Reels**: Indexed when created/updated/deleted (only published reels are indexed)
- **Stream Highlights**: Indexed when created/updated/deleted (only published highlights are indexed)

### Queue-Based Indexing

Indexing is handled by a dedicated BullMQ queue (`meilisearch-indexing`) that:
- **Non-blocking**: All indexing operations are queued and processed asynchronously
- **Retry mechanism**: Failed jobs are automatically retried up to 3 times with exponential backoff
- **Concurrency control**: Process multiple indexing jobs concurrently (default: 5, configurable via `MEILISEARCH_INDEXING_CONCURRENCY`)
- **Rate limiting**: Maximum 100 jobs per second
- **Job deduplication**: Uses unique job IDs to prevent duplicate indexing

The queue system ensures that:
- API requests are not blocked by indexing operations
- Failed indexing attempts are automatically retried
- High throughput with controlled concurrency
- Jobs are persisted in Redis for reliability

## Search APIs

### 1. Autocomplete API

**Endpoint**: `GET /api/v1/search/autocomplete`

**Query Parameters**:
- `q` (required): Search query string
- `size` (optional): Number of results per index (default: 5)
- `index` (optional): Specific index to search (default: all indices)
- `latitude` (optional): User's latitude for geo-based sorting
- `longitude` (optional): User's longitude for geo-based sorting
- `radius` (optional): Search radius in km (default: 50)

**Example**:
```bash
GET /api/v1/search/autocomplete?q=cricket&size=5&latitude=28.6139&longitude=77.2090&radius=50
```

**Response**:
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
        "id": "sport-id",
        "name": "Cricket",
        "type": "sport",
        "priority": 1,
        "highlight": "<em class=\"text-orange-600\">Cricket</em>"
      },
      {
        "index": "coaching_centres_index",
        "id": "center-id",
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

### 2. Full Search API

**Endpoint**: `GET /api/v1/search`

**Query Parameters**:
- `q` or `query` (required): Search query string
- `size` (optional): Number of results per page (default: 10)
- `from` (optional): Pagination offset (default: 0)
- `index` (optional): Specific index to search (default: all indices)
- `latitude` (optional): User's latitude for geo-based sorting
- `longitude` (optional): User's longitude for geo-based sorting
- `radius` (optional): Search radius in km (default: 50)

**Example**:
```bash
GET /api/v1/search?q=cricket&size=10&from=0&latitude=28.6139&longitude=77.2090&radius=50
```

**Response**:
```json
{
  "success": true,
  "message": "Search results",
  "data": {
    "query": {
      "text": "cricket",
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
        "results": [...],
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

## Features

### 1. Typo Tolerance

Meilisearch automatically handles typos and provides relevant results even with spelling mistakes.

### 2. Geo-based Search

For coaching centers, you can provide `latitude` and `longitude` to get results sorted by distance. Results are prioritized by:
1. Sport matches (if query matches a sport offered by the center)
2. Distance (nearest first)

### 3. Highlighting

Search results include highlighted matches in the `highlight` field, showing which parts of the text matched the query.

### 4. Multi-index Search

By default, the search APIs search across all indices simultaneously and return aggregated results.

## Manual Indexing Commands

### Configure Indices
```bash
npm run meilisearch:configure
```

### Index All Data
```bash
npm run meilisearch:index-all
```

### Index Specific Types
```bash
npm run meilisearch:index-coaching-centers
npm run meilisearch:index-sports
npm run meilisearch:index-reels
npm run meilisearch:index-highlights
```

## Index Configuration

Each index is configured with:

### Coaching Centres Index
- **Searchable Attributes**: name, coaching_name, description, bio, address, city, city_name, state, state_name, sports_names, facilities
- **Filterable Attributes**: is_active, is_admin_approve, approval_status, city_id, state_id, sports_ids, facility_ids
- **Sortable Attributes**: rating, review_count, created_at, updated_at
- **Geo Search**: Supported via `_geo` field

### Sports Index
- **Searchable Attributes**: name, title, description, bio
- **Filterable Attributes**: is_active, is_popular
- **Sortable Attributes**: name, created_at, updated_at

### Reels Index
- **Searchable Attributes**: name, title, description
- **Filterable Attributes**: status
- **Sortable Attributes**: views, views_count, likes, likes_count, created_at, updated_at

### Live Streams Index
- **Searchable Attributes**: name, title, description
- **Filterable Attributes**: status
- **Sortable Attributes**: views, views_count, likes, likes_count, created_at, updated_at

## Best Practices

1. **Enable/Disable via Environment Variable**: Use `MEILISEARCH_ENABLED` to control indexing without code changes.

2. **Regular Re-indexing**: Run `npm run meilisearch:index-all` periodically to ensure data consistency, especially after bulk updates.

3. **Monitor Performance**: Check Meilisearch logs and API response times to ensure optimal performance.

4. **Error Handling**: The system gracefully handles Meilisearch failures - if indexing fails, it logs the error but doesn't block the main operation.

5. **Production Setup**: 
   - Use a dedicated Meilisearch instance for production
   - Set up proper authentication with a strong API key
   - Configure proper backup and monitoring
   - Use environment-specific configurations

## Troubleshooting

### Meilisearch Not Responding
- Check if Meilisearch server is running: `curl http://localhost:7700/health`
- Verify `MEILISEARCH_HOST` and `MEILISEARCH_KEY` in your `.env` file

### Documents Not Appearing in Search
- Check if `MEILISEARCH_ENABLED` is set to `true`
- Verify documents meet indexing criteria (e.g., approved status for coaching centers)
- Run manual indexing: `npm run meilisearch:index-all`

### Search Results Not Accurate
- Re-configure indices: `npm run meilisearch:configure`
- Check if searchable attributes are properly configured
- Verify data quality in MongoDB

## Architecture

The Meilisearch integration consists of:

1. **Client Service** (`src/services/meilisearch/meilisearch.client.ts`): Manages Meilisearch client connection
2. **Indexing Service** (`src/services/meilisearch/indexing.service.ts`): Handles all indexing operations
3. **Search Controller** (`src/controllers/search.controller.ts`): Implements search APIs
4. **Model Hooks**: Automatic indexing on create/update/delete operations

All indexing operations are non-blocking and run asynchronously to avoid impacting API response times.
