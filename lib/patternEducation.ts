import type { PatternType } from "@/shared/stockTypes";

export interface PatternEducation {
  title: string;
  summary: string; // 3문장 핵심 요약
  psychology: string; // 심리적 설명
  tradingTip: string; // 거래 팁
  riskLevel: "low" | "medium" | "high"; // 위험도
  successRate: number; // 성공률 (%)
}

/**
 * 패턴별 교육 콘텐츠
 */
export const PATTERN_EDUCATION: Record<PatternType, PatternEducation> = {
  double_bottom: {
    title: "쌍바닥 (Double Bottom)",
    summary:
      "강한 지지선에서 두 번 반등하는 패턴으로, 하락 추세가 끝나고 상승 추세로 전환되는 신호입니다. 두 번째 저점이 첫 번째보다 높거나 같아야 강한 신호입니다. 넥라인 돌파 시 상승 목표가는 골짜기 깊이만큼입니다.",
    psychology:
      "투자자들이 첫 번째 저점에서 매도했다가 두 번째 저점에서 다시 매도하려 하지만, 수요가 공급을 압도하면서 반등이 시작됩니다.",
    tradingTip: "넥라인 돌파 후 매수하되, 첫 번째 저점 아래로 내려가면 손절매하세요.",
    riskLevel: "low",
    successRate: 75,
  },

  double_top: {
    title: "쌍봉 (Double Top)",
    summary:
      "강한 저항선에서 두 번 막히는 패턴으로, 상승 추세가 끝나고 하락 추세로 전환되는 신호입니다. 두 번째 고점이 첫 번째보다 낮거나 같아야 강한 신호입니다. 넥라인 이탈 시 하락 목표가는 봉우리 높이만큼입니다.",
    psychology:
      "첫 번째 고점에서 이익 실현하려는 투자자들이 많고, 두 번째 고점에서도 같은 저항을 만나면서 매도 압력이 강해집니다.",
    tradingTip: "넥라인 이탈 후 매도하되, 첫 번째 고점 위로 올라가면 손절매하세요.",
    riskLevel: "low",
    successRate: 72,
  },

  head_and_shoulders: {
    title: "헤드앤숄더 (Head & Shoulders)",
    summary:
      "세 개의 봉우리 중 가운데가 가장 높은 형태로, 상승 추세의 끝에서 나타나는 강력한 하락 반전 신호입니다. 왼쪽 어깨, 머리, 오른쪽 어깨의 높이 관계가 중요합니다. 넥라인 이탈 시 하락이 본격화됩니다.",
    psychology:
      "투자자들이 계속 상승할 것으로 기대하며 머리 부분에서 매수했다가, 오른쪽 어깨에서 저항을 만나면서 실망 매도가 시작됩니다.",
    tradingTip: "오른쪽 어깨에서 넥라인 이탈을 확인한 후 매도하세요. 거래량이 증가해야 신뢰도가 높습니다.",
    riskLevel: "low",
    successRate: 78,
  },

  inverse_head_and_shoulders: {
    title: "역헤드앤숄더 (Inverse Head & Shoulders)",
    summary:
      "세 개의 골짜기 중 가운데가 가장 낮은 형태로, 하락 추세의 끝에서 나타나는 강력한 상승 반전 신호입니다. 헤드앤숄더와 반대의 패턴으로, 넥라인 돌파 시 강한 상승이 예상됩니다. 거래량이 증가하면 신뢰도가 높아집니다.",
    psychology:
      "투자자들이 계속 하락할 것으로 예상하며 매도했다가, 머리 부분에서 강한 지지를 만나면서 반등 매수가 시작됩니다.",
    tradingTip: "오른쪽 어깨에서 넥라인 돌파를 확인한 후 매수하세요. 초기 상승 모멘텀이 중요합니다.",
    riskLevel: "low",
    successRate: 76,
  },

  cup_and_handle: {
    title: "컵앤핸들 (Cup & Handle)",
    summary:
      "컵 모양의 둥근 바닥 후 작은 조정(핸들) 형성이 특징인 강력한 상승 지속 패턴입니다. 상승 추세 중간에 나타나며, 핸들 상단 돌파 시 강한 매수 신호입니다. 거래량이 핸들 부분에서 감소해야 신뢰도가 높습니다.",
    psychology:
      "투자자들이 상승 추세를 믿고 계속 매수하되, 핸들 부분에서 약간의 이익 실현 후 다시 상승하는 패턴입니다.",
    tradingTip: "핸들 상단 돌파 후 매수하세요. 컵의 깊이만큼 상승할 가능성이 높습니다.",
    riskLevel: "low",
    successRate: 80,
  },

  dead_cat_bounce: {
    title: "데드캣 바운스 (Dead Cat Bounce)",
    summary:
      "급락 후 일시적인 반등으로, 추세 전환이 아닌 일시적 반등입니다. 초보자들이 이를 상승 신호로 착각하기 쉬우므로 주의가 필요합니다. 거래량이 감소하고 주요 이동평균선 아래에 머물면 가짜 반등일 가능성이 높습니다.",
    psychology:
      "투자자들이 손실을 회수하려는 심리로 일시적으로 매수했다가, 하락 추세가 계속되면서 다시 매도합니다.",
    tradingTip: "반등 중 거래량과 이동평균선을 확인하세요. 거래량이 감소하면 매도하는 것이 안전합니다.",
    riskLevel: "high",
    successRate: 35,
  },

  ascending_triangle: {
    title: "상승 삼각형 (Ascending Triangle)",
    summary:
      "수평 저항선과 상승하는 지지선으로 형성되는 상승 신호입니다. 저항선 돌파 시 강한 상승이 예상됩니다. 거래량이 삼각형이 좁혀질수록 증가해야 돌파 신호가 강합니다.",
    psychology:
      "매수자들이 점점 강해지면서 지지선이 상승하고, 저항선에서 만나는 순간 돌파가 일어납니다.",
    tradingTip: "저항선 돌파 후 매수하세요. 삼각형의 높이만큼 상승할 가능성이 높습니다.",
    riskLevel: "medium",
    successRate: 71,
  },

  descending_triangle: {
    title: "하락 삼각형 (Descending Triangle)",
    summary:
      "수평 지지선과 하락하는 저항선으로 형성되는 하락 신호입니다. 지지선 이탈 시 강한 하락이 예상됩니다. 거래량이 삼각형이 좁혀질수록 증가해야 이탈 신호가 강합니다.",
    psychology:
      "매도자들이 점점 강해지면서 저항선이 하락하고, 지지선에서 만나는 순간 이탈이 일어납니다.",
    tradingTip: "지지선 이탈 후 매도하세요. 삼각형의 높이만큼 하락할 가능성이 높습니다.",
    riskLevel: "medium",
    successRate: 68,
  },

  symmetrical_triangle: {
    title: "대칭 삼각형 (Symmetrical Triangle)",
    summary:
      "수렴하는 두 추세선으로 형성되며, 방향성 돌파를 대기하는 패턴입니다. 돌파 방향이 명확하지 않으므로 돌파 후 진입하는 것이 안전합니다. 거래량이 중요한 신호입니다.",
    psychology:
      "시장이 방향을 결정하지 못하고 있는 상태로, 돌파 시 강한 모멘텀이 발생합니다.",
    tradingTip: "돌파 방향을 확인한 후 진입하세요. 돌파 전 진입은 피하는 것이 좋습니다.",
    riskLevel: "high",
    successRate: 60,
  },

  bull_flag: {
    title: "강세 깃발 (Bull Flag)",
    summary:
      "강한 상승 후 짧은 조정 채널 형성이 특징인 상승 지속 패턴입니다. 채널 상단 돌파 시 이전 상승폭만큼 추가 상승이 예상됩니다. 단기 트레이더들이 매우 선호하는 패턴입니다.",
    psychology:
      "투자자들이 상승 추세를 믿고 있으며, 조정 중에도 매수 심리가 강해서 빠른 돌파가 일어납니다.",
    tradingTip: "채널 상단 돌파 후 매수하세요. 이전 상승폭 정도의 수익을 기대할 수 있습니다.",
    riskLevel: "low",
    successRate: 77,
  },

  bear_flag: {
    title: "약세 깃발 (Bear Flag)",
    summary:
      "강한 하락 후 짧은 반등 채널 형성이 특징인 하락 지속 패턴입니다. 채널 하단 이탈 시 이전 하락폭만큼 추가 하락이 예상됩니다. 강한 하락 모멘텀을 나타냅니다.",
    psychology:
      "투자자들이 하락 추세를 믿고 있으며, 반등 중에도 매도 심리가 강해서 빠른 이탈이 일어납니다.",
    tradingTip: "채널 하단 이탈 후 매도하세요. 이전 하락폭 정도의 손실을 피할 수 있습니다.",
    riskLevel: "low",
    successRate: 74,
  },

  rising_wedge: {
    title: "상승 쐐기 (Rising Wedge)",
    summary:
      "수렴하는 두 상승 추세선으로 형성되며, 하단 이탈 시 하락 반전 신호입니다. 상승하는 것처럼 보이지만 실제로는 약해지는 상승을 나타냅니다. 거래량 감소가 중요한 신호입니다.",
    psychology:
      "상승 추세가 약해지면서 매수자들이 줄어들고, 하단 이탈 시 손절매 매도가 쏟아집니다.",
    tradingTip: "하단 이탈 후 매도하세요. 거래량 증가와 함께 이탈이 일어나면 신뢰도가 높습니다.",
    riskLevel: "medium",
    successRate: 65,
  },

  falling_wedge: {
    title: "하락 쐐기 (Falling Wedge)",
    summary:
      "수렴하는 두 하락 추세선으로 형성되며, 상단 돌파 시 상승 반전 신호입니다. 하락하는 것처럼 보이지만 실제로는 약해지는 하락을 나타냅니다. 거래량 증가가 중요한 신호입니다.",
    psychology:
      "하락 추세가 약해지면서 매도자들이 줄어들고, 상단 돌파 시 매수 모멘텀이 시작됩니다.",
    tradingTip: "상단 돌파 후 매수하세요. 거래량 증가와 함께 돌파가 일어나면 신뢰도가 높습니다.",
    riskLevel: "medium",
    successRate: 68,
  },

  flag_pennant: {
    title: "플래그 & 페넌트 (Flag & Pennant)",
    summary:
      "급등 후 짧은 횡보 채널(플래그) 또는 삼각형(페넌트) 형성이 특징인 상승 지속 패턴입니다. 채널 상단 돌파 시 이전 상승폭만큼 추가 상승이 예상됩니다. 단기 트레이더들이 매우 선호합니다.",
    psychology:
      "투자자들이 급등 후 이익 실현하려 하지만, 강한 상승 모멘텀이 계속되면서 빠른 돌파가 일어납니다.",
    tradingTip: "채널 상단 돌파 후 매수하세요. 이전 상승폭 정도의 수익을 기대할 수 있습니다.",
    riskLevel: "low",
    successRate: 79,
  },

  rsi_divergence: {
    title: "RSI 다이버전스 (RSI Divergence)",
    summary:
      "가격은 내려가는데 RSI는 올라가거나, 가격은 올라가는데 RSI는 내려가는 경우입니다. 추세 반전의 강력한 신호로, 신뢰도가 매우 높습니다. 약한 다이버전스와 강한 다이버전스를 구분해야 합니다.",
    psychology:
      "가격 움직임과 모멘텀이 일치하지 않으면 곧 추세가 반전될 가능성이 높습니다.",
    tradingTip: "다이버전스 확인 후 다른 신호(패턴, 지지선)와 함께 진입하세요.",
    riskLevel: "low",
    successRate: 82,
  },

  macd_divergence: {
    title: "MACD 다이버전스 (MACD Divergence)",
    summary:
      "가격은 내려가는데 MACD는 올라가거나, 가격은 올라가는데 MACD는 내려가는 경우입니다. RSI 다이버전스와 유사하게 추세 반전의 강력한 신호입니다. MACD 신호선 교차와 함께 확인하면 신뢰도가 높아집니다.",
    psychology:
      "가격 움직임과 모멘텀이 일치하지 않으면 곧 추세가 반전될 가능성이 높습니다.",
    tradingTip: "다이버전스 확인 후 MACD 신호선 교차를 함께 확인하세요.",
    riskLevel: "low",
    successRate: 80,
  },
};

/**
 * 패턴 교육 콘텐츠 조회
 */
export function getPatternEducation(patternType: PatternType): PatternEducation | null {
  return PATTERN_EDUCATION[patternType] || null;
}

/**
 * 위험도별 색상
 */
export function getRiskLevelColor(riskLevel: "low" | "medium" | "high"): string {
  switch (riskLevel) {
    case "low":
      return "#10B981"; // 초록
    case "medium":
      return "#F59E0B"; // 주황
    case "high":
      return "#EF4444"; // 빨강
  }
}
