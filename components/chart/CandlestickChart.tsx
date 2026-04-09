import React, { useState, useMemo, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, Line, G, Path, Text as SvgText } from "react-native-svg";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import type { Candle, SupportResistanceLevel, PatternResult, TechnicalIndicators } from "@/shared/stockTypes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ZoomState {
  scale: number;
  offsetX: number;
  maxOffsetX: number;
}

interface CandlestickChartProps {
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
  zoom?: ZoomState;
  onPan?: (deltaX: number) => void;
  onZoomChange?: (scale: number) => void;
  maxCandlesVisible?: number;
}

export function CandlestickChart({
  candles,
  supportResistance = [],
  patterns = [],
  indicators,
  activeIndicators = { ma5: false, ma20: false, ma60: false, bb: false },
  width = SCREEN_WIDTH - 16,
  height = 300,
  currency = "KRW",
  zoom,
  onPan,
  onZoomChange,
  maxCandlesVisible: propMaxCandlesVisible,
}: CandlestickChartProps) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [localScale, setLocalScale] = useState(1);
  const [localOffsetX, setLocalOffsetX] = useState(0);
  
  // Animated values for smooth gesture handling
  const scaleAnim = useSharedValue(1);
  const offsetXAnim = useSharedValue(0);

  const PADDING = { top: 16, right: 60, bottom: 8, left: 8 };
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // 기본값 설정 (props가 없을 경우)
  const currentZoom = zoom || { scale: localScale, offsetX: localOffsetX, maxOffsetX: 0 };
  const maxCandlesVisible = propMaxCandlesVisible || 60;

  // 표시할 캔들 계산 (줌 + 오프셋 고려)
  const visibleCandles = useMemo(() => {
    const startIdx = Math.floor(currentZoom.offsetX);
    const endIdx = Math.min(startIdx + maxCandlesVisible, candles.length);
    return candles.slice(startIdx, endIdx);
  }, [candles, currentZoom.offsetX, maxCandlesVisible]);

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 0, maxPrice: 100, priceRange: 100 };
    let min = Infinity;
    let max = -Infinity;
    for (const c of visibleCandles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    for (const sr of supportResistance) {
      if (sr.price < min) min = sr.price;
      if (sr.price > max) max = sr.price;
    }
    const padding = (max - min) * 0.05;
    return { minPrice: min - padding, maxPrice: max + padding, priceRange: (max - min) * 1.1 };
  }, [visibleCandles, supportResistance]);

  const toY = useCallback(
    (price: number) =>
      PADDING.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight,
    [minPrice, priceRange, chartHeight, PADDING.top]
  );

  const candleWidth = Math.max(2, chartWidth / visibleCandles.length - 1);
  const offset = Math.floor(currentZoom.offsetX);

  const toX = useCallback(
    (index: number) => {
      const relativeIdx = index - offset;
      return PADDING.left + (relativeIdx / maxCandlesVisible) * chartWidth + candleWidth / 2;
    },
    [offset, chartWidth, maxCandlesVisible, candleWidth, PADDING.left]
  );

  // 핀치 줌 제스처
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = Math.max(1, Math.min(5, event.scale));
      scaleAnim.value = newScale;
      setLocalScale(newScale);
      if (onZoomChange) {
        runOnJS(onZoomChange)(newScale);
      }
    })
    .onEnd(() => {
      // 줌 애니메이션 (부드러운 종료)
      scaleAnim.value = withTiming(localScale, { duration: 200 });
    });

  // 팬 제스처 (줌 상태에서만 활성화)
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (localScale > 1.05) {
        offsetXAnim.value = event.translationX;
        const normalizedDelta = -event.translationX / (chartWidth / maxCandlesVisible);
        const newOffset = Math.max(0, Math.min(candles.length - maxCandlesVisible, currentZoom.offsetX + normalizedDelta));
        setLocalOffsetX(newOffset);
        if (onPan) {
          runOnJS(onPan)(event.translationX);
        }
      }
    })
    .onEnd(() => {
      offsetXAnim.value = withTiming(0, { duration: 200 });
    });

  // 더블탭 제스처 (줌 리셋)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      setLocalScale(1);
      setLocalOffsetX(0);
      scaleAnim.value = withTiming(1, { duration: 300 });
      offsetXAnim.value = withTiming(0, { duration: 300 });
      if (onZoomChange) {
        runOnJS(onZoomChange)(1);
      }
    });

  // 싱글탭 제스처 (크로스헤어 선택)
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd((event) => {
      const x = event.x - PADDING.left;
      const idx = Math.round((x / chartWidth) * (visibleCandles.length - 1));
      const clampedIdx = Math.max(0, Math.min(visibleCandles.length - 1, idx));
      runOnJS(setSelectedIndex)(offset + clampedIdx);
      setTimeout(() => runOnJS(setSelectedIndex)(null), 2000);
    });

  // 제스처 조합
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Simultaneous(panGesture, Gesture.Exclusive(doubleTapGesture, singleTapGesture))
  );

  const selectedCandle = selectedIndex != null ? candles[selectedIndex] : null;

  const formatPrice = (price: number) => {
    if (currency === "KRW") {
      return price >= 1000
        ? `₩${(price / 1000).toFixed(0)}K`
        : `₩${price.toFixed(0)}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatPriceFull = (price: number) => {
    if (currency === "KRW") return `₩${price.toLocaleString("ko-KR")}`;
    return `$${price.toFixed(2)}`;
  };

  // Y-axis labels
  const yLabels = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => {
      const price = minPrice + (priceRange * i) / (count - 1);
      return { price, y: toY(price) };
    });
  }, [minPrice, priceRange, toY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }, { translateX: offsetXAnim.value }],
  }));

  return (
    <View style={[styles.container, { width, height }]}>
      {/* OHLCV Info Bar */}
      {selectedCandle ? (
        <View style={[styles.infoBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoText, { color: colors.muted }]}>
            {new Date(selectedCandle.timestamp).toLocaleDateString("ko-KR")}
          </Text>
          <Text style={[styles.infoText, { color: colors.bullish }]}>
            O {formatPriceFull(selectedCandle.open)}
          </Text>
          <Text style={[styles.infoText, { color: colors.bullish }]}>
            H {formatPriceFull(selectedCandle.high)}
          </Text>
          <Text style={[styles.infoText, { color: colors.bearish }]}>
            L {formatPriceFull(selectedCandle.low)}
          </Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            C {formatPriceFull(selectedCandle.close)}
          </Text>
        </View>
      ) : null}

      {/* Zoom Level Indicator */}
      {localScale > 1.05 && (
        <View style={[styles.zoomIndicator, { backgroundColor: colors.surface }]}>
          <Text style={[styles.zoomText, { color: colors.muted }]}>
            🔍 {localScale.toFixed(1)}x
          </Text>
        </View>
      )}

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[animatedStyle, { width, height }]}>
          <Svg width={width} height={height}>
            {/* Y-axis grid lines and labels */}
            {yLabels.map((label, i) => (
              <G key={i}>
                <Line
                  x1={PADDING.left}
                  y1={label.y}
                  x2={width - PADDING.right}
                  y2={label.y}
                  stroke={colors.border}
                  strokeWidth="0.5"
                  opacity="0.3"
                />
                <SvgText
                  x={width - PADDING.right + 4}
                  y={label.y + 4}
                  fontSize="10"
                  fill={colors.muted}
                >
                  {formatPrice(label.price)}
                </SvgText>
              </G>
            ))}

            {/* Support/Resistance Lines */}
            {supportResistance.map((sr, i) => (
              <G key={`sr-${i}`}>
                <Line
                  x1={PADDING.left}
                  y1={toY(sr.price)}
                  x2={width - PADDING.right}
                  y2={toY(sr.price)}
                  stroke={sr.type === "support" ? colors.support : colors.resistance}
                  strokeWidth="1"
                  strokeDasharray="4,2"
                  opacity={Math.min(0.3 + sr.strength * 0.4, 0.8)}
                />
              </G>
            ))}

            {/* Candles */}
            {visibleCandles.map((candle, i) => {
              const x = toX(offset + i);
              const openY = toY(candle.open);
              const closeY = toY(candle.close);
              const highY = toY(candle.high);
              const lowY = toY(candle.low);
              const isGreen = candle.close >= candle.open;
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.abs(closeY - openY) || 1;

              return (
                <G key={i}>
                  {/* Wick */}
                  <Line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={isGreen ? colors.bullish : colors.bearish}
                    strokeWidth="0.5"
                  />
                  {/* Body */}
                  <Rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={isGreen ? colors.bullish : colors.bearish}
                    opacity={0.8}
                  />
                </G>
              );
            })}

            {/* MA Indicators */}
            {activeIndicators?.ma5 && indicators && (
              <Path
                d={indicators.ma5
                  .slice(offset, offset + maxCandlesVisible)
                  .map((price: number | null, i: number) => {
                    if (price === null) return "";
                    const x = toX(offset + i);
                    const y = toY(price);
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .filter(Boolean)
                  .join(" ")}
                stroke="#F59E0B"
                strokeWidth="1"
                fill="none"
              />
            )}
            {activeIndicators?.ma20 && indicators && (
              <Path
                d={indicators.ma20
                  .slice(offset, offset + maxCandlesVisible)
                  .map((price: number | null, i: number) => {
                    if (price === null) return "";
                    const x = toX(offset + i);
                    const y = toY(price);
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .filter(Boolean)
                  .join(" ")}
                stroke="#3B82F6"
                strokeWidth="1"
                fill="none"
              />
            )}
            {activeIndicators?.ma60 && indicators && (
              <Path
                d={indicators.ma60
                  .slice(offset, offset + maxCandlesVisible)
                  .map((price: number | null, i: number) => {
                    if (price === null) return "";
                    const x = toX(offset + i);
                    const y = toY(price);
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .filter(Boolean)
                  .join(" ")}
                stroke="#EC4899"
                strokeWidth="1"
                fill="none"
              />
            )}

            {/* Bollinger Bands */}
            {activeIndicators?.bb && indicators && (
              <>
                <Path
                  d={indicators.bollingerBands.upper
                    .slice(offset, offset + maxCandlesVisible)
                    .map((price: number | null, i: number) => {
                      if (price === null) return "";
                      const x = toX(offset + i);
                      const y = toY(price);
                      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                    })
                    .filter(Boolean)
                    .join(" ")}
                  stroke="#8B5CF6"
                  strokeWidth="0.5"
                  fill="none"
                  opacity="0.5"
                />
                <Path
                  d={indicators.bollingerBands.lower
                    .slice(offset, offset + maxCandlesVisible)
                    .map((price: number | null, i: number) => {
                      if (price === null) return "";
                      const x = toX(offset + i);
                      const y = toY(price);
                      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                    })
                    .filter(Boolean)
                    .join(" ")}
                  stroke="#8B5CF6"
                  strokeWidth="0.5"
                  fill="none"
                  opacity="0.5"
                />
              </>
            )}

            {/* Pattern Markers */}
            {patterns.map((pattern, i) => {
              const startIdx = pattern.startIndex;
              const endIdx = pattern.endIndex;
              if (startIdx < offset || endIdx > offset + maxCandlesVisible) return null;
              const x1 = toX(startIdx);
              const x2 = toX(endIdx);
              const y = PADDING.top + 12;
              return (
                <G key={`pattern-${i}`}>
                  <Rect
                    x={Math.min(x1, x2) - 4}
                    y={y - 6}
                    width={Math.abs(x2 - x1) + 8}
                    height={12}
                    fill={pattern.confidence > 0.7 ? colors.bullish : colors.warning}
                    opacity="0.2"
                    rx="2"
                  />
                  <SvgText
                    x={(x1 + x2) / 2}
                    y={y + 2}
                    fontSize="9"
                    fill={colors.foreground}
                    textAnchor="middle"
                  >
                    {pattern.type.substring(0, 3)}
                  </SvgText>
                </G>
              );
            })}

            {/* Crosshair */}
            {selectedIndex != null && (
              <G>
                <Line
                  x1={PADDING.left}
                  y1={toY(selectedCandle?.close ?? (minPrice + maxPrice) / 2)}
                  x2={width - PADDING.right}
                  y2={toY(selectedCandle?.close ?? (minPrice + maxPrice) / 2)}
                  stroke={colors.primary}
                  strokeWidth="0.5"
                  opacity="0.5"
                  strokeDasharray="2,2"
                />
              </G>
            )}
          </Svg>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  infoBar: {
    position: "absolute",
    top: 4,
    left: 8,
    right: 8,
    zIndex: 10,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 10,
    fontWeight: "600",
  },
  zoomIndicator: {
    position: "absolute",
    top: 4,
    right: 8,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  zoomText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
