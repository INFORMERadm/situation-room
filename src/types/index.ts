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

export interface MarketItem {
  symbol: string;
  price: number;
  change: number;
  isCrypto: boolean;
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
