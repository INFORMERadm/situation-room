# Flight Radar Edge Function - Technical Reference

Last updated: 2026-04-13

## Overview

The `flight-radar` edge function is the backend for Datadesk's global flight tracking map. It fetches live aircraft positions from two data sources (FlightRadar24 as primary, OpenSky Network as fallback), deduplicates them, and serves them to the frontend with a multi-tier caching strategy.

**Deployed at:** `supabase/functions/flight-radar/index.ts`
**Invoked via:** `GET /functions/v1/flight-radar?feed=<feed-type>`

---

## Environment Variables (Edge Function Secrets)

| Variable | Purpose |
|---|---|
| `FR24_API_TOKEN` | FlightRadar24 API bearer token (primary data source) |
| `OPENSKY_CLIENT_ID` | OpenSky Network OAuth2 client ID (fallback source) |
| `OPENSKY_CLIENT_SECRET` | OpenSky Network OAuth2 client secret |
| `SUPABASE_URL` | Auto-provided by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase |

---

## Data Sources

### FlightRadar24 (Primary)

- **API Base:** `https://fr24api.flightradar24.com/api`
- **Endpoint:** `/live/flight-positions/full`
- **Auth:** Bearer token via `FR24_API_TOKEN`
- **Headers:** `Accept: application/json`, `Accept-Version: v1`
- **Returns:** Rich flight data including airline, registration, origin/destination, aircraft type

### OpenSky Network (Fallback)

- **API Base:** `https://opensky-network.org/api`
- **Endpoint:** `/states/all` (live positions), `/flights/aircraft` (route history), `/tracks/all` (flight track)
- **Auth:** OAuth2 client credentials flow (token cached in memory, refreshes before expiry)
- **Token URL:** `https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token`
- **Returns:** State vectors (position, altitude, speed, heading, etc.) -- less rich than FR24

---

## Region Subdivision Strategy (FR24)

The FR24 API caps results at **1500 flights per request**. To get full global coverage, the world is divided into **24 sub-zones**. Each zone is queried in parallel (batches of 8) and results are deduplicated by `icao24` or `callsign`.

If a zone returns exactly 1500 results (meaning it hit the cap), the function will **paginate** up to 5 pages to capture all flights in that zone.

### Current FR24 Region Bounds

Format: `"north_lat,south_lat,west_lon,east_lon"`

| Region Name | Bounds |
|---|---|
| NA-West | `72,35,-170,-110` |
| NA-Central | `72,35,-110,-80` |
| NA-East | `72,35,-80,-50` |
| NA-South | `35,15,-170,-50` |
| EU-NorthWest | `72,50,-15,10` |
| EU-NorthEast | `72,50,10,45` |
| EU-SouthWest | `50,35,-15,10` |
| EU-SouthEast | `50,35,10,45` |
| ME-West | `45,25,25,50` |
| ME-East | `45,10,50,75` |
| SA-India | `35,10,65,90` |
| EA-China | `55,25,75,120` |
| EA-Japan-Korea | `55,25,120,150` |
| SEA | `25,0,90,130` |
| SA-North | `15,-20,-90,-30` |
| SA-South | `-20,-60,-90,-30` |
| AF-North | `38,5,-20,55` |
| AF-South | `5,-40,-20,55` |
| Oceania | `5,-50,100,180` |
| CentralAsia-Russia | `72,45,45,120` |
| Atlantic | `60,10,-50,-15` |
| Pacific-East | `60,10,150,180` |
| Pacific-West | `60,10,-180,-170` |
| Caribbean | `30,10,-100,-55` |

### OpenSky Fallback Regions

Used only when FR24 returns fewer than 500 flights. 7 large regions queried in parallel:

| Region | lamin | lamax | lomin | lomax |
|---|---|---|---|---|
| North America | 15 | 72 | -170 | -50 |
| Europe | 35 | 72 | -15 | 45 |
| Middle East & Central Asia | 10 | 45 | 25 | 75 |
| East Asia | 10 | 55 | 75 | 150 |
| South America | -60 | 15 | -90 | -30 |
| Africa | -40 | 38 | -20 | 55 |
| Oceania | -50 | 5 | 100 | 180 |

---

## Feeds / API Endpoints

All endpoints accept `GET` requests with query parameters.

### `feed=live-flights`

Returns all currently airborne flights globally.

**Response:**
```json
{
  "flights": [...],
  "cached": true,     // if served from fresh cache
  "stale": true       // if served from stale cache
}
```

