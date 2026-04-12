import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, G, Line, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import type { Candle } from "@/shared/stockTypes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface VolumeChartProps {
  candles: Candle[];
  width?: number;
  height?: number;
}

export function VolumeChart({ candles, width = SCREEN_WIDTH - 16, height = 60 }: VolumeChartProps) {
  const colors = useColors();

  const PADDING = { top: 4, right: 60, bottom: 16, left: 8 };
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const visibleCandles = useMemo(() => {
    if (candles.length <= 60) return candles;
    return candles.slice(candles.length - 60);
  }, [candles]);

  const maxVolume = useMemo(
    () => Math.max(...visibleCandles.map((c) => c.volume ?? 0)),
    [visibleCandles]
  );

  const offset = candles.length > 60 ? candles.length - 60 : 0;
  const candleWidth = Math.max(2, chartWidth / visibleCandles.length - 1);

  const toX = (index: number) =>
    PADDING.left + (index - offset) * (chartWidth / visibleCandles.length) + candleWidth / 2;

  const formatVolume = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return `${v}`;
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* MA Volume line (simple average) */}
        {visibleCandles.map((candle, visIdx) => {
          const i = offset + visIdx;
          const x = toX(i);
          const vol = candle.volume ?? 0;
          const barHeight = maxVolume > 0 ? (vol / maxVolume) * chartHeight : 0;
          const isBullish = candle.close >= candle.open;
          const color = isBullish ? colors.bullish : colors.bearish;

          return (
            <Rect
              key={i}
              x={x - candleWidth / 2}
              y={PADDING.top + chartHeight - barHeight}
              width={candleWidth}
              height={Math.max(1, barHeight)}
              fill={color}
              opacity={0.5}
              rx={1}
            />
          );
        })}

        {/* Max volume label */}
        <SvgText
          x={width - PADDING.right + 4}
          y={PADDING.top + 8}
          fontSize={8}
          fill={colors.muted}
        >
          {formatVolume(maxVolume)}
        </SvgText>
        <SvgText
          x={width - PADDING.right + 4}
          y={height - PADDING.bottom + 4}
          fontSize={8}
          fill={colors.muted}
        >
          0
        </SvgText>
      </Svg>
    </View>
  );
}
