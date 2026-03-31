import type { Candle, SupportResistanceLevel, PatternResult, TechnicalIndicators } from "@/shared/stockTypes";

// ─────────────────────────────────────────────
// Moving Average
// ─────────────────────────────────────────────
export function calculateMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

// ─────────────────────────────────────────────
// RSI
// ─────────────────────────────────────────────
export function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsVal = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rsVal);
  }

  return result;
}

// ─────────────────────────────────────────────
// EMA
// ─────────────────────────────────────────────
export function calculateEMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period) return result;

  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = ema;

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result[i] = ema;
  }

  return result;
}

// ─────────────────────────────────────────────
// MACD
// ─────────────────────────────────────────────
export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): TechnicalIndicators["macd"] {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = closes.map((_, i) => {
    if (fastEMA[i] == null || slowEMA[i] == null) return null;
    return (fastEMA[i] as number) - (slowEMA[i] as number);
  });

  const macdValues = macdLine.filter((v) => v != null) as number[];
  const signalRaw = calculateEMA(macdValues, signalPeriod);

  const signal: (number | null)[] = new Array(closes.length).fill(null);
  const histogram: (number | null)[] = new Array(closes.length).fill(null);

  let macdIdx = 0;
  let signalIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] != null) {
      if (signalRaw[signalIdx] != null) {
        signal[i] = signalRaw[signalIdx];
        histogram[i] = (macdLine[i] as number) - (signalRaw[signalIdx] as number);
      }
      signalIdx++;
      macdIdx++;
    }
  }

  return { macd: macdLine, signal, histogram };
}

// ─────────────────────────────────────────────
// Bollinger Bands
// ─────────────────────────────────────────────
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2
): TechnicalIndicators["bollingerBands"] {
  const middle = calculateMA(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i] as number;
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + stdDev * sd;
    lower[i] = mean - stdDev * sd;
  }

  return { upper, middle, lower };
}

// ─────────────────────────────────────────────
// All Indicators
// ─────────────────────────────────────────────
export function calculateAllIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  return {
    ma5: calculateMA(closes, 5),
    ma20: calculateMA(closes, 20),
    ma60: calculateMA(closes, 60),
    ma120: calculateMA(closes, 120),
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    bollingerBands: calculateBollingerBands(closes),
  };
}

// ─────────────────────────────────────────────
// Support & Resistance Detection
// ─────────────────────────────────────────────
export function findLocalExtrema(
  candles: Candle[],
  lookback = 5
): { peaks: number[]; valleys: number[] } {
  const peaks: number[] = [];
  const valleys: number[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    const leftHighs = candles.slice(i - lookback, i).map((c) => c.high);
    const rightHighs = candles.slice(i + 1, i + lookback + 1).map((c) => c.high);
    const leftLows = candles.slice(i - lookback, i).map((c) => c.low);
    const rightLows = candles.slice(i + 1, i + lookback + 1).map((c) => c.low);

    if (
      current.high > Math.max(...leftHighs) &&
      current.high > Math.max(...rightHighs)
    ) {
      peaks.push(i);
    }

    if (
      current.low < Math.min(...leftLows) &&
      current.low < Math.min(...rightLows)
    ) {
      valleys.push(i);
    }
  }

  return { peaks, valleys };
}