**Data flow:**
1. Check in-memory cache (120s TTL)
2. Check DB cache in `live_flights_cache` table (120s TTL)
3. If DB cache exists but is stale (< 15 min), serve it and trigger background refresh via `EdgeRuntime.waitUntil`
4. If no cache or too old, fetch fresh data with a 25s deadline
5. If deadline exceeded, push fetch to background and serve whatever cache is available

### `feed=flight-details`

Returns enriched detail for a single flight.

**Params:** `flightId` (icao24 hex), `callsign` (optional)

**Data flow:**
1. Check `flight_details_cache` table (10 min TTL)
2. If miss, query OpenSky `/flights/aircraft` for route history
3. Enrich with airline/airport lookups from built-in dictionaries
4. Cache result in background

### `feed=flights-in-interval`

Returns all flights within a time range. **Params:** `begin`, `end` (unix timestamps). Max interval: 2 hours.

### `feed=flights-by-aircraft`

Returns flight history for a specific aircraft. **Params:** `icao24`, `begin`, `end`. Max interval: 2 days.

### `feed=arrivals-by-airport`

Returns arrivals at an airport. **Params:** `airport` (ICAO code), `begin`, `end`. Max interval: 7 days.

### `feed=departures-by-airport`

Returns departures from an airport. **Params:** `airport` (ICAO code), `begin`, `end`. Max interval: 7 days.

### `feed=track-by-aircraft`

Returns the flight track (path waypoints) for an aircraft. **Params:** `icao24`, `time` (optional).

---

## Caching Architecture

### In-Memory Cache (Edge Function Instance)

- **Variable:** `cachedFlights` / `cachedFlightsAt`
- **TTL:** 120 seconds (`LIVE_FLIGHTS_CACHE_TTL_MS`)
- **Scope:** Per edge function instance (lost on cold start)

### Database Cache (`live_flights_cache` table)

- **Pattern:** Single-row table (id=1), upserted on each successful fetch
- **Columns:** `flights_data` (jsonb), `flight_count` (int), `fetched_at` (timestamptz), `rate_limited_until` (timestamptz)
- **Fresh TTL:** 120 seconds (same as in-memory)
- **Stale TTL:** 15 minutes (`LIVE_FLIGHTS_STALE_TTL_MS`) -- serves stale data while refreshing in background

### Flight Detail Cache (`flight_details_cache` table)

- **Key:** `callsign` (primary key)
- **TTL:** 10 minutes (`CACHE_TTL_MS`)
- **Indexes:** `cached_at` (for cleanup), `icao24` (for lookups)

---

## Rate Limiting Protection

The function tracks rate limiting from both FR24 and OpenSky:

- **In-memory flag:** `rateLimitedUntil` timestamp
- **DB-persisted flag:** `rate_limited_until` column on `live_flights_cache`
- **Default cooldown:** 5 minutes (`DEFAULT_RATE_LIMIT_COOLDOWN_MS`)
- **Trigger:** HTTP 429 response from OpenSky sets cooldown (uses `Retry-After` header if provided)
- **Check flow:** Before any fetch, checks both in-memory flag and DB flag (to share state across instances)

---

## Source Priority Logic (`fetchLiveFlights`)

```
1. Fetch FR24 (24 sub-zones, batched 8 at a time)
2. If FR24 returns > 500 flights -> use FR24 only
3. If FR24 returns <= 500 flights -> also fetch OpenSky
4. Merge results, FR24 takes priority (added first to dedup set)
5. Deduplication key: icao24 || callsign
```

---

## Flight Data Shape (Normalized)

Each flight object returned by the edge function:

```typescript
{
  icao24: string;           // ICAO 24-bit hex address (or FR24 ID)
  callsign: string;         // Flight callsign (e.g., "UAL123")
  origin_country: string;   // Country of origin (OpenSky only)
  lat: number;              // Latitude
  lon: number;              // Longitude
  alt: number;              // Altitude in meters
  gspd: number;             // Ground speed in m/s
  track: number;            // True track (heading) in degrees
  vspd: number;             // Vertical speed in m/s
  on_ground: boolean;       // Whether aircraft is on ground
  squawk: string;           // Transponder squawk code
  geo_alt: number;          // Geometric altitude
  baro_alt: number;         // Barometric altitude
  last_contact: number;     // Unix timestamp of last contact
  category: number;         // Aircraft category (OpenSky)
  registration: string;     // Aircraft registration (FR24 only)
  aircraft_type: string;    // Aircraft type code (FR24 only)
  orig_iata: string;        // Origin airport IATA (FR24 only)
  orig_icao: string;        // Origin airport ICAO (FR24 only)
  dest_iata: string;        // Destination airport IATA (FR24 only)
  dest_icao: string;        // Destination airport ICAO (FR24 only)
  operating_as: string;     // Operating airline code (FR24 only)
  painted_as: string;       // Painted-as airline code (FR24 only)
}
```

