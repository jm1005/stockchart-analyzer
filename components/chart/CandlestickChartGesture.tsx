import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import Svg, { Rect, Line, G, Path, Text as SvgText, Circle } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import type { Candle, SupportResistanceLevel, PatternResult, TechnicalIndicators } from "@/shared/stockTypes";
import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { GestureHandlerRootView, PinchGestureHandler, TapGestureHandler, PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CandlestickChartGestureProps {
  candles: Candle[];
  supportResistance?: SupportResistanceLevel[];
  patterns?: PatternResult[];
  indicators?: TechnicalIndicators;
  activeIndicators?: {
    ma5: boolean;
    ma20: boolean;
    ma60: boolean;
    bb: boolean;
  };
  width?: number;
  height?: number;
  currency?: string;
  earnings?: Array<{
    date: number;
    symbol: string;
    expectedEPS?: number;
    actualEPS?: number;
    surprise?: number;
    surpriseType: "beat" | "miss" | "neutral";
    revenue?: { expected?: number; actual?: number };
  }>;
}

const PADDING = { left: 40, right: 16, top: 16, bottom: 40 };
const MAX_VISIBLE_CANDLES = 200;
const MIN_VISIBLE_CANDLES = 10;

export function CandlestickChartGesture({
  candles,
  supportResistance = [],
  patterns = [],
  indicators,
  activeIndicators = { ma5: false, ma20: false, ma60: false, bb: false },
  width = SCREEN_WIDTH - 16,
  height = 300,
  currency = "KRW",
  earnings = [],
}: CandlestickChartGestureProps) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 공유 애니메이션 값
  const scale = useSharedValue(1); // 줌 레벨 (1 = 전체 데이터, 2 = 절반만 보임)
  const offsetX = useSharedValue(0); // 수평 오프셋 (픽셀 단위)
  const baseScale = useSharedValue(1);

  // 현재 보이는 캔들 범위 계산
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // 줌 레벨에 따른 표시 캔들 개수
  const visibleCandleCount = useMemo(() => {
    const count = Math.max(
      MIN_VISIBLE_CANDLES,
      Math.floor(candles.length / scale.value)
    );
    return Math.min(count, MAX_VISIBLE_CANDLES);
  }, [candles.length]);

  // 스크롤 오프셋에 따른 시작 인덱스
  const startIndex = useMemo(() => {
    const candleWidth = chartWidth / visibleCandleCount;
    const index = Math.floor(Math.abs(offsetX.value) / candleWidth);
    return Math.max(0, Math.min(index, candles.length - visibleCandleCount));
  }, [chartWidth, visibleCandleCount, offsetX.value]);

  const endIndex = Math.min(startIndex + visibleCandleCount, candles.length);

  // 화면에 보이는 캔들들
  const visibleCandles = useMemo(() => {
    return candles.slice(startIndex, endIndex);
  }, [candles, startIndex, endIndex]);

  // Y축 범위 계산 (화면에 보이는 캔들의 최고가/최저가)
  const yRange = useMemo(() => {
    if (visibleCandles.length === 0) return { min: 0, max: 100 };
    const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [visibleCandles]);

  // 좌표 변환 함수
  const toX = useCallback(
    (index: number) => {
      const candleWidth = chartWidth / visibleCandleCount;
      return PADDING.left + (index - startIndex) * candleWidth + candleWidth / 2;
    },
    [chartWidth, visibleCandleCount, startIndex]
  );

  const toY = useCallback(
    (price: number) => {
      const priceRange = yRange.max - yRange.min;
      return (
        PADDING.top +
        chartHeight -
        ((price - yRange.min) / priceRange) * chartHeight
      );
    },
    [chartHeight, yRange]
  );

  // 핀치 제스처 핸들러
  const handlePinchGesture = useCallback((event: any) => {
    if (event.nativeEvent) {
      const { scale } = event.nativeEvent;
      const newScale = Math.max(1, Math.min(5, scale));
      scale.value = newScale;
    }
  }, []);

  const handlePinchEnd = useCallback(() => {
    scale.value = withSpring(Math.round(scale.value * 2) / 2);
  }, []);

  // 팬 제스처 핸들러
  const handlePanGesture = useCallback((event: any) => {
    if (event.nativeEvent) {
      const { translationX } = event.nativeEvent;
      const maxOffset = chartWidth * (1 - 1 / scale.value);
      let newOffset = translationX;
      newOffset = Math.max(-maxOffset, Math.min(0, newOffset));
      offsetX.value = newOffset;
    }
  }, [chartWidth]);

  const handlePanEnd = useCallback((event: any) => {
    if (event.nativeEvent) {
      const { velocityX } = event.nativeEvent;
      if (Math.abs(velocityX) > 500) {
        const maxOffset = chartWidth * (1 - 1 / scale.value);
        let targetOffset = offsetX.value + velocityX * 0.1;
        targetOffset = Math.max(-maxOffset, Math.min(0, targetOffset));
        offsetX.value = withSpring(targetOffset);
      }
    }
  }, [chartWidth]);

  // 더블탭 리셋
  const handleDoubleTap = useCallback(() => {
    scale.value = withSpring(1);
    offsetX.value = withSpring(0);
  }, []);

  // 차트 렌더링
  const chartContent = (
    <View style={[styles.chartWrapper, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* 배경 */}
        <Rect width={width} height={height} fill={colors.background} />

        {/* 그리드 */}
        {(() => {
          const lines = [];
          const gridLines = 5;
          for (let i = 0; i <= gridLines; i++) {
            const y = PADDING.top + (chartHeight / gridLines) * i;
            const price = yRange.max - ((yRange.max - yRange.min) / gridLines) * i;
            lines.push(
              <G key={`grid-${i}`}>
                <Line
                  x1={PADDING.left}
                  y1={y}
                  x2={width - PADDING.right}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={0.5}
                  opacity={0.3}
                />
                <SvgText
                  x={PADDING.left - 8}
                  y={y + 4}
                  fontSize={10}
                  fill={colors.muted}
                  textAnchor="end"
                >
                  {price.toFixed(0)}
                </SvgText>
              </G>
            );
          }
          return lines;
        })()}

        {/* 캔들스틱 */}
        {visibleCandles.map((candle, visIdx) => {
          const i = startIndex + visIdx;
          const x = toX(i);
          const openY = toY(candle.open);
          const closeY = toY(candle.close);
          const highY = toY(candle.high);
          const lowY = toY(candle.low);

          const isGreen = candle.close >= candle.open;
          const candleColor = isGreen ? colors.bullish : colors.bearish;

          return (
            <G key={`candle-${i}`}>
              {/* Wick */}
              <Line
                x1={x}
                y1={highY}
                x2={x}
                y2={lowY}
                stroke={candleColor}
                strokeWidth={0.5}
              />
              {/* Body */}
              <Rect
                x={x - 3}
                y={Math.min(openY, closeY)}
                width={6}
                height={Math.abs(closeY - openY) || 1}
                fill={candleColor}
              />
            </G>
          );
        })}
        {/* MA5 */}
        {activeIndicators.ma5 && indicators?.ma5 && (
          <G>
            {indicators.ma5.map((ma, idx) => {
              if (idx < startIndex || idx >= endIndex) return null;
              if (ma === null) return null;
              const nextIdx = idx + 1;
              if (nextIdx >= indicators.ma5.length) return null;
              const nextMa = indicators.ma5[nextIdx];
              if (nextMa === null) return null;

              const x1 = toX(idx);
              const y1 = toY(ma);
              const x2 = toX(nextIdx);
              const y2 = toY(nextMa);

              return (
                <Line
                  key={`ma5-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  opacity={0.7}
                />
              );
            })}
          </G>
        )}

        {/* MA20 */}
        {activeIndicators.ma20 && indicators?.ma20 && (
          <G>
            {indicators.ma20.map((ma, idx) => {
              if (idx < startIndex || idx >= endIndex) return null;
              if (ma === null) return null;
              const nextIdx = idx + 1;
              if (nextIdx >= indicators.ma20.length) return null;
              const nextMa = indicators.ma20[nextIdx];
              if (nextMa === null) return null;

              const x1 = toX(idx);
              const y1 = toY(ma);
              const x2 = toX(nextIdx);
              const y2 = toY(nextMa);

              return (
                <Line
                  key={`ma20-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#3B82F6"
                  strokeWidth={1.5}
                  opacity={0.7}
                />
              );
            })}
          </G>
        )}

        {/* MA60 */}
        {activeIndicators.ma60 && indicators?.ma60 && (
          <G>
            {indicators.ma60.map((ma, idx) => {
              if (idx < startIndex || idx >= endIndex) return null;
              if (ma === null) return null;
              const nextIdx = idx + 1;
              if (nextIdx >= indicators.ma60.length) return null;
              const nextMa = indicators.ma60[nextIdx];
              if (nextMa === null) return null;

              const x1 = toX(idx);
              const y1 = toY(ma);
              const x2 = toX(nextIdx);
              const y2 = toY(nextMa);

              return (
                <Line
                  key={`ma60-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#EC4899"
                  strokeWidth={1.5}
                  opacity={0.7}
                />
              );
            })}
          </G>
        )}

        {/* 볼린저 밴드 */}
        {activeIndicators.bb && indicators?.bollingerBands && (
          <G>
            {indicators.bollingerBands.upper.map((upper: number | null, idx: number) => {
              if (idx < startIndex || idx >= endIndex) return null;
              if (upper === null || indicators.bollingerBands.middle[idx] === null || indicators.bollingerBands.lower[idx] === null) return null;
              const nextIdx = idx + 1;
              if (nextIdx >= indicators.bollingerBands.upper.length) return null;
              const nextUpper = indicators.bollingerBands.upper[nextIdx];
              const nextMiddle = indicators.bollingerBands.middle[nextIdx];
              const nextLower = indicators.bollingerBands.lower[nextIdx];
              if (nextUpper === null || nextMiddle === null || nextLower === null) return null;

              const x1 = toX(idx);
              const x2 = toX(nextIdx);
              const middle = indicators.bollingerBands.middle[idx];
              const lower = indicators.bollingerBands.lower[idx];

              return (
                <G key={`bb-${idx}`}>
                  {/* 상단 밴드 */}
                  <Line
                    x1={x1}
                    y1={toY(upper)}
                    x2={x2}
                    y2={toY(nextUpper)}
                    stroke="#8B5CF6"
                    strokeWidth={1}
                    opacity={0.5}
                    strokeDasharray="3,3"
                  />
                  {/* 중앙 밴드 */}
                  <Line
                    x1={x1}
                    y1={toY(middle!)}
                    x2={x2}
                    y2={toY(nextMiddle)}
                    stroke="#8B5CF6"
                    strokeWidth={1.5}
                    opacity={0.7}
                  />
                  {/* 하단 밴드 */}
                  <Line
                    x1={x1}
                    y1={toY(lower!)}
                    x2={x2}
                    y2={toY(nextLower)}
                    stroke="#8B5CF6"
                    strokeWidth={1}
                    opacity={0.5}
                    strokeDasharray="3,3"
                  />
                </G>
              );
            })}
          </G>
        )}

        {/* 어닝 마커 */}
        {earnings.length > 0 && (
          <G>
            {earnings.map((event, idx) => {
              let closestIdx = -1;
              let minDiff = Infinity;
              for (let i = 0; i < candles.length; i++) {
                const diff = Math.abs(candles[i].timestamp - event.date);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestIdx = i;
                }
              }
              if (closestIdx < 0 || closestIdx < startIndex || closestIdx >= endIndex)
                return null;

              const x = toX(closestIdx);
              const markerColor =
                event.surpriseType === "beat"
                  ? colors.bullish || "#22C55E"
                  : event.surpriseType === "miss"
                  ? colors.bearish || "#EF4444"
                  : colors.muted || "#6B7280";

              return (
                <G key={`earnings-${idx}`}>
                  <Circle
                    cx={x}
                    cy={height - PADDING.bottom + 20}
                    r={8}
                    fill={markerColor}
                    opacity={0.9}
                  />
                  <SvgText
                    x={x}
                    y={height - PADDING.bottom + 24}
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
          </G>
        )}
      </Svg>
    </View>
  );

  return (
    <GestureHandlerRootView style={[styles.container, { width, height }]}>
      {/* OHLCV Info Bar */}
      {selectedIndex != null && visibleCandles[selectedIndex - startIndex] ? (
        <View style={[styles.infoBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoText, { color: colors.muted }]}>
            {new Date(visibleCandles[selectedIndex - startIndex].timestamp).toLocaleDateString(
              "ko-KR"
            )}
          </Text>
          <Text style={[styles.infoText, { color: colors.bullish }]}>
            O {visibleCandles[selectedIndex - startIndex].open.toFixed(2)}
          </Text>
          <Text style={[styles.infoText, { color: colors.bullish }]}>
            H {visibleCandles[selectedIndex - startIndex].high.toFixed(2)}
          </Text>
          <Text style={[styles.infoText, { color: colors.bearish }]}>
            L {visibleCandles[selectedIndex - startIndex].low.toFixed(2)}
          </Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            C {visibleCandles[selectedIndex - startIndex].close.toFixed(2)}
          </Text>
        </View>
      ) : null}

      {/* 차트 - 제스처 래퍼 */}
      {Platform.OS !== "web" ? (
        <TapGestureHandler numberOfTaps={2} onActivated={handleDoubleTap}>
          <PinchGestureHandler
            onGestureEvent={handlePinchGesture}
            onHandlerStateChange={handlePinchEnd}
          >
            <PanGestureHandler
              onGestureEvent={handlePanGesture}
              onHandlerStateChange={handlePanEnd}
              enabled={scale.value > 1}
            >
              <Animated.View>{chartContent}</Animated.View>
            </PanGestureHandler>
          </PinchGestureHandler>
        </TapGestureHandler>
      ) : (
        chartContent
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  chartWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  infoBar: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  infoText: {
    fontSize: 11,
    marginRight: 12,
    fontWeight: "500",
  },
});
