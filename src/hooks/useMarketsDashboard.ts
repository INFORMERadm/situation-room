import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchMarketOverview,
  fetchMarketMovers,
  fetchSectorPerformance,
  fetchHistoricalChart,
  fetchCompanyProfile,
  fetchQuote,
  fetchEarningsCalendar,
  fetchEconomicCalendar,
  fetchMarketNews,
} from '../lib/api';
import type {
  MarketItem,
  MarketMover,
  SectorPerf,
  HistoricalPrice,
  CompanyProfile,
  QuoteDetail,
  EarningsEvent,
  EconomicEvent,
  MarketNewsItem,
} from '../types';

interface MarketMoversData {
  gainers: MarketMover[];
  losers: MarketMover[];
  active: MarketMover[];
}

export interface MarketsDashboardData {
  overview: MarketItem[];
  movers: MarketMoversData;
  sectors: SectorPerf[];
  chart: HistoricalPrice[];
  profile: CompanyProfile | null;
  quote: QuoteDetail | null;
  earnings: EarningsEvent[];
  economic: EconomicEvent[];
  news: MarketNewsItem[];
  selectedSymbol: string;
  chartTimeframe: string;
  loading: Record<string, boolean>;
  selectSymbol: (symbol: string) => void;
  setChartTimeframe: (tf: string) => void;
}

export function useMarketsDashboard(): MarketsDashboardData {
  const [overview, setOverview] = useState<MarketItem[]>([]);
  const [movers, setMovers] = useState<MarketMoversData>({ gainers: [], losers: [], active: [] });
  const [sectors, setSectors] = useState<SectorPerf[]>([]);
  const [chart, setChart] = useState<HistoricalPrice[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [economic, setEconomic] = useState<EconomicEvent[]>([]);
  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [chartTimeframe, setChartTimeframeState] = useState('daily');
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const setLoad = useCallback((key: string, val: boolean) => {
    setLoading(prev => ({ ...prev, [key]: val }));
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const data = await fetchMarketOverview();
      setOverview(data);
    } catch { /* skip */ }
  }, []);

  const loadMovers = useCallback(async () => {
    try {
      const data = await fetchMarketMovers();
      setMovers({
        gainers: data.gainers ?? [],
        losers: data.losers ?? [],
        active: data.active ?? [],
      });
    } catch { /* skip */ }
  }, []);

  const loadSectors = useCallback(async () => {
    try {
      const data = await fetchSectorPerformance();
      setSectors(data);
    } catch { /* skip */ }
  }, []);

  const loadEarnings = useCallback(async () => {
    try {
      const data = await fetchEarningsCalendar();
      setEarnings(data);
    } catch { /* skip */ }
  }, []);

  const loadEconomic = useCallback(async () => {
    try {
      const data = await fetchEconomicCalendar();
      setEconomic(data);
    } catch { /* skip */ }
  }, []);

  const loadNews = useCallback(async () => {
    try {
      const data = await fetchMarketNews();
      setNews(data);
    } catch { /* skip */ }
  }, []);

  const loadSymbolData = useCallback(async (symbol: string, timeframe: string) => {
    setLoad('chart', true);
    setLoad('profile', true);

    try {
      const [chartData, profileData, quoteData] = await Promise.all([
        fetchHistoricalChart(symbol, timeframe),
        fetchCompanyProfile(symbol),
        fetchQuote(symbol),
      ]);
      setChart(chartData);
      setProfile(profileData);
      setQuote(quoteData);
    } catch { /* skip */ }

    setLoad('chart', false);
    setLoad('profile', false);
  }, [setLoad]);

  const selectSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    loadSymbolData(symbol, chartTimeframe);
  }, [chartTimeframe, loadSymbolData]);

  const setChartTimeframe = useCallback((tf: string) => {
    setChartTimeframeState(tf);
    loadSymbolData(selectedSymbol, tf);
  }, [selectedSymbol, loadSymbolData]);

  useEffect(() => {
    loadOverview();
    loadMovers();
    loadSectors();
    loadEarnings();
    loadEconomic();
    loadNews();
    loadSymbolData('AAPL', 'daily');

    const i1 = setInterval(loadOverview, 15_000);
    const i2 = setInterval(loadMovers, 60_000);
    const i3 = setInterval(loadSectors, 60_000);
    const i4 = setInterval(loadNews, 120_000);
    const i5 = setInterval(loadEarnings, 300_000);
    const i6 = setInterval(loadEconomic, 300_000);

    intervalsRef.current = [i1, i2, i3, i4, i5, i6];
    return () => intervalsRef.current.forEach(clearInterval);
  }, [loadOverview, loadMovers, loadSectors, loadEarnings, loadEconomic, loadNews, loadSymbolData]);

  return {
    overview,
    movers,
    sectors,
    chart,
    profile,
    quote,
    earnings,
    economic,
    news,
    selectedSymbol,
    chartTimeframe,
    loading,
    selectSymbol,
    setChartTimeframe,
  };
}
