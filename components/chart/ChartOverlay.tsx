import React from "react";
import { View } from "react-native";
import Svg, { Line, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";
import type { PatternResult } from "@/shared/stockTypes";
import { getDoubleBottomOverlay } from "@/lib/chartOverlayUtils";
import type { Candle } from "@/shared/stockTypes";

interface ChartOverlayProps {
  pattern: PatternResult | null;
  candles: Candle[];
  chartWidth: number;
  chartHeight: number;
  visible?: boolean;
}

/**
 * 차트 오버레이 컴포넌트
 * 패턴의 넥라인과 목표가를 SVG로 렌더링합니다.
 */
export function ChartOverlay({
  pattern,
  candles,
  chartWidth,
  chartHeight,
  visible = true,
}: ChartOverlayProps) {
  if (!visible || !pattern) return null;

  // 패턴 타입별 오버레이 렌더링
  if (pattern.type === "double_bottom" || pattern.type === "double_top") {
    const overlay = getDoubleBottomOverlay(candles, pattern, chartWidth, chartHeight);
    if (!overlay) return null;

    return (
      <Svg width={chartWidth} height={chartHeight} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id="necklineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
          </LinearGradient>
          <LinearGradient id="targetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* 넥라인 */}
        <Line
          x1="0"
          y1={overlay.necklineY}
          x2={chartWidth}
          y2={overlay.necklineY}
          stroke="#3B82F6"
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity="0.7"
        />

        {/* 넥라인 레이블 */}
        <SvgText
          x="10"
          y={overlay.necklineY - 8}
          fontSize="12"
          fill="#3B82F6"
          fontWeight="bold"
        >
          넥라인: ₩{Math.round(overlay.necklinePrice).toLocaleString("ko-KR")}
        </SvgText>

        {/* 목표가 라인 */}
        <Line
          x1="0"
          y1={overlay.targetY}
          x2={chartWidth}
          y2={overlay.targetY}
          stroke="#10B981"
          strokeWidth="2"
          strokeDasharray="3,3"
          opacity="0.6"
        />

        {/* 목표가 레이블 */}
        <SvgText
          x="10"
          y={overlay.targetY - 8}
          fontSize="12"
          fill="#10B981"
          fontWeight="bold"
        >
          목표가: ₩{Math.round(overlay.targetPrice || 0).toLocaleString("ko-KR")}
        </SvgText>

        {/* 목표가 도달 거리 표시 */}
        <Line
          x1={chartWidth - 30}
          y1={overlay.necklineY}
          x2={chartWidth - 30}
          y2={overlay.targetY}
          stroke="#10B981"
          strokeWidth="1"
          opacity="0.4"
        />
      </Svg>
    );
  }

  return null;
}
