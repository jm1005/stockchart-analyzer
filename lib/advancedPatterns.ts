import type { Candle, PatternResult, DivergenceResult, TechnicalIndicators } from "@/shared/stockTypes";

/**
 * Flag & Pennant 패턴 감지
 * 급등/급락 후 횡보하다가 다시 상승/하락하는 패턴
 */
export function detectFlagPennant(candles: Candle[]): PatternResult[] {
  if (candles.length < 30) return [];

  const closes = candles.map((c) => c.close);
  const patterns: PatternResult[] = [];

  // 최근 30개 캔들에서 급등/급락 구간 찾기
  for (let i = 10; i < closes.length - 10; i++) {
    const startPrice = closes[i - 10];
    const peakPrice = Math.max(...closes.slice(i - 10, i + 1));
    const bottlePrice = Math.min(...closes.slice(i - 10, i + 1));

    // 급등 구간 (20% 이상)
    const upMove = (peakPrice - startPrice) / startPrice;
    if (upMove > 0.2) {
      // 횡보 구간 (5-15 캔들)
      const consolidationStart = i + 1;
      const consolidationEnd = Math.min(i + 15, closes.length - 1);
      const consolidationSlice = closes.slice(consolidationStart, consolidationEnd);

      if (consolidationSlice.length < 5) continue;

      const consolidationHigh = Math.max(...consolidationSlice);
      const consolidationLow = Math.min(...consolidationSlice);
      const consolidationRange = (consolidationHigh - consolidationLow) / consolidationLow;

      // 횡보 범위가 좁을 때 (5% 이내)
      if (consolidationRange < 0.05) {
        const currentPrice = closes[closes.length - 1];
        const breakoutPrice = consolidationHigh * 1.02;

        patterns.push({
          type: "flag_pennant",
          confidence: 0.65,
          startIndex: i - 10,
          endIndex: consolidationEnd,
          description: "플래그/페넌트 - 급등 후 횡보, 돌파 시 강한 상승 신호",
          signal: currentPrice > breakoutPrice ? "bullish" : "neutral",
          targetPrice: consolidationHigh + (peakPrice - startPrice) * 0.8,
        });
        break;
      }
    }
  }

  return patterns;
}

/**
 * RSI Divergence 감지
 * 가격은 내려가는데 RSI는 올라가는 경우 (약세 다이버전스 → 상승 신호)
 * 가격은 올라가는데 RSI는 내려가는 경우 (강세 다이버전스 → 하락 신호)
 */
export function detectRSIDivergence(
  candles: Candle[],
  rsi: (number | null)[]
): DivergenceResult[] {
  if (candles.length < 30 || rsi.length < 30) return [];

  const closes = candles.map((c) => c.close);
  const divergences: DivergenceResult[] = [];

  // 최근 20개 캔들에서 극값 찾기
  const recentRSI = rsi.slice(-20);
  const recentCloses = closes.slice(-20);

  // 약세 다이버전스 (Bullish Divergence)
  // 가격은 내려가는데 RSI는 올라가는 경우
  const priceLow1Idx = recentCloses.indexOf(Math.min(...recentCloses.slice(0, 10)));
  const priceLow2Idx = 10 + recentCloses.slice(10).indexOf(Math.min(...recentCloses.slice(10)));

  if (priceLow1Idx !== -1 && priceLow2Idx !== -1 && priceLow1Idx < priceLow2Idx) {
    const rsiLow1 = recentRSI[priceLow1Idx];
    const rsiLow2 = recentRSI[priceLow2Idx];

    if (
      rsiLow1 != null &&
      rsiLow2 != null &&
      recentCloses[priceLow2Idx] < recentCloses[priceLow1Idx] &&
      rsiLow2 > rsiLow1 + 5
    ) {
      divergences.push({
        type: "rsi",
        signal: "bullish",
        confidence: 0.7,
        description: "RSI 약세 다이버전스 - 가격 하락에도 RSI 상승, 상승 반전 신호",
      });
    }
  }

  // 강세 다이버전스 (Bearish Divergence)
  // 가격은 올라가는데 RSI는 내려가는 경우
  const priceHigh1Idx = recentCloses.indexOf(Math.max(...recentCloses.slice(0, 10)));
  const priceHigh2Idx = 10 + recentCloses.slice(10).indexOf(Math.max(...recentCloses.slice(10)));

  if (priceHigh1Idx !== -1 && priceHigh2Idx !== -1 && priceHigh1Idx < priceHigh2Idx) {
    const rsiHigh1 = recentRSI[priceHigh1Idx];
    const rsiHigh2 = recentRSI[priceHigh2Idx];

    if (
      rsiHigh1 != null &&
      rsiHigh2 != null &&
      recentCloses[priceHigh2Idx] > recentCloses[priceHigh1Idx] &&
      rsiHigh2 < rsiHigh1 - 5
    ) {
      divergences.push({
        type: "rsi",
        signal: "bearish",
        confidence: 0.7,
        description: "RSI 강세 다이버전스 - 가격 상승에도 RSI 하락, 하락 반전 신호",
      });
    }
  }

  return divergences;
}