export function detectSupportResistance(
  candles: Candle[],
  tolerance = 0.015 // 1.5% price tolerance for clustering
): SupportResistanceLevel[] {
  if (candles.length < 20) return [];

  const { peaks, valleys } = findLocalExtrema(candles, 5);
  const levels: SupportResistanceLevel[] = [];

  // Group nearby price levels
  const allLevels: { price: number; type: "support" | "resistance"; index: number }[] = [
    ...peaks.map((i) => ({ price: candles[i].high, type: "resistance" as const, index: i })),
    ...valleys.map((i) => ({ price: candles[i].low, type: "support" as const, index: i })),
  ];

  allLevels.sort((a, b) => a.price - b.price);

  const clustered: typeof allLevels[] = [];
  let currentCluster: typeof allLevels = [];

  for (const level of allLevels) {
    if (currentCluster.length === 0) {
      currentCluster.push(level);
    } else {
      const clusterAvg =
        currentCluster.reduce((sum, l) => sum + l.price, 0) / currentCluster.length;
      if (Math.abs(level.price - clusterAvg) / clusterAvg <= tolerance) {
        currentCluster.push(level);
      } else {
        clustered.push([...currentCluster]);
        currentCluster = [level];
      }
    }
  }
  if (currentCluster.length > 0) clustered.push(currentCluster);

  for (const cluster of clustered) {
    if (cluster.length < 2) continue;
    const avgPrice = cluster.reduce((sum, l) => sum + l.price, 0) / cluster.length;
    const resistanceCount = cluster.filter((l) => l.type === "resistance").length;
    const supportCount = cluster.filter((l) => l.type === "support").length;
    const type = resistanceCount >= supportCount ? "resistance" : "support";
    const strength = Math.min(5, cluster.length);

    levels.push({
      price: avgPrice,
      type,
      strength,
      touches: cluster.map((l) => l.index),
    });
  }

  // Sort by strength descending, take top 6
  return levels.sort((a, b) => b.strength - a.strength).slice(0, 6);
}

// ─────────────────────────────────────────────
// Pattern Recognition
// ─────────────────────────────────────────────

function findPeaks(closes: number[], minDistance = 5): number[] {
  const peaks: number[] = [];
  for (let i = minDistance; i < closes.length - minDistance; i++) {
    const left = closes.slice(i - minDistance, i);
    const right = closes.slice(i + 1, i + minDistance + 1);
    if (closes[i] > Math.max(...left) && closes[i] > Math.max(...right)) {
      peaks.push(i);
    }
  }
  return peaks;
}

function findValleys(closes: number[], minDistance = 5): number[] {
  const valleys: number[] = [];
  for (let i = minDistance; i < closes.length - minDistance; i++) {
    const left = closes.slice(i - minDistance, i);
    const right = closes.slice(i + 1, i + minDistance + 1);
    if (closes[i] < Math.min(...left) && closes[i] < Math.min(...right)) {
      valleys.push(i);
    }
  }
  return valleys;
}

