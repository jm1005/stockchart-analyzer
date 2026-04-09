import type { TechnicalIndicators, Candle, PatternResult, SupportResistanceLevel } from "@/shared/stockTypes";

export interface AnalysisComment {
  category: "moving_average" | "rsi" | "macd" | "bollinger_bands" | "support_resistance" | "pattern" | "price_action";
  title: string;
  description: string;
  signal: "bullish" | "bearish" | "neutral";
  confidence: number; // 0-1
}

/**
 * 이동평균선 분석 코멘트 생성
 * MA5/20/60의 관계와 골든크로스/데드크로스 감지
 */
export function generateMAComments(indicators: TechnicalIndicators, candles: Candle[]): AnalysisComment[] {
  const comments: AnalysisComment[] = [];
  const lastIdx = candles.length - 1;

  const ma5 = indicators.ma5[lastIdx];
  const ma20 = indicators.ma20[lastIdx];
  const ma60 = indicators.ma60[lastIdx];
  const currentPrice = candles[lastIdx].close;

  if (!ma5 || !ma20 || !ma60) return comments;

  // 골든크로스 감지 (MA5 > MA20 > MA60)
  if (ma5 > ma20 && ma20 > ma60) {
    comments.push({
      category: "moving_average",
      title: "강한 상승 추세 (골든크로스)",
      description: `단기(MA5: ${ma5.toFixed(0)}) > 중기(MA20: ${ma20.toFixed(0)}) > 장기(MA60: ${ma60.toFixed(0)}) 이동평균선이 정렬되어 있습니다. 이는 강한 상승 추세를 나타내며, 특히 MA5가 MA20을 상향 돌파한 골든크로스 신호입니다. 단기 매수 기회로 평가됩니다.`,
      signal: "bullish",
      confidence: 0.85,
    });
  }

  // 데드크로스 감지 (MA5 < MA20 < MA60)
  if (ma5 < ma20 && ma20 < ma60) {
    comments.push({
      category: "moving_average",
      title: "약한 하락 추세 (데드크로스)",
      description: `단기(MA5: ${ma5.toFixed(0)}) < 중기(MA20: ${ma20.toFixed(0)}) < 장기(MA60: ${ma60.toFixed(0)}) 이동평균선이 역순으로 정렬되어 있습니다. 이는 하락 추세를 나타내며, MA5가 MA20을 하향 돌파한 데드크로스 신호입니다. 단기 매도 신호로 평가됩니다.`,
      signal: "bearish",
      confidence: 0.85,
    });
  }

  // 현재가 vs MA20 비교
  if (currentPrice > ma20 * 1.05) {
    comments.push({
      category: "moving_average",
      title: "현재가가 중기 이동평균선 상단 (강세)",
      description: `현재가(${currentPrice.toFixed(0)})가 MA20(${ma20.toFixed(0)})보다 5% 이상 높습니다. 단기 강세 신호이며, MA20이 지지선 역할을 할 가능성이 높습니다.`,
      signal: "bullish",
      confidence: 0.7,
    });
  } else if (currentPrice < ma20 * 0.95) {
    comments.push({
      category: "moving_average",
      title: "현재가가 중기 이동평균선 하단 (약세)",
      description: `현재가(${currentPrice.toFixed(0)})가 MA20(${ma20.toFixed(0)})보다 5% 이상 낮습니다. 단기 약세 신호이며, MA20이 저항선 역할을 할 가능성이 높습니다.`,
      signal: "bearish",
      confidence: 0.7,
    });
  }

  return comments;
}

/**
 * RSI 분석 코멘트 생성
 * 과매수/과매도 상태 감지
 */
