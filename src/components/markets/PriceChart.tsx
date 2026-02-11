import { useRef, useEffect, useState, useCallback } from 'react';
import type { HistoricalPrice } from '../../types';

interface Props {
  data: HistoricalPrice[];
  symbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  loading: boolean;
}

const TIMEFRAMES = [
  { label: '1D', value: '5min' },
  { label: '1W', value: '1hour' },
  { label: '1M', value: 'daily', days: 30 },
  { label: '3M', value: 'daily', days: 90 },
  { label: '1Y', value: 'daily', days: 365 },
];

type ChartType = 'area' | 'line' | 'bar' | 'candlestick';

const CHART_TYPES: { label: string; value: ChartType }[] = [
  { label: 'Area', value: 'area' },
  { label: 'Line', value: 'line' },
  { label: 'Bar', value: 'bar' },
  { label: 'Candle', value: 'candlestick' },
];

function computeSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      result.push(sum / period);
    }
  }
  return result;
}

export default function PriceChart({ data, symbol, timeframe, onTimeframeChange, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; idx: number } | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 400 });
  const [chartType, setChartType] = useState<ChartType>('area');

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

  const activeLabel = TIMEFRAMES.find(t => {
    if (t.value === timeframe) return true;
    if (t.value === 'daily' && timeframe === 'daily') return true;
    return false;
  })?.label;

  const slicedData = (() => {
    const tf = TIMEFRAMES.find(t => t.label === activeLabel);
    if (!tf) return data;
    const reversed = [...data].reverse();
    if (tf.days) return reversed.slice(-tf.days);
    return reversed;
  })();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || slicedData.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);

    const W = dims.w;
    const H = dims.h;
    const PAD_L = 60;
    const PAD_R = 16;
    const PAD_T = 16;
    const PAD_B = 50;
    const CHART_W = W - PAD_L - PAD_R;
    const CHART_H = H - PAD_T - PAD_B;
    const VOL_H = 40;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, W, H);

    const closes = slicedData.map(d => d.close);
    const volumes = slicedData.map(d => d.volume);
    const useOHLC = chartType === 'bar' || chartType === 'candlestick';
    const minP = useOHLC
      ? Math.min(...slicedData.map(d => d.low)) * 0.998
      : Math.min(...closes) * 0.998;
    const maxP = useOHLC
      ? Math.max(...slicedData.map(d => d.high)) * 1.002
      : Math.max(...closes) * 1.002;
    const maxV = Math.max(...volumes, 1);
    const priceRange = maxP - minP || 1;

    const toX = (i: number) => PAD_L + (i / (slicedData.length - 1)) * CHART_W;
    const toY = (p: number) => PAD_T + (1 - (p - minP) / priceRange) * (CHART_H - VOL_H);

    const gridLines = 5;
    ctx.strokeStyle = '#292929';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const price = minP + (priceRange * i) / gridLines;
      const y = toY(price);
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(W - PAD_R, y);
      ctx.stroke();
      ctx.fillText(price.toFixed(2), PAD_L - 6, y + 3);
    }

    ctx.fillStyle = '#292929';
    for (let i = 0; i < slicedData.length; i++) {
      const x = toX(i);
      const barH = (volumes[i] / maxV) * VOL_H;
      const barW = Math.max(1, CHART_W / slicedData.length - 1);
      ctx.fillStyle = closes[i] >= (slicedData[i].open || closes[i]) ? '#00c85333' : '#ff174433';
      ctx.fillRect(x - barW / 2, PAD_T + CHART_H - barH, barW, barH);
    }

    const sma20 = computeSMA(closes, 20);
    const sma50 = computeSMA(closes, 50);

    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < sma50.length; i++) {
      const v = sma50[i];
      if (v === null) continue;
      if (!started) { ctx.moveTo(toX(i), toY(v)); started = true; }
      else ctx.lineTo(toX(i), toY(v));
    }
    ctx.stroke();

    ctx.strokeStyle = '#29b6f6';
    ctx.beginPath();
    started = false;
    for (let i = 0; i < sma20.length; i++) {
      const v = sma20[i];
      if (v === null) continue;
      if (!started) { ctx.moveTo(toX(i), toY(v)); started = true; }
      else ctx.lineTo(toX(i), toY(v));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const isUp = closes[closes.length - 1] >= closes[0];
    const lineColor = isUp ? '#00c853' : '#ff1744';

    if (chartType === 'area' || chartType === 'line') {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < slicedData.length; i++) {
        const x = toX(i);
        const y = toY(closes[i]);
        if (i === 0) ctx.moveTo(x, y);
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
        ctx.moveTo(toX(0), toY(closes[0]));
        for (let i = 1; i < slicedData.length; i++) ctx.lineTo(toX(i), toY(closes[i]));
        ctx.lineTo(toX(slicedData.length - 1), PAD_T + CHART_H - VOL_H);
        ctx.lineTo(toX(0), PAD_T + CHART_H - VOL_H);
        ctx.closePath();
        ctx.fill();
      }
    } else if (chartType === 'bar') {
      const barW = Math.max(3, (CHART_W / slicedData.length) * 0.6);
      for (let i = 0; i < slicedData.length; i++) {
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
      const candleW = Math.max(3, (CHART_W / slicedData.length) * 0.7);
      for (let i = 0; i < slicedData.length; i++) {
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
    ctx.fillStyle = '#555';
    const labelCount = Math.min(6, slicedData.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (slicedData.length - 1));
      const d = slicedData[idx];
      const label = d.date.length > 10 ? d.date.slice(5, 16) : d.date.slice(5, 10);
      ctx.fillText(label, toX(idx), H - PAD_B + 16);
    }

    if (hover && hover.idx >= 0 && hover.idx < slicedData.length) {
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
        `O: ${dp.open.toFixed(2)}  H: ${dp.high.toFixed(2)}`,
        `L: ${dp.low.toFixed(2)}  C: ${dp.close.toFixed(2)}`,
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
      tooltipLines.forEach((line, i) => {
        ctx.fillText(line, tx + 8, ty + 14 + i * 13);
      });
    }

    ctx.fillStyle = '#555';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SMA 20', PAD_L + 4, H - 6);
    ctx.fillStyle = '#29b6f6';
    ctx.fillRect(PAD_L + 46, H - 11, 16, 2);
    ctx.fillStyle = '#555';
    ctx.fillText('SMA 50', PAD_L + 72, H - 6);
    ctx.fillStyle = '#ff9800';
    ctx.fillRect(PAD_L + 114, H - 11, 16, 2);
  }, [slicedData, dims, hover, chartType]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || slicedData.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const PAD_L = 60;
    const PAD_R = 16;
    const CHART_W = dims.w - PAD_L - PAD_R;
    const ratio = (x - PAD_L) / CHART_W;
    const idx = Math.round(ratio * (slicedData.length - 1));
    if (idx >= 0 && idx < slicedData.length) {
      setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, idx });
    }
  }, [slicedData, dims]);

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
                color: chartType === ct.value ? '#00c853' : '#666',
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
          {TIMEFRAMES.map(tf => {
            const isActive = tf.label === activeLabel ||
              (tf.value === timeframe && !activeLabel);
            return (
              <button
                key={tf.label}
                onClick={() => onTimeframeChange(tf.value)}
                style={{
                  background: isActive ? '#292929' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? '#00c853' : '#292929',
                  color: isActive ? '#00c853' : '#666',
                  padding: '3px 8px',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: 2,
                  transition: 'all 0.15s',
                }}
              >
                {tf.label}
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
            color: '#555',
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
            color: '#555',
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
