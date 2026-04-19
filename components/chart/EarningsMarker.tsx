import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { G, Circle, Text as SvgText } from "react-native-svg";
import type { EarningsEvent } from "@/shared/stockTypes";

interface EarningsMarkerProps {
  earnings: EarningsEvent[];
  candles: Array<{ timestamp: number }>;
  toX: (index: number) => number;
  chartHeight: number;
  colors: any;
  onMarkerPress?: (event: EarningsEvent) => void;
}

export function EarningsMarker({
  earnings,
  candles,
  toX,
  chartHeight,
  colors,
  onMarkerPress,
}: EarningsMarkerProps) {
  const [selectedEarning, setSelectedEarning] = useState<EarningsEvent | null>(null);

  // 어닝 날짜와 가장 가까운 캔들 인덱스 찾기
  const getClosestCandleIndex = (earningDate: number): number | null => {
    let closestIdx = -1;
    let minDiff = Infinity;

    for (let i = 0; i < candles.length; i++) {
      const diff = Math.abs(candles[i].timestamp - earningDate);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    return closestIdx >= 0 ? closestIdx : null;
  };

  // 어닝 마커 색상 결정
  const getMarkerColor = (surpriseType: string): string => {
    switch (surpriseType) {
      case "beat":
        return colors.bullish || "#22C55E"; // 초록색
      case "miss":
        return colors.bearish || "#EF4444"; // 빨간색
      case "neutral":
        return colors.muted || "#6B7280"; // 회색
      default:
        return colors.primary || "#0a7ea4";
    }
  };

  return (
    <>
      {/* 어닝 마커 렌더링 */}
      {earnings.map((event, idx) => {
        const candleIdx = getClosestCandleIndex(event.date);
        if (candleIdx === null) return null;

        const x = toX(candleIdx);
        const markerColor = getMarkerColor(event.surpriseType);
        const markerRadius = 6;

        return (
          <G key={`earnings-${idx}`}>
            {/* 배경 원 */}
            <Circle
              cx={x}
              cy={chartHeight + 20}
              r={markerRadius + 2}
              fill={markerColor}
              opacity={0.2}
            />
            {/* 마커 원 */}
            <Circle
              cx={x}
              cy={chartHeight + 20}
              r={markerRadius}
              fill={markerColor}
              opacity={0.9}
            />
            {/* E 텍스트 */}
            <SvgText
              x={x}
              y={chartHeight + 24}
              fontSize={10}
              fontWeight="700"
              fill="white"
              textAnchor="middle"
            >
              E
            </SvgText>
          </G>
        );
      })}

      {/* 터치 영역 (React Native에서는 별도 처리 필요) */}
      {/* 이 부분은 CandlestickChartSynced에서 PressableArea로 처리 */}
    </>
  );
}

// Floating Tooltip 컴포넌트
interface EarningsTooltipProps {
  event: EarningsEvent | null;
  position: { x: number; y: number };
  colors: any;
  onClose: () => void;
}

export function EarningsTooltip({
  event,
  position,
  colors,
  onClose,
}: EarningsTooltipProps) {
  if (!event) return null;

  const { width: screenWidth } = Dimensions.get("window");
  const tooltipWidth = 200;
  const tooltipHeight = 140;

  // 화면 범위 내로 조정
  let tooltipX = position.x - tooltipWidth / 2;
  let tooltipY = position.y - tooltipHeight - 10;

  if (tooltipX < 8) tooltipX = 8;
  if (tooltipX + tooltipWidth > screenWidth - 8) {
    tooltipX = screenWidth - tooltipWidth - 8;
  }
  if (tooltipY < 8) tooltipY = position.y + 10;

  const surpriseColor =
    event.surpriseType === "beat"
      ? colors.bullish || "#22C55E"
      : event.surpriseType === "miss"
      ? colors.bearish || "#EF4444"
      : colors.muted || "#6B7280";

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onClose}
      style={{
        position: "absolute",
        left: tooltipX,
        top: tooltipY,
        width: tooltipWidth,
        backgroundColor: colors.surface || "#f5f5f5",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: surpriseColor,
        padding: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: surpriseColor,
          marginBottom: 6,
        }}
      >
        {event.surpriseType === "beat"
          ? "🟢 어닝 서프라이즈"
          : event.surpriseType === "miss"
          ? "🔴 어닝 쇼크"
          : "⚪ 어닝 발표"}
      </Text>

      {event.expectedEPS !== undefined && event.actualEPS !== undefined && (
        <>
          <Text style={{ fontSize: 11, color: colors.muted || "#6B7280", marginBottom: 4 }}>
            예상 EPS: ${event.expectedEPS.toFixed(2)}
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted || "#6B7280", marginBottom: 4 }}>
            실제 EPS: ${event.actualEPS.toFixed(2)}
          </Text>
        </>
      )}

      {event.surprise !== undefined && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: surpriseColor,
            marginBottom: 4,
          }}
        >
          서프라이즈: {event.surprise > 0 ? "+" : ""}
          {event.surprise.toFixed(1)}%
        </Text>
      )}

      {event.revenue?.expected !== undefined && event.revenue?.actual !== undefined && (
        <>
          <Text style={{ fontSize: 10, color: colors.muted || "#6B7280", marginTop: 6 }}>
            예상 매출: ${event.revenue.expected.toLocaleString()}M
          </Text>
          <Text style={{ fontSize: 10, color: colors.muted || "#6B7280" }}>
            실제 매출: ${event.revenue.actual.toLocaleString()}M
          </Text>
        </>
      )}

      <Text
        style={{
          fontSize: 9,
          color: colors.muted || "#6B7280",
          marginTop: 8,
          fontStyle: "italic",
        }}
      >
        {new Date(event.date).toLocaleDateString("ko-KR")}
      </Text>
    </TouchableOpacity>
  );
}
