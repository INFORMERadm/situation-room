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
  const mountedRef = useRef(true);

  const setLoad = useCallback((key: string, val: boolean) => {
    setLoading(prev => ({ ...prev, [key]: val }));
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const data = await fetchMarketOverview();
      if (mountedRef.current) setOverview(data);
    } catch (err) {
      console.error('[Dashboard] overview load failed:', err);
    }
  }, []);

  const loadMovers = useCallback(async () => {
    try {
      const data = await fetchMarketMovers();
      if (mountedRef.current) {
        setMovers({
          gainers: data.gainers ?? [],
          losers: data.losers ?? [],
          active: data.active ?? [],
        });
      }
    } catch (err) {
      console.error('[Dashboard] movers load failed:', err);
    }
  }, []);

  const loadSectors = useCallback(async () => {
    try {
      const data = await fetchSectorPerformance();
      if (mountedRef.current) setSectors(data);
    } catch (err) {
      console.error('[Dashboard] sectors load failed:', err);
    }
  }, []);

  const loadEarnings = useCallback(async () => {
    try {
      const data = await fetchEarningsCalendar();
      if (mountedRef.current) setEarnings(data);
    } catch (err) {
      console.error('[Dashboard] earnings load failed:', err);
    }
  }, []);

  const loadEconomic = useCallback(async () => {
    try {
      const data = await fetchEconomicCalendar();
      if (mountedRef.current) setEconomic(data);
    } catch (err) {
      console.error('[Dashboard] economic load failed:', err);
    }
  }, []);

  const loadNews = useCallback(async () => {
    try {
      const data = await fetchMarketNews();
      if (mountedRef.current) setNews(data);
    } catch (err) {
      console.error('[Dashboard] news load failed:', err);
    }
  }, []);

  const selectedSymbolRef = useRef('AAPL');

  const loadSymbolData = useCallback(async (symbol: string, timeframe: string) => {
    setLoad('chart', true);
    setLoad('profile', true);

    try {
      const [chartData, profileData, quoteData] = await Promise.allSettled([
        fetchHistoricalChart(symbol, timeframe),
        fetchCompanyProfile(symbol),
        fetchQuote(symbol),
      ]);
      if (mountedRef.current) {
        if (chartData.status === 'fulfilled') setChart(chartData.value);
        if (profileData.status === 'fulfilled') setProfile(profileData.value);
        if (quoteData.status === 'fulfilled') setQuote(quoteData.value);
      }
    } catch (err) {
      console.error('[Dashboard] symbol data load failed:', err);
    }

    setLoad('chart', false);
    setLoad('profile', false);
  }, [setLoad]);

  const refreshQuote = useCallback(async () => {
    const symbol = selectedSymbolRef.current;
    try {
      const quoteData = await fetchQuote(symbol);
      if (mountedRef.current) setQuote(quoteData);
    } catch (err) {
      console.error('[Dashboard] quote refresh failed:', err);
    }
  }, []);

  const selectSymbol = useCallback((symbol: string) => {
    selectedSymbolRef.current = symbol;
    setSelectedSymbol(symbol);
    loadSymbolData(symbol, chartTimeframe);
  }, [chartTimeframe, loadSymbolData]);

  const setChartTimeframe = useCallback((tf: string) => {
    setChartTimeframeState(tf);
    loadSymbolData(selectedSymbol, tf);
  }, [selectedSymbol, loadSymbolData]);

  useEffect(() => {
    mountedRef.current = true;

    const loadAll = () => {
      loadOverview();
      loadMovers();
      loadSectors();
      loadEarnings();
      loadEconomic();
      loadNews();
      loadSymbolData('AAPL', 'daily');
    };

    loadAll();

    const retryTimer = setTimeout(loadAll, 5_000);

    const i1 = setInterval(loadOverview, 3_000);
    const i2 = setInterval(loadMovers, 60_000);
    const i3 = setInterval(loadSectors, 60_000);
    const i4 = setInterval(loadNews, 120_000);
    const i5 = setInterval(loadEarnings, 300_000);
    const i6 = setInterval(loadEconomic, 300_000);
    const i7 = setInterval(refreshQuote, 3_000);

    intervalsRef.current = [i1, i2, i3, i4, i5, i6, i7];
    return () => {
      mountedRef.current = false;
      clearTimeout(retryTimer);
      intervalsRef.current.forEach(clearInterval);
    };
  }, [loadOverview, loadMovers, loadSectors, loadEarnings, loadEconomic, loadNews, loadSymbolData, refreshQuote]);

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