export function generateRSIComments(indicators: TechnicalIndicators): AnalysisComment[] {
  const comments: AnalysisComment[] = [];
  const lastRSI = indicators.rsi[indicators.rsi.length - 1];

  if (lastRSI === null || lastRSI === undefined) return comments;

  if (lastRSI > 70) {
    comments.push({
      category: "rsi",
      title: "과매수 상태 (RSI > 70)",
      description: `RSI가 ${lastRSI.toFixed(1)}로 과매수 영역에 진입했습니다. 이는 가격이 과도하게 상승했음을 의미하며, 단기적으로 조정이나 하락이 발생할 수 있습니다. 기존 매수 포지션의 익절을 고려하거나, 신규 매수는 신중하게 접근하세요.`,
      signal: "bearish",
      confidence: 0.75,
    });
  } else if (lastRSI < 30) {
    comments.push({
      category: "rsi",
      title: "과매도 상태 (RSI < 30)",
      description: `RSI가 ${lastRSI.toFixed(1)}로 과매도 영역에 진입했습니다. 이는 가격이 과도하게 하락했음을 의미하며, 단기적으로 반등이나 상승이 발생할 수 있습니다. 저가 매수 기회로 평가되지만, 추세 확인 후 진입하세요.`,
      signal: "bullish",
      confidence: 0.75,
    });
  } else if (lastRSI > 50) {
    comments.push({
      category: "rsi",
      title: "중립 상태 (RSI 50~70)",
      description: `RSI가 ${lastRSI.toFixed(1)}로 중립 상태입니다. 상승 추세 중이지만 과매수는 아닙니다. 추세 추종 매수 기회로 평가됩니다.`,
      signal: "bullish",
      confidence: 0.6,
    });
  } else {
    comments.push({
      category: "rsi",
      title: "중립 상태 (RSI 30~50)",
      description: `RSI가 ${lastRSI.toFixed(1)}로 중립 상태입니다. 하락 추세 중이지만 과매도는 아닙니다. 추세 추종 매도 기회로 평가됩니다.`,
      signal: "bearish",
      confidence: 0.6,
    });
  }

  return comments;
}

/**
 * MACD 분석 코멘트 생성
 * 신호선 교차 및 히스토그램 분석
 */
export function generateMACDComments(indicators: TechnicalIndicators): AnalysisComment[] {
  const comments: AnalysisComment[] = [];
  const lastIdx = indicators.macd.macd.length - 1;
  const prevIdx = Math.max(0, lastIdx - 1);

  const macd = indicators.macd.macd[lastIdx];
  const signal = indicators.macd.signal[lastIdx];
  const histogram = indicators.macd.histogram[lastIdx];
  const prevHistogram = indicators.macd.histogram[prevIdx];

  if (macd === null || signal === null || histogram === null) return comments;

  // MACD가 신호선을 상향 돌파 (골든크로스)
  if (macd > signal && prevHistogram !== null && prevHistogram < 0) {
    comments.push({
      category: "macd",
      title: "MACD 골든크로스 (매수 신호)",
      description: `MACD(${macd.toFixed(2)})가 신호선(${signal.toFixed(2)})을 상향 돌파했습니다. 이는 강한 매수 신호이며, 특히 히스토그램이 음수에서 양수로 전환되었습니다. 상승 추세의 시작을 나타냅니다.`,
      signal: "bullish",
      confidence: 0.8,
    });
  }

  // MACD가 신호선을 하향 돌파 (데드크로스)
  if (macd < signal && prevHistogram !== null && prevHistogram > 0) {
    comments.push({
      category: "macd",
      title: "MACD 데드크로스 (매도 신호)",
      description: `MACD(${macd.toFixed(2)})가 신호선(${signal.toFixed(2)})을 하향 돌파했습니다. 이는 강한 매도 신호이며, 특히 히스토그램이 양수에서 음수로 전환되었습니다. 하락 추세의 시작을 나타냅니다.`,
      signal: "bearish",
      confidence: 0.8,
    });
  }

  // 히스토그램 발산 (강한 추세)
  if (histogram > 0 && histogram > Math.abs(prevHistogram ?? 0) * 1.2) {
    comments.push({
      category: "macd",
      title: "MACD 히스토그램 확대 (상승 강화)",
      description: `MACD 히스토그램이 확대되고 있습니다. 이는 상승 추세의 강도가 증가하고 있음을 의미합니다. 매수 신호의 신뢰도가 높아집니다.`,
      signal: "bullish",
      confidence: 0.75,
    });
  } else if (histogram < 0 && Math.abs(histogram) > Math.abs(prevHistogram ?? 0) * 1.2) {
    comments.push({
      category: "macd",
      title: "MACD 히스토그램 확대 (하락 강화)",
      description: `MACD 히스토그램이 음수 방향으로 확대되고 있습니다. 이는 하락 추세의 강도가 증가하고 있음을 의미합니다. 매도 신호의 신뢰도가 높아집니다.`,
      signal: "bearish",
      confidence: 0.75,
    });
  }

  return comments;
}

