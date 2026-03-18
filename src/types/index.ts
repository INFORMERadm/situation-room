export interface SportScore {
  league: string;
  matchup: string;
  status: string;
  score: string;
}

export interface Forecast {
  platform: string;
  question: string;
  odds: number;
}

export interface Flight {
  callsign: string;
  origin: string;
  altitude: string;
  lat: number;
  lon: number;
}

export type MarketCategory = 'index' | 'stock' | 'forex' | 'crypto' | 'commodity' | 'custom';

export interface MarketItem {
  symbol: string;
  price: number;
  change: number;
  category: MarketCategory;
  name?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface QuoteDetail {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  open: number;
  previousClose: number;
}

export interface NewsItem {
  source: string;
  headline: string;
}

export interface LogisticsItem {
  name: string;
  location: string;
  status: string;
  lat: number;
  lon: number;
}

export interface PizzaData {
  index: number;
  doughcon: number;
  statusText: string;
  hourlyData: number[];
}

export interface MapMarker {
  lat: number;
  lon: number;
  type: 'flight' | 'event';
  label?: string;
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  description: string;
  ceo: string;
  fullTimeEmployees: number;
  mktCap: number;
  beta: number;
  website: string;
  image: string;
  exchange: string;
  currency: string;
  country: string;
  price: number;
  changes: number;
  range: string;
  volAvg: number;
  dcfDiff: number;
  dcf: number;
  ipoDate: string;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

export interface SectorPerf {
  sector: string;
  changesPercentage: string;
}

export interface EarningsEvent {
  symbol: string;
  date: string;
  epsEstimated: number | null;
  eps: number | null;
  revenueEstimated: number | null;
  revenue: number | null;
}

export interface EconomicEvent {
  event: string;
  date: string;
  country: string;
  impact: string;
  previous: number | null;
  estimate: number | null;
  actual: number | null;
}

export interface MarketNewsItem {
  title: string;
  site: string;
  url: string;
  publishedDate: string;
  symbol: string;
  image: string;
}

export interface SearchSource {
  index: number;
  title: string;
  url: string;
  domain: string;
  favicon: string;
  snippet: string;
  relevanceScore: number;
}

export interface SearchImage {
  title: string;
  imageUrl: string;
  link: string;
}

export interface SearchSourcesPayload {
  sources: SearchSource[];
  images: SearchImage[];
}

export interface SearchProgress {
  stage: string;
  count?: number;
  completed?: number;
}

export interface LiveFlightPosition {
  flightId: string;
  callsign: string;
  registration: string;
  aircraftType: string;
  airlineName: string;
  airlineIcao: string;
  latitude: number;
  longitude: number;
  altitude: number;
  groundSpeed: number;
  heading: number;
  verticalSpeed: number;
  originIata: string;
  originName: string;
  destinationIata: string;
  destinationName: string;
  flightNumber: string;
  squawk: string;
  isOnGround: boolean;
  timestamp: number;
}

export interface AirportInfo {
  name: string;
  iata: string;
  icao: string;
  city: string;
  country: string;
  timezone: string;
  timezoneOffset: number;
  lat: number;
  lon: number;
}

export interface FlightDetail {
  flightId: string;
  callsign: string;
  flightNumber: string;
  registration: string;
  aircraftType: string;
  operatingAs: string;
  paintedAs: string;
  originIata: string;
  originIcao: string;
  originName: string;
  originCity: string;
  originCountry: string;
  originTimezone: string;
  destinationIata: string;
  destinationIcao: string;
  destinationName: string;
  destinationCity: string;
  destinationCountry: string;
  destinationTimezone: string;
  departureTime: string;
  arrivalTime: string;
  flightTime: number | null;
  actualDistance: number | null;
  circleDistance: number | null;
  category: string;
  status: string;
  origin: AirportInfo | null;
  destination: AirportInfo | null;
}

export interface OpenSkyFlight {
  icao24: string;
  firstSeen: number;
  lastSeen: number;
  estDepartureAirport: string | null;
  estArrivalAirport: string | null;
  callsign: string | null;
  estDepartureAirportHorizDistance: number;
  estDepartureAirportVertDistance: number;
  estArrivalAirportHorizDistance: number;
  estArrivalAirportVertDistance: number;
  departureAirportCandidatesCount: number;
  arrivalAirportCandidatesCount: number;
  departureAirportName?: string;
  departureCity?: string;
  departureIata?: string;
  arrivalAirportName?: string;
  arrivalCity?: string;
  arrivalIata?: string;
}

export type TrackWaypoint = [
  time: number,
  latitude: number | null,
  longitude: number | null,
  baro_altitude: number | null,
  true_track: number | null,
  on_ground: boolean,
];

export interface AircraftTrack {
  icao24: string;
  startTime: number;
  endTime: number;
  callsign: string | null;
  path: TrackWaypoint[];
}

export type FlightSearchMode =
  | 'flights-interval'
  | 'flights-aircraft'
  | 'arrivals-airport'
  | 'departures-airport'
  | 'track-aircraft';

export type BaseType = 'air_base' | 'naval_base' | 'missile_defense' | 'radar' | 'command_center' | 'mixed';

export interface MilitaryBase {
  id: string;
  name: string;
  country: string;
  operator: string;
  base_type: BaseType;
  latitude: number;
  longitude: number;
  description: string;
  equipment: Array<{ type: string; category: string; quantity: number }>;
  is_active: boolean;
  source_url: string;
}

export type NavalAssetType = 'carrier' | 'destroyer' | 'cruiser' | 'frigate' | 'submarine' | 'amphibious' | 'support' | 'patrol' | 'corvette';

export interface MilitaryNavalAsset {
  id: string;
  name: string;
  asset_type: NavalAssetType;
  operator: string;
  hull_number: string;
  class_name: string;
  latitude: number;
  longitude: number;
  heading: number;
  region: string;
  status: string;
  last_reported_date: string;
  source_description: string;
  source_url: string;
}

export interface MaritimeZone {
  id: string;
  zone_name: string;
  description: string;
  bbox_south: number;
  bbox_west: number;
  bbox_north: number;
  bbox_east: number;
  is_active: boolean;
}

export interface StrikeEvent {
  id: string;
  event_type: string;
  source_country: string;
  source_label: string;
  source_lat: number;
  source_lng: number;
  target_label: string;
  target_lat: number;
  target_lng: number;
  projectile_count: number;
  estimated_flight_time_seconds: number;
  weapon_name: string;
  headline: string;
  confidence: number;
  status: string;
  detected_at: string;
  expires_at: string;
  created_at: string;
}

export type InfrastructureType =
  | 'airport'
  | 'port'
  | 'highway'
  | 'electricity'
  | 'nuclear'
  | 'government'
  | 'military_intel'
  | 'pipeline'
  | 'refinery'
  | 'undersea_cable'
  | 'water'
  | 'telecom'
  | 'other';

export type InfrastructureStatus = 'intact' | 'damaged' | 'destroyed' | 'unknown';

export interface CriticalInfrastructure {
  id: string;
  name: string;
  country: string;
  region: string;
  infra_type: InfrastructureType;
  status: InfrastructureStatus;
  latitude: number;
  longitude: number;
  route_coordinates: [number, number][] | null;
  description: string;
  last_incident_date: string;
  incident_notes: string;
  source_url: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type MapLayerName = 'flights' | 'military-bases' | 'naval-assets' | 'strike-events' | 'critical-infrastructure';
