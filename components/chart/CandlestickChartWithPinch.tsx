import { View, Text, StyleSheet, Dimensions, PanResponder, TouchableOpacity, Platform } from "react-native";
import Svg, { Rect, Line, G, Path, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import type { Candle, SupportResistanceLevel, PatternResult, TechnicalIndicators } from "@/shared/stockTypes";
import { useCallback, useMemo, useState, useRef } from "react";
import { GestureHandlerRootView, PinchGestureHandler, TapGestureHandler } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CandlestickChartWithPinchProps {
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
}

export function CandlestickChartWithPinch({
  candles,
  supportResistance = [],
  patterns = [],
  indicators,
  activeIndicators = { ma5: false, ma20: false, ma60: false, bb: false },
  width = SCREEN_WIDTH - 16,
  height = 300,
  currency = "KRW",
}: CandlestickChartWithPinchProps) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1x ~ 5x
  const [scrollOffset, setScrollOffset] = useState(0); // 스크롤 오프셋
  
  // 핀치 제스처 상태
  const pinchScale = useSharedValue(1);
  const lastZoomLevel = useRef(1);
  const lastPinchDistance = useRef(0);

  const PADDING = { top: 16, right: 60, bottom: 8, left: 8 };
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // 줌 레벨에 따른 표시 캔들 개수 계산
  const baseVisibleCount = 60;
  const visibleCandleCount = Math.max(10, Math.floor(baseVisibleCount / zoomLevel));

  // 스크롤 오프셋을 고려한 표시 캔들
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
    return { minPrice: min - padding, maxPrice: max + padding, priceRange: max - min + padding * 2 };
  }, [visibleCandles, supportResistance]);

  const toY = useCallback(
    (price: number) =>
      PADDING.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight,
    [minPrice, priceRange, chartHeight, PADDING.top]
  );

  const candleWidth = Math.max(2, chartWidth / visibleCandles.length - 1);

  const toX = useCallback(
    (index: number) => {
      const relativeIndex = index - startIndex;
      return PADDING.left + relativeIndex * (chartWidth / visibleCandles.length) + candleWidth / 2;
    },
    [startIndex, chartWidth, visibleCandles.length, candleWidth, PADDING.left]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const x = e.nativeEvent.locationX - PADDING.left;
          const idx = Math.round((x / chartWidth) * (visibleCandles.length - 1));
          const clampedIdx = Math.max(0, Math.min(visibleCandles.length - 1, idx));
          setSelectedIndex(startIndex + clampedIdx);
        },
        onPanResponderMove: (e) => {
          const x = e.nativeEvent.locationX - PADDING.left;
          const idx = Math.round((x / chartWidth) * (visibleCandles.length - 1));
          const clampedIdx = Math.max(0, Math.min(visibleCandles.length - 1, idx));
          setSelectedIndex(startIndex + clampedIdx);
        },
        onPanResponderRelease: () => {
          setTimeout(() => setSelectedIndex(null), 2000);
        },
      }),
    [chartWidth, visibleCandles.length, startIndex, PADDING.left]
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

  // 핀치 제스처 핸들러
  const handlePinchGesture = (event: any) => {
    const { scale } = event.nativeEvent;
    
    // 현재 줌 레벨 계산
    const newZoomLevel = lastZoomLevel.current * scale;
    const clampedZoom = Math.max(1, Math.min(5, newZoomLevel));
    
    setZoomLevel(clampedZoom);
  };

  const handlePinchEnd = (event: any) => {
    const { scale } = event.nativeEvent;
    lastZoomLevel.current = Math.max(1, Math.min(5, lastZoomLevel.current * scale));
  };

  // 더블탭 줌 리셋
  const handleDoubleTap = () => {
    setZoomLevel(1);
    setScrollOffset(0);
    lastZoomLevel.current = 1;
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.min(5, prev + 0.5);
      lastZoomLevel.current = newZoom;
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(1, prev - 0.5);
      lastZoomLevel.current = newZoom;
      return newZoom;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setScrollOffset(0);
    lastZoomLevel.current = 1;
  };

  const handleScroll = (direction: "left" | "right") => {
    const maxOffset = Math.max(0, candles.length - visibleCandleCount);
    if (direction === "left") {
      setScrollOffset((prev) => Math.max(0, prev - 5));
    } else {
      setScrollOffset((prev) => Math.min(maxOffset, prev + 5));
    }
  };

  const chartContent = (
    <View {...panResponder.panHandlers}>
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
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
            <SvgText
              x={width - PADDING.right + 4}
              y={label.y + 4}
              fontSize={9}
              fill={colors.muted}
            >
              {formatPrice(label.price)}
            </SvgText>
          </G>
        ))}

        {/* Support & Resistance Lines */}
        {supportResistance.map((sr, i) => {
          const y = toY(sr.price);
          if (y < PADDING.top || y > height - PADDING.bottom) return null;
          const color = sr.type === "support" ? colors.support : colors.resistance;
          return (
            <G key={`sr-${i}`}>
              <Line
                x1={PADDING.left}
                y1={y}
                x2={width - PADDING.right}
                y2={y}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="6,3"
                opacity={0.8}
              />
              <SvgText
                x={width - PADDING.right + 4}
                y={y - 2}
                fontSize={8}
                fill={color}
                fontWeight="600"
              >
                {sr.type === "support" ? "S" : "R"}
              </SvgText>
            </G>
          );
        })}

        {/* Candlesticks */}
        {visibleCandles.map((candle, visIdx) => {
          const i = startIndex + visIdx;
          const x = toX(i);
          const openY = toY(candle.open);
          const closeY = toY(candle.close);
          const highY = toY(candle.high);
          const lowY = toY(candle.low);

          const isGreen = candle.close >= candle.open;
          const candleColor = isGreen ? colors.bullish : colors.bearish;
          const wickY1 = highY;
          const wickY2 = lowY;

          return (
            <G key={`candle-${i}`}>
              {/* Wick */}
              <Line
                x1={x}
                y1={wickY1}
                x2={x}
                y2={wickY2}
                stroke={candleColor}
                strokeWidth={0.5}
              />
              {/* Body */}
              <Rect
                x={x - candleWidth / 2}
                y={Math.min(openY, closeY)}
                width={candleWidth}
                height={Math.abs(closeY - openY) || 1}
                fill={candleColor}
                stroke={candleColor}
                strokeWidth={0.5}
              />
            </G>
          );
        })}

        {/* Crosshair */}
        {selectedIndex != null && selectedCandle && (() => {
          const x = toX(selectedIndex);
          const y = toY(selectedCandle.close);
          return (
            <G>
              <Line
                x1={PADDING.left}
                y1={y}
                x2={width - PADDING.right}
                y2={y}
                stroke={colors.primary}
                strokeWidth={1}
                opacity={0.5}
              />
              <Line
                x1={x}
                y1={PADDING.top}
                x2={x}
                y2={height - PADDING.bottom}
                stroke={colors.primary}
                strokeWidth={1}
                opacity={0.5}
              />
            </G>
          );
        })()}
      </Svg>
    </View>
  );

  return (
    <GestureHandlerRootView style={[styles.container, { width, height }]}>
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

      {/* 줌 컨트롤 버튼 */}
      <View style={[styles.zoomControls, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.zoomButton, { borderColor: colors.border }]}
          onPress={handleZoomOut}
        >
          <Text style={[styles.zoomButtonText, { color: colors.foreground }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.zoomLevel, { color: colors.muted }]}>{zoomLevel.toFixed(1)}x</Text>
        <TouchableOpacity
          style={[styles.zoomButton, { borderColor: colors.border }]}
          onPress={handleZoomIn}
        >
          <Text style={[styles.zoomButtonText, { color: colors.foreground }]}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: colors.primary }]}
          onPress={handleResetZoom}
        >
          <Text style={[styles.resetButtonText, { color: colors.background }]}>리셋</Text>
        </TouchableOpacity>
        {Platform.OS !== "web" && (
          <Text style={[styles.gestureHint, { color: colors.muted }]}>
            💡 두 손가락으로 핀치
          </Text>
        )}
      </View>

      {/* 차트 - 핀치 제스처 래퍼 */}
      {Platform.OS !== "web" ? (
        <TapGestureHandler
          numberOfTaps={2}
          onActivated={handleDoubleTap}
        >
          <PinchGestureHandler
            onGestureEvent={handlePinchGesture}
            onHandlerStateChange={handlePinchEnd}
          >
            <Animated.View>{chartContent}</Animated.View>
          </PinchGestureHandler>
        </TapGestureHandler>
      ) : (
        chartContent
      )}

      {/* 스크롤 컨트롤 */}
      {zoomLevel > 1 && (
        <View style={[styles.scrollControls, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.scrollButton, { borderColor: colors.border }]}
            onPress={() => handleScroll("left")}
          >
            <Text style={[styles.scrollButtonText, { color: colors.foreground }]}>◀</Text>
          </TouchableOpacity>
          <View style={[styles.scrollIndicator, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.scrollIndicatorFill,
                {
                  backgroundColor: colors.primary,
                  width: `${((startIndex + visibleCandleCount / 2) / candles.length) * 100}%`,
                },
              ]}
            />
          </View>
          <TouchableOpacity
            style={[styles.scrollButton, { borderColor: colors.border }]}
            onPress={() => handleScroll("right")}
          >
            <Text style={[styles.scrollButtonText, { color: colors.foreground }]}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  infoText: {
    fontSize: 11,
    fontWeight: "600",
  },
  zoomControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexWrap: "wrap",
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  zoomLevel: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  gestureHint: {
    fontSize: 10,
    fontStyle: "italic",
  },
  scrollControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  scrollButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollIndicator: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  scrollIndicatorFill: {
    height: "100%",
    borderRadius: 2,
  },
});