/**
 * 볼린저 밴드 분석 코멘트 생성
 * 밴드 터치 및 스퀴즈 상태 감지
 */
export function generateBBComments(indicators: TechnicalIndicators, candles: Candle[]): AnalysisComment[] {
  const comments: AnalysisComment[] = [];
  const lastIdx = candles.length - 1;
  const lastPrice = candles[lastIdx].close;

  const upper = indicators.bollingerBands.upper[lastIdx];
  const middle = indicators.bollingerBands.middle[lastIdx];
  const lower = indicators.bollingerBands.lower[lastIdx];

  if (!upper || !middle || !lower) return comments;

  const bandwidth = upper - lower;
  const prevBandwidth = lastIdx > 0 ? (indicators.bollingerBands.upper[lastIdx - 1] ?? upper) - (indicators.bollingerBands.lower[lastIdx - 1] ?? lower) : bandwidth;

  // 상단 밴드 터치
  if (lastPrice > upper * 0.98) {
    comments.push({
      category: "bollinger_bands",
      title: "상단 밴드 터치 (과매수)",
      description: `가격이 상단 밴드(${upper.toFixed(0)})에 접근했습니다. 역사적으로 가격이 상단 밴드에 닿으면 조정이 발생할 확률이 높습니다. 기존 매수 포지션의 익절을 고려하세요.`,
      signal: "bearish",
      confidence: 0.7,
    });
  }

  // 하단 밴드 터치
  if (lastPrice < lower * 1.02) {
    comments.push({
      category: "bollinger_bands",
      title: "하단 밴드 터치 (과매도)",
      description: `가격이 하단 밴드(${lower.toFixed(0)})에 접근했습니다. 역사적으로 가격이 하단 밴드에 닿으면 반등이 발생할 확률이 높습니다. 저가 매수 기회로 평가됩니다.`,
      signal: "bullish",
      confidence: 0.7,
    });
  }

  // 밴드 스퀴즈 (변동성 축소)
  if (bandwidth < prevBandwidth * 0.7) {
    comments.push({
      category: "bollinger_bands",
      title: "밴드 스퀴즈 (변동성 축소)",
      description: `볼린저 밴드의 폭이 축소되고 있습니다. 이는 변동성이 낮아지고 있음을 의미하며, 곧 큰 움직임이 발생할 가능성이 높습니다. 추세 방향 확인 후 진입할 준비를 하세요.`,
      signal: "neutral",
      confidence: 0.65,
    });
  }

  return comments;
}

/**
 * 지지/저항선 분석 코멘트 생성
 */
