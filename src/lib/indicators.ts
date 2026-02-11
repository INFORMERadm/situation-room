export function computeSMA(data: number[], period: number): (number | null)[] {
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

export function computeEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[j];
      result.push(sum / period);
    } else {
      const prev = result[i - 1];
      if (prev === null) {
        result.push(null);
      } else {
        result.push((data[i] - prev) * multiplier + prev);
      }
    }
  }
  return result;
}

export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function computeBollingerBands(
  data: number[],
  period: number,
  stdDevMult: number
): BollingerResult {
  const middle = computeSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    const m = middle[i];
    if (m === null || i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      let variance = 0;
      for (let j = i - period + 1; j <= i; j++) {
        variance += (data[j] - m) ** 2;
      }
      const stdDev = Math.sqrt(variance / period);
      upper.push(m + stdDevMult * stdDev);
      lower.push(m - stdDevMult * stdDev);
    }
  }

  return { upper, middle, lower };
}

export function computeVWAP(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): (number | null)[] {
  const result: (number | null)[] = [];
  let cumTPV = 0;
  let cumVol = 0;

  for (let i = 0; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumTPV += tp * volumes[i];
    cumVol += volumes[i];
    result.push(cumVol > 0 ? cumTPV / cumVol : null);
  }
  return result;
}

export function computeRSI(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (data.length < period + 1) {
    return data.map(() => null);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < period; i++) result.push(null);
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsI = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rsI));
  }

  return result;
}

export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function computeMACD(
  data: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): MACDResult {
  const fastEMA = computeEMA(data, fastPeriod);
  const slowEMA = computeEMA(data, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    macdLine.push(f !== null && s !== null ? f - s : null);
  }

  const macdValues = macdLine.filter((v): v is number => v !== null);
  const signalRaw = computeEMA(macdValues, signalPeriod);

  const signal: (number | null)[] = [];
  const histogram: (number | null)[] = [];
  let valIdx = 0;

  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] === null) {
      signal.push(null);
      histogram.push(null);
    } else {
      const sig = signalRaw[valIdx] ?? null;
      signal.push(sig);
      histogram.push(sig !== null ? macdLine[i]! - sig : null);
      valIdx++;
    }
  }

  return { macd: macdLine, signal, histogram };
}

export type IndicatorId =
  | 'sma20' | 'sma50' | 'sma100' | 'sma200'
  | 'ema12' | 'ema26'
  | 'bollinger'
  | 'vwap'
  | 'volume'
  | 'rsi'
  | 'macd';

export interface IndicatorConfig {
  id: IndicatorId;
  label: string;
  color: string;
  category: 'moving_avg' | 'bands' | 'volume' | 'oscillator';
  enabled: boolean;
}

export const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'sma20', label: 'SMA 20', color: '#29b6f6', category: 'moving_avg', enabled: true },
  { id: 'sma50', label: 'SMA 50', color: '#ff9800', category: 'moving_avg', enabled: true },
  { id: 'sma100', label: 'SMA 100', color: '#ab47bc', category: 'moving_avg', enabled: false },
  { id: 'sma200', label: 'SMA 200', color: '#ef5350', category: 'moving_avg', enabled: false },
  { id: 'ema12', label: 'EMA 12', color: '#26a69a', category: 'moving_avg', enabled: false },
  { id: 'ema26', label: 'EMA 26', color: '#ec407a', category: 'moving_avg', enabled: false },
  { id: 'bollinger', label: 'Bollinger Bands', color: '#78909c', category: 'bands', enabled: false },
  { id: 'vwap', label: 'VWAP', color: '#fdd835', category: 'bands', enabled: false },
  { id: 'volume', label: 'Volume', color: '#555', category: 'volume', enabled: true },
  { id: 'rsi', label: 'RSI (14)', color: '#ce93d8', category: 'oscillator', enabled: false },
  { id: 'macd', label: 'MACD', color: '#4fc3f7', category: 'oscillator', enabled: false },
];

export const CATEGORY_LABELS: Record<string, string> = {
  moving_avg: 'Moving Averages',
  bands: 'Bands & Overlays',
  volume: 'Volume',
  oscillator: 'Oscillators',
};