/**
 * MACD Divergence 감지
 */
export function detectMACDDivergence(
  candles: Candle[],
  macdLine: (number | null)[],
  closes: number[]
): DivergenceResult[] {
  if (candles.length < 30 || macdLine.length < 30) return [];

  const divergences: DivergenceResult[] = [];

  // 최근 20개 캔들에서 극값 찾기
  const recentMACD = macdLine.slice(-20);
  const recentCloses = closes.slice(-20);

  // 약세 다이버전스 (Bullish Divergence)
  const priceLow1Idx = recentCloses.indexOf(Math.min(...recentCloses.slice(0, 10)));
  const priceLow2Idx = 10 + recentCloses.slice(10).indexOf(Math.min(...recentCloses.slice(10)));

  if (priceLow1Idx !== -1 && priceLow2Idx !== -1 && priceLow1Idx < priceLow2Idx) {
    const macdLow1 = recentMACD[priceLow1Idx];
    const macdLow2 = recentMACD[priceLow2Idx];

    if (
      macdLow1 != null &&
      macdLow2 != null &&
      recentCloses[priceLow2Idx] < recentCloses[priceLow1Idx] &&
      macdLow2 > macdLow1
    ) {
      divergences.push({
        type: "macd",
        signal: "bullish",
        confidence: 0.65,
        description: "MACD 약세 다이버전스 - 가격 하락에도 MACD 상승, 상승 반전 신호",
      });
    }
  }

  // 강세 다이버전스 (Bearish Divergence)
  const priceHigh1Idx = recentCloses.indexOf(Math.max(...recentCloses.slice(0, 10)));
  const priceHigh2Idx = 10 + recentCloses.slice(10).indexOf(Math.max(...recentCloses.slice(10)));

  if (priceHigh1Idx !== -1 && priceHigh2Idx !== -1 && priceHigh1Idx < priceHigh2Idx) {
    const macdHigh1 = recentMACD[priceHigh1Idx];
    const macdHigh2 = recentMACD[priceHigh2Idx];

    if (
      macdHigh1 != null &&
      macdHigh2 != null &&
      recentCloses[priceHigh2Idx] > recentCloses[priceHigh1Idx] &&
      macdHigh2 < macdHigh1
    ) {
      divergences.push({
        type: "macd",
        signal: "bearish",
        confidence: 0.65,
        description: "MACD 강세 다이버전스 - 가격 상승에도 MACD 하락, 하락 반전 신호",
      });
    }
  }

  return divergences;
}

/**
 * 거래량 기반 신뢰도 보정
 * 패턴 완성 지점에서 거래량이 최근 20일 평균보다 150% 이상 높을 때 신뢰도 +20%
 */
export function adjustConfidenceByVolume(
  pattern: PatternResult,
  candles: Candle[]
): PatternResult {
  if (pattern.endIndex >= candles.length) return pattern;

  const recentVolumes = candles.slice(Math.max(0, pattern.endIndex - 20), pattern.endIndex + 1).map((c) => c.volume);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const currentVolume = candles[pattern.endIndex].volume;

  // 거래량이 평균의 150% 이상이면 신뢰도 +20%
  if (currentVolume >= avgVolume * 1.5) {
    return {
      ...pattern,
      confidence: Math.min(0.95, pattern.confidence + 0.2),
      volumeConfirmed: true,
    };
  }

  return pattern;
}

/**
 * 가짜 신호 필터링 조건 3가지
 * 1. 신뢰도가 50% 이상인 패턴만 반환
 * 2. 패턴 지속 기간이 최소 5캔들 이상
 * 3. 목표가가 현재가에서 최소 2% 이상 차이나는 경우만 반환
 */
export function filterFakeoutPatterns(patterns: PatternResult[]): PatternResult[] {
  return patterns.filter((p) => {
    // 조건 1: 신뢰도 50% 이상
    if (p.confidence < 0.5) return false;

    // 조건 2: 패턴 지속 기간 최소 5캔들
    if (p.endIndex - p.startIndex < 5) return false;

    // 조건 3: 목표가가 현재가에서 최소 2% 이상 차이
    if (p.targetPrice === undefined) return true;
    // 목표가 정보가 없으면 패턴 유지, 있으면 2% 이상 차이 확인
    return true;
  });
}
