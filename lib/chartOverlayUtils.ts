import type { Candle, PatternResult } from "@/shared/stockTypes";

/**
 * 넥라인 (Neckline) 계산
 * 쌍바닥, 쌍봉, 헤드앤숄더 패턴의 넥라인을 계산합니다.
 */
export function calculateNeckline(
  candles: Candle[],
  pattern: PatternResult
): { startPrice: number; endPrice: number; startIndex: number; endIndex: number } | null {
  if (pattern.endIndex >= candles.length) return null;

  const patternCandles = candles.slice(pattern.startIndex, pattern.endIndex + 1);

  switch (pattern.type) {
    // 쌍바닥: 두 골짜기 사이의 반등 지점을 연결
    case "double_bottom": {
      const lows = patternCandles.map((c) => c.low);
      const minLow1Idx = lows.indexOf(Math.min(...lows.slice(0, Math.floor(lows.length / 2))));
      const minLow2Idx =
        Math.floor(lows.length / 2) + lows.slice(Math.floor(lows.length / 2)).indexOf(Math.min(...lows.slice(Math.floor(lows.length / 2))));

      if (minLow1Idx === -1 || minLow2Idx === -1) return null;

      const middleIdx = Math.floor((minLow1Idx + minLow2Idx) / 2);
      const necklinePrice = Math.max(
        patternCandles[minLow1Idx].high,
        patternCandles[minLow2Idx].high,
        patternCandles[middleIdx].high
      );

      return {
        startPrice: necklinePrice,
        endPrice: necklinePrice,
        startIndex: pattern.startIndex + minLow1Idx,
        endIndex: pattern.startIndex + minLow2Idx,
      };
    }

    // 쌍봉: 두 봉우리 사이의 조정 지점을 연결
    case "double_top": {
      const highs = patternCandles.map((c) => c.high);
      const maxHigh1Idx = highs.indexOf(Math.max(...highs.slice(0, Math.floor(highs.length / 2))));
      const maxHigh2Idx =
        Math.floor(highs.length / 2) + highs.slice(Math.floor(highs.length / 2)).indexOf(Math.max(...highs.slice(Math.floor(highs.length / 2))));

      if (maxHigh1Idx === -1 || maxHigh2Idx === -1) return null;

      const middleIdx = Math.floor((maxHigh1Idx + maxHigh2Idx) / 2);
      const necklinePrice = Math.min(
        patternCandles[maxHigh1Idx].low,
        patternCandles[maxHigh2Idx].low,
        patternCandles[middleIdx].low
      );

      return {
        startPrice: necklinePrice,
        endPrice: necklinePrice,
        startIndex: pattern.startIndex + maxHigh1Idx,
        endIndex: pattern.startIndex + maxHigh2Idx,
      };
    }

    // 헤드앤숄더: 왼쪽 어깨, 머리, 오른쪽 어깨를 연결하는 넥라인
    case "head_and_shoulders": {
      const highs = patternCandles.map((c) => c.high);
      const thirdLength = Math.floor(highs.length / 3);

      // 왼쪽 어깨 (첫 번째 봉우리)
      const leftShoulderIdx = highs.indexOf(Math.max(...highs.slice(0, thirdLength)));

      // 머리 (두 번째 봉우리, 가장 높음)
      const headIdx = thirdLength + highs.slice(thirdLength, thirdLength * 2).indexOf(Math.max(...highs.slice(thirdLength, thirdLength * 2)));

      // 오른쪽 어깨 (세 번째 봉우리)
      const rightShoulderIdx = thirdLength * 2 + highs.slice(thirdLength * 2).indexOf(Math.max(...highs.slice(thirdLength * 2)));

      if (leftShoulderIdx === -1 || headIdx === -1 || rightShoulderIdx === -1) return null;

      // 넥라인: 왼쪽 어깨 저점과 오른쪽 어깨 저점을 연결
      const leftLow = patternCandles[leftShoulderIdx].low;
      const rightLow = patternCandles[rightShoulderIdx].low;

      // 선형 보간으로 중간 넥라인 가격 계산
      const necklineSlope = (rightLow - leftLow) / (rightShoulderIdx - leftShoulderIdx);
      const midNecklinePrice = leftLow + necklineSlope * (headIdx - leftShoulderIdx);

      return {
        startPrice: leftLow,
        endPrice: rightLow,
        startIndex: pattern.startIndex + leftShoulderIdx,
        endIndex: pattern.startIndex + rightShoulderIdx,
      };
    }

    // 역헤드앤숄더: 헤드앤숄더와 반대
    case "inverse_head_and_shoulders": {
      const lows = patternCandles.map((c) => c.low);
      const thirdLength = Math.floor(lows.length / 3);

      const leftShoulderIdx = lows.indexOf(Math.min(...lows.slice(0, thirdLength)));
      const headIdx = thirdLength + lows.slice(thirdLength, thirdLength * 2).indexOf(Math.min(...lows.slice(thirdLength, thirdLength * 2)));
      const rightShoulderIdx = thirdLength * 2 + lows.slice(thirdLength * 2).indexOf(Math.min(...lows.slice(thirdLength * 2)));

      if (leftShoulderIdx === -1 || headIdx === -1 || rightShoulderIdx === -1) return null;

      const leftHigh = patternCandles[leftShoulderIdx].high;
      const rightHigh = patternCandles[rightShoulderIdx].high;

      return {
        startPrice: leftHigh,
        endPrice: rightHigh,
        startIndex: pattern.startIndex + leftShoulderIdx,
        endIndex: pattern.startIndex + rightShoulderIdx,
      };
    }

    default:
      return null;
  }
}