export function detectPatterns(candles: Candle[]): PatternResult[] {
  if (candles.length < 30) return [];
  const closes = candles.map((c) => c.close);
  const patterns: PatternResult[] = [];

  // Double Top
  const peaks = findPeaks(closes, 5);
  for (let i = 0; i < peaks.length - 1; i++) {
    const p1 = peaks[i];
    const p2 = peaks[i + 1];
    const gap = p2 - p1;
    if (gap < 10 || gap > 60) continue;
    const priceDiff = Math.abs(closes[p1] - closes[p2]) / closes[p1];
    if (priceDiff > 0.03) continue;

    const necklineSlice = closes.slice(p1, p2 + 1);
    const neckline = Math.min(...necklineSlice);
    const dropFromPeak = (closes[p1] - neckline) / closes[p1];
    if (dropFromPeak < 0.03) continue;

    const confidence = Math.max(0.5, 1 - priceDiff * 10);
    patterns.push({
      type: "double_top",
      confidence,
      startIndex: p1,
      endIndex: p2,
      description: "쌍봉(Double Top) - 두 번의 고점 형성 후 하락 예상",
      signal: "bearish",
      targetPrice: neckline - (closes[p1] - neckline),
    });
  }

  // Double Bottom
  const valleys = findValleys(closes, 5);
  for (let i = 0; i < valleys.length - 1; i++) {
    const v1 = valleys[i];
    const v2 = valleys[i + 1];
    const gap = v2 - v1;
    if (gap < 10 || gap > 60) continue;
    const priceDiff = Math.abs(closes[v1] - closes[v2]) / closes[v1];
    if (priceDiff > 0.03) continue;

    const necklineSlice = closes.slice(v1, v2 + 1);
    const neckline = Math.max(...necklineSlice);
    const riseFromBottom = (neckline - closes[v1]) / closes[v1];
    if (riseFromBottom < 0.03) continue;

    const confidence = Math.max(0.5, 1 - priceDiff * 10);
    patterns.push({
      type: "double_bottom",
      confidence,
      startIndex: v1,
      endIndex: v2,
      description: "쌍바닥(Double Bottom) - 두 번의 저점 형성 후 상승 예상",
      signal: "bullish",
      targetPrice: neckline + (neckline - closes[v1]),
    });
  }

  // Head and Shoulders
  for (let i = 0; i < peaks.length - 2; i++) {
    const left = peaks[i];
    const head = peaks[i + 1];
    const right = peaks[i + 2];
    if (head - left < 8 || right - head < 8) continue;
    if (closes[head] <= closes[left] || closes[head] <= closes[right]) continue;
    const shoulderDiff = Math.abs(closes[left] - closes[right]) / closes[left];
    if (shoulderDiff > 0.05) continue;

    const neckline = (closes[left] + closes[right]) / 2 * 0.97;
    const confidence = Math.max(0.5, 1 - shoulderDiff * 5);
    patterns.push({
      type: "head_and_shoulders",
      confidence,
      startIndex: left,
      endIndex: right,
      description: "헤드앤숄더(H&S) - 상승 추세 반전, 하락 신호",
      signal: "bearish",
      targetPrice: neckline - (closes[head] - neckline),
    });
  }

  // Inverse Head and Shoulders
  for (let i = 0; i < valleys.length - 2; i++) {
    const left = valleys[i];
    const head = valleys[i + 1];
    const right = valleys[i + 2];
    if (head - left < 8 || right - head < 8) continue;
    if (closes[head] >= closes[left] || closes[head] >= closes[right]) continue;
    const shoulderDiff = Math.abs(closes[left] - closes[right]) / closes[left];
    if (shoulderDiff > 0.05) continue;

    const neckline = (closes[left] + closes[right]) / 2 * 1.03;
    const confidence = Math.max(0.5, 1 - shoulderDiff * 5);
    patterns.push({
      type: "inverse_head_and_shoulders",
      confidence,
      startIndex: left,
      endIndex: right,
      description: "역헤드앤숄더(Inverse H&S) - 하락 추세 반전, 상승 신호",
      signal: "bullish",
      targetPrice: neckline + (neckline - closes[head]),
    });
  }

  // Cup and Handle
  if (candles.length >= 40) {
    for (let start = 0; start < candles.length - 40; start++) {
      const end = Math.min(start + 60, candles.length - 1);
      const slice = closes.slice(start, end);
      const leftPeak = slice[0];
      const bottomIdx = slice.indexOf(Math.min(...slice));
      const rightSection = slice.slice(bottomIdx);
      const rightPeak = Math.max(...rightSection);
      const peakDiff = Math.abs(leftPeak - rightPeak) / leftPeak;
      const cupDepth = (leftPeak - slice[bottomIdx]) / leftPeak;

      if (cupDepth < 0.1 || cupDepth > 0.5) continue;
      if (peakDiff > 0.05) continue;
      if (bottomIdx < 5 || bottomIdx > slice.length * 0.7) continue;

      patterns.push({
        type: "cup_and_handle",
        confidence: 0.65,
        startIndex: start,
        endIndex: start + end,
        description: "컵앤핸들(Cup & Handle) - 강력한 상승 지속 패턴",
        signal: "bullish",
        targetPrice: rightPeak * (1 + cupDepth),
      });
      break;
    }
  }

  // Dead Cat Bounce
  for (let i = 20; i < candles.length - 5; i++) {
    const recentHigh = Math.max(...closes.slice(i - 20, i));
    const currentLow = closes[i];
    const drop = (recentHigh - currentLow) / recentHigh;
    if (drop < 0.15) continue;

    const bounceHigh = Math.max(...closes.slice(i, Math.min(i + 10, closes.length)));
    const bounce = (bounceHigh - currentLow) / currentLow;
    if (bounce < 0.03 || bounce > 0.15) continue;

    patterns.push({
      type: "dead_cat_bounce",
      confidence: 0.55,
      startIndex: i - 5,
      endIndex: Math.min(i + 10, closes.length - 1),
      description: "데드캣 바운스 - 급락 후 일시적 반등, 추가 하락 가능",
      signal: "bearish",
    });
    break;
  }

  // Ascending Triangle
  if (candles.length >= 20) {
    const recentCandles = candles.slice(-30);
    const recentCloses = recentCandles.map((c) => c.close);
    const recentHighs = recentCandles.map((c) => c.high);
    const recentLows = recentCandles.map((c) => c.low);
    const maxHigh = Math.max(...recentHighs);
    const minHigh = Math.min(...recentHighs);
    const firstLow = recentLows[0];
    const lastLow = recentLows[recentLows.length - 1];

    if (
      (maxHigh - minHigh) / maxHigh < 0.02 &&
      lastLow > firstLow * 1.02
    ) {
      patterns.push({
        type: "ascending_triangle",
        confidence: 0.6,
        startIndex: candles.length - 30,
        endIndex: candles.length - 1,
        description: "상승 삼각형(Ascending Triangle) - 저항선 돌파 시 강한 상승",
        signal: "bullish",
        targetPrice: maxHigh * 1.05,
      });
    }

    // Descending Triangle
    const maxLow = Math.max(...recentLows);
    const minLow = Math.min(...recentLows);
    const firstHigh = recentHighs[0];
    const lastHigh = recentHighs[recentHighs.length - 1];

    if (
      (maxLow - minLow) / maxLow < 0.02 &&
      lastHigh < firstHigh * 0.98
    ) {
      patterns.push({
        type: "descending_triangle",
        confidence: 0.6,
        startIndex: candles.length - 30,
        endIndex: candles.length - 1,
        description: "하락 삼각형(Descending Triangle) - 지지선 이탈 시 강한 하락",
        signal: "bearish",
        targetPrice: minLow * 0.95,
      });
    }
  }

  // Remove duplicates (keep highest confidence)
  const seen = new Set<string>();
  return patterns
    .sort((a, b) => b.confidence - a.confidence)
    .filter((p) => {
      if (seen.has(p.type)) return false;
      seen.add(p.type);
      return true;
    });
}