---

## Frontend Integration

### Hook: `src/hooks/useFlightsDashboard.ts`

- Polls `fetchLiveFlights()` every 120 seconds
- On failure, uses exponential backoff (up to 300s)
- Normalizes raw data into `LiveFlightPosition` type for the map
- Does not clear existing flights on error (keeps showing last good data)

### API Call: `src/lib/api.ts` -> `fetchLiveFlights()`

- Calls edge function at `${SUPABASE_URL}/functions/v1/flight-radar?feed=live-flights`
- Uses retry with 90s timeout, 1 retry, 1.5s delay
- Auth header: `Bearer ${SUPABASE_ANON_KEY}`

### Map Rendering: `src/components/flights/FlightMap.tsx`

- Uses Leaflet / react-leaflet
- Renders aircraft markers with heading-based rotation
- Click to select -> shows detail panel

---

## Built-in Reference Data

The edge function contains embedded lookup dictionaries (no external DB calls needed):

- **AIRLINES:** ~75 airline ICAO codes mapped to names (e.g., `UAL -> "United Airlines"`)
- **AIRPORTS:** ~90 major airports with ICAO code, name, city, country, IATA code

These are used for enriching flight detail responses and are defined as constants at the top of the function.

---

## Database Tables

### `live_flights_cache`

| Column | Type | Description |
|---|---|---|
| id | integer (PK) | Always 1 (single-row pattern) |
| flights_data | jsonb | Full array of flight objects |
| flight_count | integer | Number of flights cached |
| fetched_at | timestamptz | When data was fetched |
| rate_limited_until | timestamptz | Rate limit cooldown expiry |
| created_at | timestamptz | Row creation time |

RLS enabled, no user-facing policies (service role only).

### `flight_details_cache`

| Column | Type | Description |
|---|---|---|
| callsign | text (PK) | Aircraft callsign |
| icao24 | text | ICAO hex address |
| fr24_id | text | FR24 flight ID |
| flight | text | IATA flight number |
| aircraft_type | text | ICAO aircraft type code |
| registration | text | Aircraft registration |
| operating_as | text | Operating airline ICAO |
| painted_as | text | Painted-as airline ICAO |
| orig_iata | text | Origin IATA code |
| orig_icao | text | Origin ICAO code |
| dest_iata | text | Destination IATA code |
| dest_icao | text | Destination ICAO code |
| eta | timestamptz | Estimated arrival time |
| data | jsonb | Additional cached data |
| cached_at | timestamptz | When this was cached |

RLS enabled. Authenticated users can SELECT. Service role can INSERT/UPDATE/DELETE.

---

## Troubleshooting

### Not enough flights showing

1. Check FR24 API token is valid and not expired
2. Look at edge function logs for `FR24 [region] error` messages
3. If regions are returning 1500 consistently, consider further subdivision
4. Check if rate limiting is active: look for `rate_limited_until` in `live_flights_cache`

### Flights showing as stale/cached

1. Cache TTL is 120s -- wait for next refresh cycle
2. If stuck on stale for > 15 min, the fetch is likely failing silently
3. Check edge function logs for errors in `fetchLiveFlights`

### 429 Rate Limiting

1. OpenSky rate limits are shared across instances via DB
2. Default cooldown is 5 minutes
3. FR24 does not typically rate limit with valid tokens
4. Check `live_flights_cache.rate_limited_until` in DB

### Missing flight details (airline, route info)

1. FR24 data includes airline/route; OpenSky does not
2. If running on OpenSky fallback, details come from `/flights/aircraft` endpoint
3. Detail cache has 10 min TTL -- stale details are re-fetched
4. Airline/airport lookups only cover ~75 airlines and ~90 airports

### Edge function timeout

1. Response deadline is 25 seconds -- if FR24 takes longer, stale cache is served
2. Each FR24 region request has a 15s timeout
3. OpenSky requests have a 20s timeout (25s for global)
4. Batching 8 regions concurrently prevents overwhelming FR24

### Cold start / no data

1. First request after deploy will have no in-memory cache
2. DB cache persists across cold starts
3. If DB cache is also empty, user sees empty map until first successful fetch
