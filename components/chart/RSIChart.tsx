import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line, Text as SvgText, G, Rect } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

interface RSIChartProps {
  rsiData: (number | null)[];
  width: number;
  height?: number;
  totalCandles: number;
}

export function RSIChart({ rsiData, width, height = 80, totalCandles }: RSIChartProps) {
  const colors = useColors();

  const PADDING = { top: 8, right: 60, bottom: 8, left: 8 };
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const offset = totalCandles > 60 ? totalCandles - 60 : 0;
  const visibleCount = Math.min(60, totalCandles);
  const candleStep = chartWidth / visibleCount;

  const toX = (index: number) =>
    PADDING.left + (index - offset) * candleStep + candleStep / 2;

  const toY = (value: number) =>
    PADDING.top + chartHeight - ((value - 0) / 100) * chartHeight;

  const pathParts: string[] = [];
  let started = false;
  for (let i = offset; i < totalCandles; i++) {
    const val = rsiData[i];
    if (val == null) { started = false; continue; }
    const x = toX(i);
    const y = toY(val);
    if (!started) { pathParts.push(`M ${x} ${y}`); started = true; }
    else pathParts.push(`L ${x} ${y}`);
  }

  const lastRSI = rsiData.slice().reverse().find((v) => v != null);

  return (
    <View>
      <Text style={[styles.label, { color: colors.muted }]}>
        RSI(14) {lastRSI != null ? lastRSI.toFixed(1) : "--"}
      </Text>
      <Svg width={width} height={height}>
        {/* Overbought/Oversold zones */}
        <Rect
          x={PADDING.left}
          y={toY(70)}
          width={chartWidth}
          height={toY(30) - toY(70)}
          fill={colors.muted}
          opacity={0.05}
        />
        {/* 70 line */}
        <Line
          x1={PADDING.left} y1={toY(70)}
          x2={width - PADDING.right} y2={toY(70)}
          stroke={colors.bearish} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.6}
        />
        {/* 50 line */}
        <Line
          x1={PADDING.left} y1={toY(50)}
          x2={width - PADDING.right} y2={toY(50)}
          stroke={colors.muted} strokeWidth={0.5} strokeDasharray="4,3" opacity={0.4}
        />
        {/* 30 line */}
        <Line
          x1={PADDING.left} y1={toY(30)}
          x2={width - PADDING.right} y2={toY(30)}
          stroke={colors.bullish} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.6}
        />

        {/* RSI Line */}
        {pathParts.length > 0 && (
          <Path d={pathParts.join(" ")} stroke={colors.primary} strokeWidth={1.5} fill="none" />
        )}

        {/* Labels */}
        <SvgText x={width - PADDING.right + 4} y={toY(70) + 4} fontSize={8} fill={colors.bearish}>70</SvgText>
        <SvgText x={width - PADDING.right + 4} y={toY(50) + 4} fontSize={8} fill={colors.muted}>50</SvgText>
        <SvgText x={width - PADDING.right + 4} y={toY(30) + 4} fontSize={8} fill={colors.bullish}>30</SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingTop: 4,
  },
});
