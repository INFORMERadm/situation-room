import { useRef, useEffect, useState, useCallback } from 'react';
import type { HistoricalPrice } from '../../types';
import type { IndicatorConfig, IndicatorId } from '../../lib/indicators';
import { isForexSymbol } from '../../lib/format';
import {
  DEFAULT_INDICATORS,
  computeSMA,
  computeEMA,
  computeBollingerBands,
  computeVWAP,
  computeRSI,
  computeMACD,
} from '../../lib/indicators';
import IndicatorMenu from './IndicatorMenu';

interface Props {
  data: HistoricalPrice[];
  symbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  loading: boolean;
  livePrice?: number;
  externalChartType?: string;
  onChartTypeChange?: (type: string) => void;
  externalIndicators?: IndicatorConfig[];
  onToggleIndicator?: (id: string) => void;
}

const INTERVALS = [
  { label: '1m', value: '1min' },
  { label: '5m', value: '5min' },
  { label: '15m', value: '15min' },
  { label: '30m', value: '30min' },
  { label: '1h', value: '1hour' },
  { label: 'D', value: 'daily' },
];

const RANGES = ['1D', '1W', '1M', '3M', '1Y'];

const DEFAULT_RANGE: Record<string, string> = {
  '1min': '1D',
  '5min': '1W',
  '15min': '1W',
  '30min': '1M',
  '1hour': '1M',
  'daily': '3M',
};

const BARS_PER_DAY: Record<string, number> = {
  '1min': 390, '5min': 78, '15min': 26, '30min': 13, '1hour': 7, 'daily': 1,
};

const RANGE_DAYS: Record<string, number> = {
  '1D': 1, '1W': 5, '1M': 22, '3M': 65, '1Y': 252,
};

const CAL_DAYS: Record<string, number> = {
  '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365,
};

type ChartType = 'area' | 'line' | 'bar' | 'candlestick';

const CHART_TYPES: { label: string; value: ChartType }[] = [
  { label: 'Area', value: 'area' },
  { label: 'Line', value: 'line' },
  { label: 'Bar', value: 'bar' },
  { label: 'Candle', value: 'candlestick' },
];

const MIN_ZOOM_POINTS = 10;

function isEnabled(indicators: IndicatorConfig[], id: IndicatorId): boolean {
  return indicators.find(i => i.id === id)?.enabled ?? false;
}

function getColor(indicators: IndicatorConfig[], id: IndicatorId): string {
  return indicators.find(i => i.id === id)?.color ?? '#fff';
}

