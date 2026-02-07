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
