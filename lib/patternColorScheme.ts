import type { PatternType } from "@/shared/stockTypes";

/**
 * 패턴 신호별 색상 체계
 * 상승 반전 패턴 (초록/파랑): 쌍바닥, 역헤드앤숄더, 상승삼각형, 약세 쐐기, 약세 깃발
 * 하락 반전 패턴 (빨강/주황): 쌍봉, 헤드앤숄더, 하락삼각형, 상승 쐐기, 강세 깃발
 * 중립/지속 패턴 (파랑): 대칭삼각형, 플래그/페넌트, 다이버전스
 */

export const PATTERN_COLOR_SCHEME: Record<
  PatternType,
  {
    signal: "bullish" | "bearish" | "neutral";
    colorFamily: "green" | "red" | "blue";
    description: string;
  }
> = {
  // 상승 반전 패턴 (초록 계열)
  double_bottom: {
    signal: "bullish",
    colorFamily: "green",
    description: "쌍바닥 - 강한 지지선에서 두 번 반등",
  },
  inverse_head_and_shoulders: {
    signal: "bullish",
    colorFamily: "green",
    description: "역헤드앤숄더 - 하락 추세의 끝에서 상승 반전",
  },
  ascending_triangle: {
    signal: "bullish",
    colorFamily: "green",
    description: "상승삼각형 - 저항선 돌파 시 강한 상승",
  },
  falling_wedge: {
    signal: "bullish",
    colorFamily: "green",
    description: "하락 쐐기 - 상단 돌파 시 상승 반전",
  },
  bear_flag: {
    signal: "bullish",
    colorFamily: "green",
    description: "약세 깃발 - 강한 하락 후 반등 채널",
  },

  // 하락 반전 패턴 (빨강 계열)
  double_top: {
    signal: "bearish",
    colorFamily: "red",
    description: "쌍봉 - 강한 저항선에서 두 번 막힘",
  },
  head_and_shoulders: {
    signal: "bearish",
    colorFamily: "red",
    description: "헤드앤숄더 - 상승 추세의 끝에서 하락 반전",
  },
  descending_triangle: {
    signal: "bearish",
    colorFamily: "red",
    description: "하락삼각형 - 지지선 이탈 시 강한 하락",
  },
  rising_wedge: {
    signal: "bearish",
    colorFamily: "red",
    description: "상승 쐐기 - 하단 이탈 시 하락 반전",
  },
  bull_flag: {
    signal: "bearish",
    colorFamily: "red",
    description: "강세 깃발 - 강한 상승 후 조정 채널",
  },

  // 지속/중립 패턴 (파랑 계열)
  cup_and_handle: {
    signal: "bullish",
    colorFamily: "blue",
    description: "컵앤핸들 - 강력한 상승 지속 패턴",
  },
  symmetrical_triangle: {
    signal: "neutral",
    colorFamily: "blue",
    description: "대칭삼각형 - 방향성 돌파 대기",
  },
  dead_cat_bounce: {
    signal: "bearish",
    colorFamily: "red",
    description: "데드캣 바운스 - 일시적 반등, 추가 하락 가능",
  },
  flag_pennant: {
    signal: "bullish",
    colorFamily: "blue",
    description: "플래그/페넌트 - 급등 후 횡보, 돌파 신호",
  },
  rsi_divergence: {
    signal: "bullish",
    colorFamily: "blue",
    description: "RSI 다이버전스 - 가격과 지표의 반대 움직임",
  },
  macd_divergence: {
    signal: "bullish",
    colorFamily: "blue",
    description: "MACD 다이버전스 - 가격과 지표의 반대 움직임",
  },
};

/**
 * 색상 패밀리별 RGB 값
 */
export const COLOR_PALETTE = {
  green: {
    light: "#10B981", // 밝은 초록
    dark: "#059669", // 어두운 초록
    veryLight: "#D1FAE5", // 매우 밝은 초록
  },
  red: {
    light: "#EF4444", // 밝은 빨강
    dark: "#DC2626", // 어두운 빨강
    veryLight: "#FEE2E2", // 매우 밝은 빨강
  },
  blue: {
    light: "#3B82F6", // 밝은 파랑
    dark: "#1D4ED8", // 어두운 파랑
    veryLight: "#DBEAFE", // 매우 밝은 파랑
  },
};

/**
 * 패턴 타입으로부터 색상 정보 조회
 */
export function getPatternColor(patternType: PatternType) {
  const scheme = PATTERN_COLOR_SCHEME[patternType];
  if (!scheme) return COLOR_PALETTE.blue;

  const family = scheme.colorFamily;
  return COLOR_PALETTE[family];
}

/**
 * 패턴 신호별 색상 조회
 */
export function getSignalColor(signal: "bullish" | "bearish" | "neutral") {
  switch (signal) {
    case "bullish":
      return COLOR_PALETTE.green.light;
    case "bearish":
      return COLOR_PALETTE.red.light;
    case "neutral":
      return COLOR_PALETTE.blue.light;
  }
}
