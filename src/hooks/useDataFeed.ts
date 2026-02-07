import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SportScore,
  Forecast,
  Flight,
  MarketItem,
  NewsItem,
  LogisticsItem,
  PizzaData,
  MapMarker,
} from '../types';
import { fetchFeed } from '../lib/api';

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function generateSports(): SportScore[] {
  return [
    { league: 'NBA', matchup: 'SA vs CHA', status: 'Final', score: '106-111' },
    { league: 'NBA', matchup: 'ATL vs IND', status: 'Final', score: '124-129' },
    { league: 'NFL', matchup: 'NFC vs AFC', status: '2/3 - 8:00 PM EST', score: '0-0' },
    { league: 'NHL', matchup: 'LA vs PHI', status: 'Final/OT', score: '3-2' },
    { league: 'NHL', matchup: 'COL vs DET', status: 'Final', score: '5-0' },
  ];
}

function generateForecasts(): Forecast[] {
  return [
    { platform: 'Poly', question: 'Fed Rate Cut Q1', odds: 42 },
    { platform: 'Kalshi', question: 'BTC > 100k', odds: 35 },
    { platform: 'Poly', question: 'AI Regulation', odds: 28 },
  ];
}

function generateFlights(): Flight[] {
  return [
    { callsign: 'RCH864', origin: 'United States', altitude: 'FL300', lat: 38.9, lon: -77.0 },
    { callsign: 'AF23', origin: 'China', altitude: 'On Ground', lat: 39.9, lon: 116.4 },
    { callsign: 'SAMU26', origin: 'France', altitude: 'FL17', lat: 48.8, lon: 2.3 },
    { callsign: 'RCH898', origin: 'United States', altitude: 'FL320', lat: 33.4, lon: -112.0 },
    { callsign: 'RCH809', origin: 'United States', altitude: 'FL330', lat: 40.7, lon: -74.0 },
  ];
}

function generateMarkets(): MarketItem[] {
  return [
    { symbol: '^GSPC', price: 5950 + randomBetween(-20, 20), change: 0.4 + randomBetween(-0.5, 0.5), category: 'index', name: 'S&P 500' },
    { symbol: '^IXIC', price: 19200 + randomBetween(-50, 50), change: 0.6 + randomBetween(-0.5, 0.5), category: 'index', name: 'NASDAQ' },
    { symbol: '^DJI', price: 43800 + randomBetween(-100, 100), change: 0.2 + randomBetween(-0.5, 0.5), category: 'index', name: 'Dow Jones' },
    { symbol: 'AAPL', price: 228.5 + randomBetween(-2, 2), change: 1.2 + randomBetween(-1, 1), category: 'stock', name: 'Apple' },
    { symbol: 'MSFT', price: 415.3 + randomBetween(-3, 3), change: 0.8 + randomBetween(-1, 1), category: 'stock', name: 'Microsoft' },
    { symbol: 'NVDA', price: 132.4 + randomBetween(-2, 2), change: -0.5 + randomBetween(-1, 1), category: 'stock', name: 'NVIDIA' },
    { symbol: 'EURUSD', price: 1.0842 + randomBetween(-0.005, 0.005), change: 0.12 + randomBetween(-0.3, 0.3), category: 'forex', name: 'EUR/USD' },
    { symbol: 'GBPUSD', price: 1.2650 + randomBetween(-0.003, 0.003), change: -0.08 + randomBetween(-0.3, 0.3), category: 'forex', name: 'GBP/USD' },
    { symbol: 'USDJPY', price: 154.30 + randomBetween(-0.5, 0.5), change: 0.25 + randomBetween(-0.3, 0.3), category: 'forex', name: 'USD/JPY' },
    { symbol: 'BTCUSD', price: 97500 + randomBetween(-500, 500), change: -2.1 + randomBetween(-1, 1), category: 'crypto', name: 'Bitcoin' },
    { symbol: 'ETHUSD', price: 2650 + randomBetween(-50, 50), change: -3.4 + randomBetween(-1, 1), category: 'crypto', name: 'Ethereum' },
    { symbol: 'SOLUSD', price: 195 + randomBetween(-5, 5), change: -4.2 + randomBetween(-1, 1), category: 'crypto', name: 'Solana' },
  ];
}