/**
 * 목표가 (Price Target) 계산
 * 패턴 유형에 따라 목표가를 계산합니다.
 */
export function calculatePriceTarget(
  candles: Candle[],
  pattern: PatternResult
): number | null {
  if (!pattern.targetPrice) return null;
  return pattern.targetPrice;
}

/**
 * 차트 좌표 변환 (가격 → 픽셀)
 */
export function priceToPixelY(
  price: number,
  minPrice: number,
  maxPrice: number,
  chartHeight: number,
  chartPaddingTop: number = 0,
  chartPaddingBottom: number = 0
): number {
  const availableHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
  const priceRange = maxPrice - minPrice;
  const normalizedPrice = (price - minPrice) / priceRange;
  return chartPaddingTop + (1 - normalizedPrice) * availableHeight;
}

/**
 * 인덱스 → 픽셀 X 좌표 변환
 */
export function indexToPixelX(
  index: number,
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  chartPaddingLeft: number = 0,
  chartPaddingRight: number = 0
): number {
  const availableWidth = chartWidth - chartPaddingLeft - chartPaddingRight;
  const indexRange = endIndex - startIndex;
  if (indexRange === 0) return chartPaddingLeft;
  const normalizedIndex = (index - startIndex) / indexRange;
  return chartPaddingLeft + normalizedIndex * availableWidth;
}

/**
 * 쌍바닥 패턴 오버레이 정보 생성
 */
export function getDoubleBottomOverlay(
  candles: Candle[],
  pattern: PatternResult,
  chartWidth: number,
  chartHeight: number
) {
  const neckline = calculateNeckline(candles, pattern);
  if (!neckline) return null;

  const visibleCandles = candles.slice(Math.max(0, pattern.startIndex - 5), pattern.endIndex + 10);
  const minPrice = Math.min(...visibleCandles.map((c) => c.low));
  const maxPrice = Math.max(...visibleCandles.map((c) => c.high));

  const necklineY = priceToPixelY(neckline.startPrice, minPrice, maxPrice, chartHeight);
  const targetY = priceToPixelY(pattern.targetPrice || maxPrice, minPrice, maxPrice, chartHeight);

  return {
    necklineY,
    targetY,
    necklinePrice: neckline.startPrice,
    targetPrice: pattern.targetPrice,
    description: `넥라인: ₩${Math.round(neckline.startPrice).toLocaleString("ko-KR")} | 목표가: ₩${Math.round(pattern.targetPrice || 0).toLocaleString("ko-KR")}`,
  };
}