// ─────────────────────────────────────────────
// Overall Signal
// ─────────────────────────────────────────────
export function getOverallSignal(
  indicators: TechnicalIndicators,
  patterns: PatternResult[],
  currentIndex: number
): { signal: "buy" | "sell" | "neutral"; score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const rsi = indicators.rsi[currentIndex];
  if (rsi != null) {
    if (rsi < 30) { score += 2; reasons.push(`RSI 과매도 (${rsi.toFixed(1)})`); }
    else if (rsi > 70) { score -= 2; reasons.push(`RSI 과매수 (${rsi.toFixed(1)})`); }
  }

  const macd = indicators.macd.macd[currentIndex];
  const macdSignal = indicators.macd.signal[currentIndex];
  if (macd != null && macdSignal != null) {
    if (macd > macdSignal) { score += 1; reasons.push("MACD 골든크로스"); }
    else { score -= 1; reasons.push("MACD 데드크로스"); }
  }

  const ma5 = indicators.ma5[currentIndex];
  const ma20 = indicators.ma20[currentIndex];
  if (ma5 != null && ma20 != null) {
    if (ma5 > ma20) { score += 1; reasons.push("단기 이평선 > 중기 이평선"); }
    else { score -= 1; reasons.push("단기 이평선 < 중기 이평선"); }
  }

  for (const pattern of patterns) {
    if (pattern.signal === "bullish") { score += 1; reasons.push(pattern.description.split(" - ")[0]); }
    else if (pattern.signal === "bearish") { score -= 1; reasons.push(pattern.description.split(" - ")[0]); }
  }

  return {
    signal: score >= 2 ? "buy" : score <= -2 ? "sell" : "neutral",
    score,
    reasons,
  };
}
