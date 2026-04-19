import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, G, Line, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import type { Candle } from "@/shared/stockTypes";
import { useMemo } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface VolumeChartSyncedProps {
  candles: Candle[];
  width?: number;
  height?: number;
  zoomLevel?: number;
  scrollOffset?: number;
  visibleCandleCount?: number;
}

export function VolumeChartSynced({
  candles,
  width = SCREEN_WIDTH - 16,
  height = 60,
  zoomLevel = 1,
  scrollOffset = 0,
  visibleCandleCount = 60,
}: VolumeChartSyncedProps) {
  const colors = useColors();

  const PADDING = { top: 4, right: 60, bottom: 16, left: 8 };
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // 캔들스틱 차트와 동일한 로직으로 표시 캔들 계산
  const visibleCandles = useMemo(() => {
    const totalCandles = candles.length;
    if (totalCandles <= visibleCandleCount) {
      return candles;
    }
    
    const maxOffset = totalCandles - visibleCandleCount;
    const clampedOffset = Math.max(0, Math.min(scrollOffset, maxOffset));
    
    return candles.slice(clampedOffset, clampedOffset + visibleCandleCount);
  }, [candles, visibleCandleCount, scrollOffset]);

  const startIndex = useMemo(() => {
    const totalCandles = candles.length;
    if (totalCandles <= visibleCandleCount) return 0;
    const maxOffset = totalCandles - visibleCandleCount;
    return Math.max(0, Math.min(scrollOffset, maxOffset));
  }, [candles.length, visibleCandleCount, scrollOffset]);

  // 표시 캔들의 최대 볼륨 계산
  const maxVolume = useMemo(
    () => Math.max(...visibleCandles.map((c) => c.volume ?? 0)),
    [visibleCandles]
  );

  const candleWidth = Math.max(2, chartWidth / visibleCandles.length - 1);

  // 캔들스틱 차트와 동일한 X 좌표 계산
  const toX = (index: number) => {
    const relativeIndex = index - startIndex;
    return PADDING.left + relativeIndex * (chartWidth / visibleCandles.length) + candleWidth / 2;
  };

  const formatVolume = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return `${v}`;
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Volume bars - synchronized with candlestick chart */}
        {visibleCandles.map((candle, visIdx) => {
          const i = startIndex + visIdx;
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
