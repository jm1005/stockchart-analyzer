import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line, Rect, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import type { TechnicalIndicators } from "@/shared/stockTypes";

interface MACDChartProps {
  macdData: TechnicalIndicators["macd"];
  width: number;
  height?: number;
  totalCandles: number;
  zoomOffset?: number;
  maxCandlesVisible?: number;
}

export function MACDChart({
  macdData,
  width,
  height = 80,
  totalCandles,
  zoomOffset = 0,
  maxCandlesVisible = 60,
}: MACDChartProps) {
  const colors = useColors();

  const PADDING = { top: 8, right: 60, bottom: 8, left: 8 };
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const offset = Math.floor(zoomOffset);
  const visibleCount = Math.min(maxCandlesVisible, totalCandles - offset);
  const candleStep = chartWidth / visibleCount;

  const { minVal, maxVal } = useMemo(() => {
    let min = 0;
    let max = 0;
    for (let i = offset; i < offset + visibleCount && i < totalCandles; i++) {
      const m = macdData.macd[i];
      const s = macdData.signal[i];
      const h = macdData.histogram[i];
      if (m != null) {
        min = Math.min(min, m);
        max = Math.max(max, m);
      }
      if (s != null) {
        min = Math.min(min, s);
        max = Math.max(max, s);
      }
      if (h != null) {
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    }
    const pad = Math.max(Math.abs(max), Math.abs(min)) * 0.1;
    return { minVal: min - pad, maxVal: max + pad };
  }, [macdData, offset, visibleCount, totalCandles]);

  const range = maxVal - minVal || 1;

  const toX = useCallback(
    (index: number) => PADDING.left + (index - offset) * candleStep + candleStep / 2,
    [offset, candleStep, PADDING.left]
  );

  const toY = useCallback(
    (value: number) => PADDING.top + chartHeight - ((value - minVal) / range) * chartHeight,
    [minVal, range, chartHeight, PADDING.top]
  );

  const zeroY = toY(0);

  // MACD 라인 경로 생성
  const macdPath = useMemo(() => {
    const parts: string[] = [];
    let started = false;
    for (let i = offset; i < offset + visibleCount && i < totalCandles; i++) {
      const m = macdData.macd[i];
      const x = toX(i);
      if (m != null) {
        if (!started) {
          parts.push(`M ${x} ${toY(m)}`);
          started = true;
        } else {
          parts.push(`L ${x} ${toY(m)}`);
        }
      } else {
        started = false;
      }
    }
    return parts;
  }, [macdData.macd, offset, visibleCount, totalCandles, toX, toY]);

  // Signal 라인 경로 생성
  const signalPath = useMemo(() => {
    const parts: string[] = [];
    let started = false;
    for (let i = offset; i < offset + visibleCount && i < totalCandles; i++) {
      const s = macdData.signal[i];
      const x = toX(i);
      if (s != null) {
        if (!started) {
          parts.push(`M ${x} ${toY(s)}`);
          started = true;
        } else {
          parts.push(`L ${x} ${toY(s)}`);
        }
      } else {
        started = false;
      }
    }
    return parts;
  }, [macdData.signal, offset, visibleCount, totalCandles, toX, toY]);

  const lastMACD = useMemo(() => {
    for (let i = totalCandles - 1; i >= 0; i--) {
      if (macdData.macd[i] != null) return macdData.macd[i];
    }
    return null;
  }, [macdData.macd, totalCandles]);

  const lastSignal = useMemo(() => {
    for (let i = totalCandles - 1; i >= 0; i--) {
      if (macdData.signal[i] != null) return macdData.signal[i];
    }
    return null;
  }, [macdData.signal, totalCandles]);

  const barWidth = Math.max(1, candleStep - 1);

  return (
    <View>
      <Text style={[styles.label, { color: colors.muted }]}>
        MACD(12,26,9){" "}
        <Text style={{ color: colors.primary }}>{lastMACD?.toFixed(2) ?? "--"}</Text>
        {" / "}
        <Text style={{ color: colors.warning }}>{lastSignal?.toFixed(2) ?? "--"}</Text>
      </Text>
      <Svg width={width} height={height}>
        {/* Zero line */}
        <Line
          x1={PADDING.left}
          y1={zeroY}
          x2={width - PADDING.right}
          y2={zeroY}
          stroke={colors.border}
          strokeWidth={0.8}
        />

        {/* Histogram bars */}
        {Array.from({ length: visibleCount }, (_, visIdx) => {
          const i = offset + visIdx;
          const h = macdData.histogram[i];
          if (h == null) return null;
          const x = toX(i);
          const isPositive = h >= 0;
          const barTop = isPositive ? toY(h) : zeroY;
          const barH = Math.abs(toY(h) - zeroY);
          return (
            <Rect
              key={i}
              x={x - barWidth / 2}
              y={barTop}
              width={barWidth}
              height={Math.max(1, barH)}
              fill={isPositive ? colors.bullish : colors.bearish}
              opacity={0.5}
            />
          );
        })}

        {/* MACD Line */}
        {macdPath.length > 0 && (
          <Path d={macdPath.join(" ")} stroke={colors.primary} strokeWidth={1.5} fill="none" />
        )}
        {/* Signal Line */}
        {signalPath.length > 0 && (
          <Path d={signalPath.join(" ")} stroke={colors.warning} strokeWidth={1.2} fill="none" />
        )}
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