export function generateSRComments(
  supportResistance: SupportResistanceLevel[],
  candles: Candle[]
): AnalysisComment[] {
  const comments: AnalysisComment[] = [];
  const lastPrice = candles[candles.length - 1].close;

  // 강한 지지선 찾기 (strength > 0.6)
  const strongSupport = supportResistance
    .filter((sr) => sr.type === "support" && sr.strength > 0.6)
    .sort((a, b) => b.price - a.price)
    .find((sr) => sr.price < lastPrice);

  if (strongSupport) {
    const distance = ((lastPrice - strongSupport.price) / lastPrice) * 100;
    comments.push({
      category: "support_resistance",
      title: `강한 지지선 (${strongSupport.price.toFixed(0)})`,
      description: `현재가 아래 ${distance.toFixed(1)}% 거리에 강한 지지선이 있습니다. 이 레벨에서 반등할 가능성이 높으며, 하락 시 매수 기회로 평가됩니다. 지지선 돌파 시 추가 하락이 예상됩니다.`,
      signal: "bullish",
      confidence: 0.7,
    });
  }

  // 강한 저항선 찾기 (strength > 0.6)
  const strongResistance = supportResistance
    .filter((sr) => sr.type === "resistance" && sr.strength > 0.6)
    .sort((a, b) => a.price - b.price)
    .find((sr) => sr.price > lastPrice);

  if (strongResistance) {
    const distance = ((strongResistance.price - lastPrice) / lastPrice) * 100;
    comments.push({
      category: "support_resistance",
      title: `강한 저항선 (${strongResistance.price.toFixed(0)})`,
      description: `현재가 위 ${distance.toFixed(1)}% 거리에 강한 저항선이 있습니다. 이 레벨에서 하락할 가능성이 높으며, 상승 시 익절 목표가로 평가됩니다. 저항선 돌파 시 추가 상승이 예상됩니다.`,
      signal: "bearish",
      confidence: 0.7,
    });
  }

  return comments;
}

/**
 * 패턴 분석 코멘트 생성
 */
export function generatePatternComments(patterns: PatternResult[]): AnalysisComment[] {
  const comments: AnalysisComment[] = [];

  // 신뢰도 높은 패턴만 필터링
  const highConfidencePatterns = patterns.filter((p) => p.confidence > 0.65);

  for (const pattern of highConfidencePatterns.slice(0, 2)) {
    const patternNames: Record<string, string> = {
      head_and_shoulders: "헤드앤숄더 (약세 패턴)",
      inverse_head_and_shoulders: "역헤드앤숄더 (강세 패턴)",
      double_top: "쌍봉 (약세 패턴)",
      double_bottom: "쌍바닥 (강세 패턴)",
      cup_and_handle: "컵앤핸들 (강세 패턴)",
      dead_cat_bounce: "데드캣 바운스 (약세 패턴)",
      ascending_triangle: "상승 삼각형 (강세 패턴)",
      descending_triangle: "하락 삼각형 (약세 패턴)",
    };

    const patternName = patternNames[pattern.type] || pattern.type;
    const targetText = pattern.targetPrice ? `목표가: ${pattern.targetPrice.toFixed(0)}` : "";

    comments.push({
      category: "pattern",
      title: `${patternName} (신뢰도 ${(pattern.confidence * 100).toFixed(0)}%)`,
      description: `${pattern.description} ${targetText}`,
      signal: pattern.signal,
      confidence: pattern.confidence,
    });
  }

  return comments;
}

/**
 * 모든 분석 코멘트 생성
 */
export function generateAllComments(
  indicators: TechnicalIndicators,
  candles: Candle[],
  supportResistance: SupportResistanceLevel[],
  patterns: PatternResult[]
): AnalysisComment[] {
  const allComments: AnalysisComment[] = [];

  allComments.push(...generateMAComments(indicators, candles));
  allComments.push(...generateRSIComments(indicators));
  allComments.push(...generateMACDComments(indicators));
  allComments.push(...generateBBComments(indicators, candles));
  allComments.push(...generateSRComments(supportResistance, candles));
  allComments.push(...generatePatternComments(patterns));

  // 신뢰도 기준으로 정렬
  return allComments.sort((a, b) => b.confidence - a.confidence);
}