function generateNews(): NewsItem[] {
  return [
    { source: 'athens-times', headline: 'Israel Seeks Iran Regime Change with Trump' },
    { source: 'finance', headline: 'Amazon - Backed Anthropic, Pentagon Class' },
    { source: 'economictimes', headline: 'Pentagon Pizza Index: What is the Pentagon...' },
    { source: 'katu', headline: 'Trump keeps Iran strike option on the table' },
    { source: 'fox56', headline: 'Trump keeps Iran strike option on the table' },
  ];
}

function generateLogistics(): LogisticsItem[] {
  return [
    { name: 'Suez Canal', location: 'Egypt', status: 'Open', lat: 30.5, lon: 32.3 },
    { name: 'Panama Canal', location: 'Panama', status: 'Operating', lat: 9.0, lon: -79.5 },
    { name: 'Singapore Port', location: 'Singapore', status: 'Active', lat: 1.3, lon: 103.8 },
  ];
}

function generatePizza(): PizzaData {
  return {
    index: 84,
    doughcon: 2,
    statusText: 'FAST PACE',
    hourlyData: [64, 74, 84, 69, 54],
  };
}

function buildMarkers(flights: Flight[], logistics: LogisticsItem[]): MapMarker[] {
  const m: MapMarker[] = [];
  for (const f of flights) {
    if (f.lat && f.lon) m.push({ lat: f.lat, lon: f.lon, type: 'flight', label: f.callsign });
  }
  for (const l of logistics) {
    m.push({ lat: l.lat, lon: l.lon, type: 'shipping', label: l.name });
  }
  return m;
}

export interface DashboardData {
  sports: SportScore[];
  forecasts: Forecast[];
  flights: Flight[];
  markets: MarketItem[];
  news: NewsItem[];
  logistics: LogisticsItem[];
  pizza: PizzaData;
  markers: MapMarker[];
  comms: string[];
}

export function useDataFeed() {
  const [data, setData] = useState<DashboardData>({
    sports: generateSports(),
    forecasts: generateForecasts(),
    flights: generateFlights(),
    markets: generateMarkets(),
    news: generateNews(),
    logistics: generateLogistics(),
    pizza: generatePizza(),
    markers: [],
    comms: ['Data feeds connected', 'Initializing data feeds...'],
  });

  const commsRef = useRef(data.comms);

  const addComm = useCallback((msg: string) => {
    commsRef.current = [msg, ...commsRef.current].slice(0, 5);
  }, []);

  const refresh = useCallback(async (feed: string) => {
    try {
      const result = await fetchFeed(feed);
      setData((prev) => {
        const next = { ...prev };
        if (feed === 'sports' && result.sports) next.sports = result.sports;
        if (feed === 'markets' && result.markets) next.markets = result.markets;
        if (feed === 'news' && result.news) next.news = result.news;
        if (feed === 'flights' && result.flights) {
          next.flights = result.flights;
          next.markers = buildMarkers(result.flights, next.logistics);
        }
        if (feed === 'pizza' && result.pizza) next.pizza = result.pizza;
        next.comms = commsRef.current;
        return next;
      });
      addComm(`[${new Date().toISOString().slice(11, 19)}] ${feed} feed updated`);
    } catch {
      setData((prev) => {
        const next = { ...prev };
        if (feed === 'markets') next.markets = generateMarkets();
        next.comms = commsRef.current;
        return next;
      });
    }
  }, [addComm]);

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      markers: buildMarkers(prev.flights, prev.logistics),
    }));
  }, []);

  useEffect(() => {
    const feeds = [
      { name: 'sports', interval: 30000 },
      { name: 'markets', interval: 15000 },
      { name: 'news', interval: 60000 },
      { name: 'flights', interval: 30000 },
      { name: 'pizza', interval: 60000 },
    ];

    const timers = feeds.map((f) =>
      setInterval(() => refresh(f.name), f.interval),
    );

    for (const f of feeds) refresh(f.name);

    return () => timers.forEach(clearInterval);
  }, [refresh]);

  return data;
}
