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

export type MarketCategory = 'index' | 'stock' | 'forex' | 'crypto';

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
  type: 'flight' | 'shipping' | 'event';
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
}
