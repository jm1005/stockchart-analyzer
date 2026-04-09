import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { StarRating } from "@/components/ui/StarRating";
import { PatternIcon } from "@/components/ui/PatternIcons";
import { getPatternColor } from "@/lib/patternColorScheme";
import type { PatternResult } from "@/shared/stockTypes";

const PATTERN_LABELS: Record<string, string> = {
  head_and_shoulders: "헤드앤숄더",
  inverse_head_and_shoulders: "역헤드앤숄더",
  double_top: "쌍봉",
  double_bottom: "쌍바닥",
  cup_and_handle: "컵앤핸들",
  dead_cat_bounce: "데드캣 바운스",
  ascending_triangle: "상승 삼각형",
  descending_triangle: "하락 삼각형",
  symmetrical_triangle: "대칭 삼각형",
  bull_flag: "강세 깃발",
  bear_flag: "약세 깃발",
  rising_wedge: "상승 쐐기",
  falling_wedge: "하락 쐐기",
};

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  head_and_shoulders:
    "세 개의 봉우리 중 가운데가 가장 높은 형태. 상승 추세의 끝에서 나타나며 하락 반전 신호입니다. 넥라인 이탈 시 매도 신호.",
  inverse_head_and_shoulders:
    "세 개의 골짜기 중 가운데가 가장 낮은 형태. 하락 추세의 끝에서 나타나며 상승 반전 신호입니다. 넥라인 돌파 시 매수 신호.",
  double_top:
    "비슷한 높이의 두 봉우리 형성. 강한 저항선에서 두 번 막힌 후 하락하는 패턴. 넥라인 이탈 시 하락 목표가 = 봉우리 높이만큼.",
  double_bottom:
    "비슷한 깊이의 두 골짜기 형성. 강한 지지선에서 두 번 반등하는 패턴. 넥라인 돌파 시 상승 목표가 = 골짜기 깊이만큼.",
  cup_and_handle:
    "컵 모양의 둥근 바닥 후 작은 조정(핸들) 형성. 강력한 상승 지속 패턴. 핸들 상단 돌파 시 강한 매수 신호.",
  dead_cat_bounce:
    "급락 후 일시적인 반등. 추세 전환이 아닌 일시적 반등으로 이후 추가 하락 가능성이 높습니다.",
  ascending_triangle:
    "수평 저항선과 상승하는 지지선으로 형성. 저항선 돌파 시 강한 상승 신호. 목표가 = 삼각형 높이만큼 상승.",
  descending_triangle:
    "수평 지지선과 하락하는 저항선으로 형성. 지지선 이탈 시 강한 하락 신호. 목표가 = 삼각형 높이만큼 하락.",
  symmetrical_triangle:
    "수렴하는 두 추세선. 방향성 돌파 대기 중. 돌파 방향으로 강한 움직임 예상.",
  bull_flag:
    "강한 상승 후 짧은 조정 채널. 채널 상단 돌파 시 이전 상승폭만큼 추가 상승 예상.",
  bear_flag:
    "강한 하락 후 짧은 반등 채널. 채널 하단 이탈 시 이전 하락폭만큼 추가 하락 예상.",
  rising_wedge:
    "수렴하는 두 상승 추세선. 하단 이탈 시 하락 반전 신호.",
  falling_wedge:
    "수렴하는 두 하락 추세선. 상단 돌파 시 상승 반전 신호.",
};

interface PatternCardProps {
  pattern: PatternResult;
  currency?: string;
}

export function PatternCard({ pattern, currency = "KRW" }: PatternCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  // 패턴 타입별 색상 조회
  const patternColor = getPatternColor(pattern.type);
  const signalColor = patternColor.light;

  const signalLabel =
    pattern.signal === "bullish" ? "▲ 상승" : pattern.signal === "bearish" ? "▼ 하락" : "◆ 중립";

  const confidencePct = Math.round(pattern.confidence * 100);

  const formatPrice = (price: number) => {
    if (currency === "KRW") return `₩${price.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`;
    return `$${price.toFixed(2)}`;
  };

  return (
    <TouchableOpacity
      onPress={() => setExpanded((v) => !v)}
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: signalColor + "44",
          borderLeftColor: signalColor,
        },
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={styles.iconRow}>
            <PatternIcon type={pattern.type} size={20} color={signalColor} />
            <Text style={[styles.patternName, { color: colors.foreground }]}>
              {PATTERN_LABELS[pattern.type] ?? pattern.type}
            </Text>
          </View>
          <View style={styles.confidenceRow}>
            <StarRating rating={pattern.confidence} size={14} showPercentage={true} />
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.signalBadge, { backgroundColor: signalColor + "22" }]}>
            <Text style={[styles.signalText, { color: signalColor }]}>{signalLabel}</Text>
          </View>
          <Text style={[styles.expandIcon, { color: colors.muted }]}>
            {expanded ? "▲" : "▼"}
          </Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={[styles.description, { color: colors.muted }]}>
            {PATTERN_DESCRIPTIONS[pattern.type] ?? pattern.description}
          </Text>
          {pattern.targetPrice != null && (
            <View style={[styles.targetRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.targetLabel, { color: colors.muted }]}>목표가</Text>
              <Text style={[styles.targetPrice, { color: signalColor }]}>
                {formatPrice(pattern.targetPrice)}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardLeft: { flex: 1, gap: 6 },
  cardRight: { alignItems: "flex-end", gap: 4, marginTop: 2 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  patternName: { fontSize: 14, fontWeight: "700", flex: 1 },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 28, marginTop: 2 },
  confidenceBar: {
    width: 80,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  confidenceFill: { height: "100%", borderRadius: 2 },
  confidenceText: { fontSize: 11 },
  signalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  signalText: { fontSize: 10, fontWeight: "600" },
  expandIcon: { fontSize: 10 },
  expandedContent: { marginTop: 10, gap: 8 },
  description: { fontSize: 13, lineHeight: 20 },
  targetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  targetLabel: { fontSize: 12 },
  targetPrice: { fontSize: 14, fontWeight: "700" },
});