function drawOverlayLine(
  ctx: CanvasRenderingContext2D,
  values: (number | null)[],
  toX: (i: number) => number,
  toY: (p: number) => number,
  color: string,
  dashed: boolean,
  rangeStart: number,
  rangeEnd: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  if (dashed) ctx.setLineDash([3, 3]);
  else ctx.setLineDash([]);
  ctx.beginPath();
  let started = false;
  for (let i = rangeStart; i <= rangeEnd; i++) {
    const v = values[i];
    if (v === null || v === undefined) continue;
    if (!started) { ctx.moveTo(toX(i), toY(v)); started = true; }
    else ctx.lineTo(toX(i), toY(v));
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

export default function PriceChart({
  data, symbol, timeframe, onTimeframeChange, loading, livePrice,
  externalChartType, onChartTypeChange, externalIndicators, onToggleIndicator,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; idx: number } | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 400 });
  const [localChartType, setLocalChartType] = useState<ChartType>('area');
  const [localIndicators, setLocalIndicators] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [viewRange, setViewRange] = useState({ start: 0, end: 0 });
  const [selectedRange, setSelectedRange] = useState(() => DEFAULT_RANGE['daily'] || '3M');

  const chartType = (externalChartType as ChartType) || localChartType;
  const setChartType = onChartTypeChange || ((t: string) => setLocalChartType(t as ChartType));
  const indicators = externalIndicators || localIndicators;
  const toggleIndicator = useCallback((id: string) => {
    if (onToggleIndicator) {
      onToggleIndicator(id);
    } else {
      setLocalIndicators(prev => prev.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));
    }
  }, [onToggleIndicator]);

  const hasRSI = isEnabled(indicators, 'rsi');
  const hasMACD = isEnabled(indicators, 'macd');
  const oscillatorPanels = (hasRSI ? 1 : 0) + (hasMACD ? 1 : 0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setDims({
          w: Math.floor(entry.contentRect.width),
          h: Math.floor(entry.contentRect.height) - 36,
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleIntervalChange = useCallback((interval: string) => {
    onTimeframeChange(interval);
    setSelectedRange(DEFAULT_RANGE[interval] ?? '3M');
  }, [onTimeframeChange]);

  const slicedData = (() => {
    const reversed = [...data].reverse();
    let sliced: HistoricalPrice[];
    if (timeframe === 'daily') {
      const days = CAL_DAYS[selectedRange] ?? 90;
      sliced = reversed.slice(-days);
    } else {
      const bpd = BARS_PER_DAY[timeframe] ?? 78;
      const days = RANGE_DAYS[selectedRange] ?? 5;
      const maxBars = bpd * days;
      sliced = reversed.slice(-maxBars);
    }
    if (livePrice != null && sliced.length > 0) {
      const last = sliced[sliced.length - 1];
      sliced = [
        ...sliced.slice(0, -1),
        {
          ...last,
          close: livePrice,
          high: Math.max(last.high, livePrice),
          low: Math.min(last.low, livePrice),
        },
      ];
    }
    return sliced;
  })();

  useEffect(() => {
    setViewRange({ start: 0, end: Math.max(0, slicedData.length - 1) });
  }, [slicedData.length, timeframe, selectedRange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const total = slicedData.length;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (total < 4) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const PAD_L = 16;
      const PAD_R = 60;
      const chartW = dims.w - PAD_L - PAD_R;
      const ratio = Math.max(0, Math.min(1, (mouseX - PAD_L) / chartW));

      setViewRange(prev => {
        const curLen = prev.end - prev.start + 1;
        const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
        let newLen = Math.round(curLen * zoomFactor);
        newLen = Math.max(MIN_ZOOM_POINTS, Math.min(total, newLen));

        if (newLen === curLen) return prev;
        if (newLen >= total) return { start: 0, end: total - 1 };

        const diff = newLen - curLen;
        const leftAdj = Math.round(diff * ratio);
        const rightAdj = diff - leftAdj;

        let ns = prev.start - leftAdj;
        let ne = prev.end + rightAdj;

        if (ns < 0) { ne -= ns; ns = 0; }
        if (ne >= total) { ns -= (ne - total + 1); ne = total - 1; }
        ns = Math.max(0, ns);
        ne = Math.min(total - 1, ne);

        if (ne - ns + 1 < MIN_ZOOM_POINTS) return prev;
        return { start: ns, end: ne };
      });
    };

    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [dims.w, slicedData.length]);

  const viewStart = viewRange.start;
  const viewEnd = viewRange.end;
  const viewLen = viewEnd - viewStart + 1;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || slicedData.length < 2 || viewLen < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);

    const W = dims.w;
    const H = dims.h;
    const PAD_L = 16;
    const PAD_R = 60;
    const PAD_T = 16;
    const PAD_B = 50;
    const OSC_PANEL_H = 70;
    const OSC_TOTAL = oscillatorPanels * OSC_PANEL_H;
    const CHART_H = H - PAD_T - PAD_B - OSC_TOTAL;
    const CHART_W = W - PAD_L - PAD_R;
    const VOL_H = isEnabled(indicators, 'volume') ? 40 : 0;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, W, H);

    if (CHART_H < 40) return;

    const closes = slicedData.map(d => d.close);
    const volumes = slicedData.map(d => d.volume);
    const highs = slicedData.map(d => d.high);
    const lows = slicedData.map(d => d.low);

    const visCloses = closes.slice(viewStart, viewEnd + 1);
    const visVolumes = volumes.slice(viewStart, viewEnd + 1);
    const visHighs = highs.slice(viewStart, viewEnd + 1);
    const visLows = lows.slice(viewStart, viewEnd + 1);

    const useOHLC = chartType === 'bar' || chartType === 'candlestick';
    const minP = useOHLC
      ? Math.min(...visLows) * 0.998
      : Math.min(...visCloses) * 0.998;
    const maxP = useOHLC
      ? Math.max(...visHighs) * 1.002
      : Math.max(...visCloses) * 1.002;
    const maxV = Math.max(...visVolumes, 1);
    const priceRange = maxP - minP || 1;

    const toX = (i: number) => PAD_L + ((i - viewStart) / (viewLen - 1)) * CHART_W;
    const toY = (p: number) => PAD_T + (1 - (p - minP) / priceRange) * (CHART_H - VOL_H);

    const gridLines = 5;
    ctx.strokeStyle = '#292929';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#888';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i <= gridLines; i++) {
      const price = minP + (priceRange * i) / gridLines;
      const y = toY(price);
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(W - PAD_R, y);
      ctx.stroke();
      ctx.fillText(isForexSymbol(symbol) ? price.toFixed(4) : price.toFixed(2), W - PAD_R + 6, y + 3);
    }

    if (isEnabled(indicators, 'volume')) {
      for (let i = viewStart; i <= viewEnd; i++) {
        const x = toX(i);
        const barH = (volumes[i] / maxV) * VOL_H;
        const barW = Math.max(1, CHART_W / viewLen - 1);
        ctx.fillStyle = closes[i] >= (slicedData[i].open || closes[i]) ? '#00c85333' : '#ff174433';
        ctx.fillRect(x - barW / 2, PAD_T + CHART_H - barH, barW, barH);
      }
    }

    if (isEnabled(indicators, 'bollinger')) {
      const bb = computeBollingerBands(closes, 20, 2);
      const bbColor = getColor(indicators, 'bollinger');

      ctx.fillStyle = bbColor + '0a';
      ctx.beginPath();
      let bbStarted = false;
      for (let i = viewStart; i <= viewEnd; i++) {
        const u = bb.upper[i];
        if (u === null) continue;
        if (!bbStarted) { ctx.moveTo(toX(i), toY(u)); bbStarted = true; }
        else ctx.lineTo(toX(i), toY(u));
      }
      for (let i = viewEnd; i >= viewStart; i--) {
        const l = bb.lower[i];
        if (l === null) continue;
        ctx.lineTo(toX(i), toY(l));
      }
      ctx.closePath();
      ctx.fill();

      drawOverlayLine(ctx, bb.upper, toX, toY, bbColor, true, viewStart, viewEnd);
      drawOverlayLine(ctx, bb.lower, toX, toY, bbColor, true, viewStart, viewEnd);
    }

    if (isEnabled(indicators, 'sma20')) {
      drawOverlayLine(ctx, computeSMA(closes, 20), toX, toY, getColor(indicators, 'sma20'), true, viewStart, viewEnd);
    }
    if (isEnabled(indicators, 'sma50')) {
      drawOverlayLine(ctx, computeSMA(closes, 50), toX, toY, getColor(indicators, 'sma50'), true, viewStart, viewEnd);
    }
    if (isEnabled(indicators, 'sma100')) {
      drawOverlayLine(ctx, computeSMA(closes, 100), toX, toY, getColor(indicators, 'sma100'), true, viewStart, viewEnd);
    }
    if (isEnabled(indicators, 'sma200')) {
      drawOverlayLine(ctx, computeSMA(closes, 200), toX, toY, getColor(indicators, 'sma200'), true, viewStart, viewEnd);
    }
    if (isEnabled(indicators, 'ema12')) {
      drawOverlayLine(ctx, computeEMA(closes, 12), toX, toY, getColor(indicators, 'ema12'), false, viewStart, viewEnd);
    }
    if (isEnabled(indicators, 'ema26')) {
      drawOverlayLine(ctx, computeEMA(closes, 26), toX, toY, getColor(indicators, 'ema26'), false, viewStart, viewEnd);
    }
    if (isEnabled(indicators, 'vwap')) {
      drawOverlayLine(ctx, computeVWAP(closes, highs, lows, volumes), toX, toY, getColor(indicators, 'vwap'), false, viewStart, viewEnd);
    }

    const isUp = visCloses[visCloses.length - 1] >= visCloses[0];
    const lineColor = isUp ? '#00c853' : '#ff1744';

    if (chartType === 'area' || chartType === 'line') {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = viewStart; i <= viewEnd; i++) {
        const x = toX(i);
        const y = toY(closes[i]);
        if (i === viewStart) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (chartType === 'area') {
        const gradStart = isUp ? 'rgba(0,200,83,0.15)' : 'rgba(255,23,68,0.15)';
        const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + CHART_H - VOL_H);
        grad.addColorStop(0, gradStart);
        grad.addColorStop(1, 'rgba(18,18,18,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(toX(viewStart), toY(closes[viewStart]));
        for (let i = viewStart + 1; i <= viewEnd; i++) ctx.lineTo(toX(i), toY(closes[i]));
        ctx.lineTo(toX(viewEnd), PAD_T + CHART_H - VOL_H);
        ctx.lineTo(toX(viewStart), PAD_T + CHART_H - VOL_H);
        ctx.closePath();
        ctx.fill();
      }
    } else if (chartType === 'bar') {
      const barW = Math.max(3, (CHART_W / viewLen) * 0.6);
      for (let i = viewStart; i <= viewEnd; i++) {
        const d = slicedData[i];
        const x = toX(i);
        const bullish = d.close >= d.open;
        ctx.strokeStyle = bullish ? '#00c853' : '#ff1744';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, toY(d.high));
        ctx.lineTo(x, toY(d.low));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - barW / 2, toY(d.open));
        ctx.lineTo(x, toY(d.open));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, toY(d.close));
        ctx.lineTo(x + barW / 2, toY(d.close));
        ctx.stroke();
      }
    } else if (chartType === 'candlestick') {
      const candleW = Math.max(3, (CHART_W / viewLen) * 0.7);
      for (let i = viewStart; i <= viewEnd; i++) {
        const d = slicedData[i];
        const x = toX(i);
        const bullish = d.close >= d.open;
        const color = bullish ? '#00c853' : '#ff1744';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, toY(d.high));
        ctx.lineTo(x, toY(d.low));
        ctx.stroke();
        const bodyTop = toY(Math.max(d.open, d.close));
        const bodyBot = toY(Math.min(d.open, d.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        if (bullish) {
          ctx.fillStyle = '#121212';
          ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
          ctx.strokeRect(x - candleW / 2, bodyTop, candleW, bodyH);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
        }
      }
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#888';
    const labelCount = Math.min(6, viewLen);
    for (let i = 0; i < labelCount; i++) {
      const idx = viewStart + Math.floor((i / (labelCount - 1)) * (viewLen - 1));
      const d = slicedData[idx];
      const label = d.date.length > 10 ? d.date.slice(5, 16) : d.date.slice(5, 10);
      ctx.fillText(label, toX(idx), PAD_T + CHART_H + 16);
    }

    if (hover && hover.idx >= viewStart && hover.idx <= viewEnd) {
      const hx = toX(hover.idx);
      const hy = toY(closes[hover.idx]);

      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hx, PAD_T);
      ctx.lineTo(hx, PAD_T + CHART_H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PAD_L, hy);
      ctx.lineTo(W - PAD_R, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();

      const dp = slicedData[hover.idx];
      const tooltipLines = [
        dp.date.slice(0, 16),
        `O: ${isForexSymbol(symbol) ? dp.open.toFixed(4) : dp.open.toFixed(2)}  H: ${isForexSymbol(symbol) ? dp.high.toFixed(4) : dp.high.toFixed(2)}`,
        `L: ${isForexSymbol(symbol) ? dp.low.toFixed(4) : dp.low.toFixed(2)}  C: ${isForexSymbol(symbol) ? dp.close.toFixed(4) : dp.close.toFixed(2)}`,
        `Vol: ${dp.volume.toLocaleString()}`,
      ];

      const tw = 190;
      const th = 60;
      let tx = hx + 12;
      if (tx + tw > W - PAD_R) tx = hx - tw - 12;
      let ty = hy - th / 2;
      if (ty < PAD_T) ty = PAD_T;

      ctx.fillStyle = 'rgba(26,26,26,0.95)';
      ctx.strokeStyle = '#292929';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ccc';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      tooltipLines.forEach((line, li) => {
        ctx.fillText(line, tx + 8, ty + 14 + li * 13);
      });
    }

    let panelY = PAD_T + CHART_H + 30;

    if (hasRSI) {
      const rsiData = computeRSI(closes, 14);
      const oscTop = panelY;
      const oscH = OSC_PANEL_H - 10;

      ctx.strokeStyle = '#292929';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD_L, oscTop);
      ctx.lineTo(W - PAD_R, oscTop);
      ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('RSI (14)', PAD_L + 4, oscTop + 10);

      const rsiToY = (v: number) => oscTop + 4 + (1 - v / 100) * (oscH - 8);

      ctx.strokeStyle = '#292929';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      [30, 70].forEach(level => {
        const ly = rsiToY(level);
        ctx.beginPath();
        ctx.moveTo(PAD_L, ly);
        ctx.lineTo(W - PAD_R, ly);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(206,147,216,0.05)';
      ctx.fillRect(PAD_L, rsiToY(70), CHART_W, rsiToY(30) - rsiToY(70));

      ctx.strokeStyle = getColor(indicators, 'rsi');
      ctx.lineWidth = 1;
      ctx.beginPath();
      let rsiStarted = false;
      for (let i = viewStart; i <= viewEnd; i++) {
        const v = rsiData[i];
        if (v === null) continue;
        if (!rsiStarted) { ctx.moveTo(toX(i), rsiToY(v)); rsiStarted = true; }
        else ctx.lineTo(toX(i), rsiToY(v));
      }
      ctx.stroke();

      ctx.fillStyle = '#777';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('70', W - PAD_R + 6, rsiToY(70) + 3);
      ctx.fillText('30', W - PAD_R + 6, rsiToY(30) + 3);

      panelY += OSC_PANEL_H;
    }

    if (hasMACD) {
      const macdData = computeMACD(closes, 12, 26, 9);
      const oscTop = panelY;
      const oscH = OSC_PANEL_H - 10;

      ctx.strokeStyle = '#292929';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD_L, oscTop);
      ctx.lineTo(W - PAD_R, oscTop);
      ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('MACD (12,26,9)', PAD_L + 4, oscTop + 10);

      const allVals: number[] = [];
      for (let i = viewStart; i <= viewEnd; i++) {
        const mv = macdData.macd[i];
        if (mv !== null) allVals.push(mv);
        const sv = macdData.signal[i];
        if (sv !== null) allVals.push(sv);
        const hv = macdData.histogram[i];
        if (hv !== null) allVals.push(Math.abs(hv));
      }
      const macdMax = Math.max(...allVals.map(Math.abs), 0.01);

      const macdToY = (v: number) => oscTop + 4 + oscH / 2 - (v / macdMax) * (oscH / 2 - 4);

      ctx.strokeStyle = '#292929';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(PAD_L, macdToY(0));
      ctx.lineTo(W - PAD_R, macdToY(0));
      ctx.stroke();
      ctx.setLineDash([]);

      const histBarW = Math.max(1, CHART_W / viewLen - 1);
      for (let i = viewStart; i <= viewEnd; i++) {
        const v = macdData.histogram[i];
        if (v === null) continue;
        const x = toX(i);
        const zeroY = macdToY(0);
        const barY = macdToY(v);
        ctx.fillStyle = v >= 0 ? '#00c85366' : '#ff174466';
        ctx.fillRect(x - histBarW / 2, Math.min(zeroY, barY), histBarW, Math.abs(barY - zeroY));
      }

      ctx.strokeStyle = getColor(indicators, 'macd');
      ctx.lineWidth = 1;
      ctx.beginPath();
      let macdStarted = false;
      for (let i = viewStart; i <= viewEnd; i++) {
        const v = macdData.macd[i];
        if (v === null) continue;
        if (!macdStarted) { ctx.moveTo(toX(i), macdToY(v)); macdStarted = true; }
        else ctx.lineTo(toX(i), macdToY(v));
      }
      ctx.stroke();

      ctx.strokeStyle = '#ff6d00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let sigStarted = false;
      for (let i = viewStart; i <= viewEnd; i++) {
        const v = macdData.signal[i];
        if (v === null) continue;
        if (!sigStarted) { ctx.moveTo(toX(i), macdToY(v)); sigStarted = true; }
        else ctx.lineTo(toX(i), macdToY(v));
      }
      ctx.stroke();
    }

    const activeOverlays = indicators.filter(
      i => i.enabled && i.category !== 'oscillator' && i.category !== 'volume'
    );
    if (activeOverlays.length > 0) {
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      let legendX = PAD_L + 4;
      const legendY = H - 6;
      for (const ind of activeOverlays) {
        ctx.fillStyle = '#888';
        ctx.fillText(ind.label, legendX, legendY);
        const textW = ctx.measureText(ind.label).width;
        legendX += textW + 4;
        ctx.fillStyle = ind.color;
        ctx.fillRect(legendX, legendY - 5, 12, 2);
        legendX += 20;
      }
    }

    const isZoomed = viewLen < slicedData.length;
    if (isZoomed) {
      const pct = Math.round((viewLen / slicedData.length) * 100);
      ctx.fillStyle = '#777';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${pct}%`, W - PAD_R - 2, H - 6);
    }
  }, [slicedData, dims, hover, chartType, indicators, oscillatorPanels, hasRSI, hasMACD, viewStart, viewEnd, viewLen]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || viewLen < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const PAD_L = 16;
    const PAD_R = 60;
    const CHART_W = dims.w - PAD_L - PAD_R;
    const ratio = (x - PAD_L) / CHART_W;
    const idx = viewStart + Math.round(ratio * (viewLen - 1));
    if (idx >= viewStart && idx <= viewEnd) {
      setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, idx });
    }
  }, [viewStart, viewEnd, viewLen, dims]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid #292929',
      }}>
        <span style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 600 }}>
          {symbol} CHART
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {CHART_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => setChartType(ct.value)}
              style={{
                background: chartType === ct.value ? '#292929' : 'transparent',
                border: '1px solid',
                borderColor: chartType === ct.value ? '#00c853' : '#292929',
                color: chartType === ct.value ? '#00c853' : '#999',
                padding: '3px 8px',
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderRadius: 2,
                transition: 'all 0.15s',
              }}
            >
              {ct.label}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: '#292929', margin: '0 6px' }} />
          <IndicatorMenu indicators={indicators} onToggle={toggleIndicator} />
          <div style={{ width: 1, height: 16, background: '#292929', margin: '0 6px' }} />
          {INTERVALS.map(iv => {
            const isActive = iv.value === timeframe;
            return (
              <button
                key={iv.value}
                onClick={() => handleIntervalChange(iv.value)}
                style={{
                  background: isActive ? '#292929' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? '#ff9800' : '#292929',
                  color: isActive ? '#ff9800' : '#999',
                  padding: '3px 8px',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: 2,
                  transition: 'all 0.15s',
                }}
              >
                {iv.label}
              </button>
            );
          })}
          <div style={{ width: 1, height: 16, background: '#292929', margin: '0 6px' }} />
          {RANGES.map(r => {
            const isActive = r === selectedRange;
            return (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                style={{
                  background: isActive ? '#292929' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? '#00c853' : '#292929',
                  color: isActive ? '#00c853' : '#999',
                  padding: '3px 8px',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: 2,
                  transition: 'all 0.15s',
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(18,18,18,0.8)',
            zIndex: 10,
            color: '#888',
            fontSize: 12,
          }}>
            Loading chart data...
          </div>
        )}
        {slicedData.length < 2 && !loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            fontSize: 12,
          }}>
            No chart data available
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ width: dims.w, height: dims.h, cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        />
      </div>
    </div>
  );
}
