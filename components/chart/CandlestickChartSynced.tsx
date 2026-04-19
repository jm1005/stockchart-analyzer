import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from "react-native";
import Svg, { Rect, Line, G, Path, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import type { Candle, SupportResistanceLevel, PatternResult, TechnicalIndicators } from "@/shared/stockTypes";
import { useCallback, useMemo, useState, useRef } from "react";
import { GestureHandlerRootView, PinchGestureHandler, TapGestureHandler, PanGestureHandler } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CandlestickChartSyncedProps {
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
  // 외부에서 제어하는 상태
  zoomLevel: number;
  scrollOffset: number;
  onZoomChange: (zoom: number) => void;
  onScrollChange: (offset: number) => void;
  onDoubleTap?: () => void;
}

export function CandlestickChartSynced({
  candles,
  supportResistance = [],
  patterns = [],
  indicators,
  activeIndicators = { ma5: false, ma20: false, ma60: false, bb: false },
  width = SCREEN_WIDTH - 16,
  height = 300,
  currency = "KRW",
  zoomLevel,
  scrollOffset,
  onZoomChange,
  onScrollChange,
  onDoubleTap,
}: CandlestickChartSyncedProps) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // 핀치 제스처 상태
  const lastZoomLevel = useRef(zoomLevel);
  
  // 드래그 제스처 상태
  const dragVelocity = useRef(0);

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
    const newZoomLevel = lastZoomLevel.current * scale;
    const clampedZoom = Math.max(1, Math.min(5, newZoomLevel));
    onZoomChange(clampedZoom);
  };

  const handlePinchEnd = (event: any) => {
    const { scale } = event.nativeEvent;
    lastZoomLevel.current = Math.max(1, Math.min(5, lastZoomLevel.current * scale));
  };

  // 드래그 제스처 핸들러
  const handlePanGesture = (event: any) => {
    if (zoomLevel <= 1) return;
    
    const { translationX, velocityX } = event.nativeEvent;
    dragVelocity.current = velocityX;
    
    const pixelsPerCandle = chartWidth / visibleCandles.length;
    const candleOffset = -translationX / pixelsPerCandle;
    
    const maxOffset = Math.max(0, candles.length - visibleCandleCount);
    const newOffset = Math.max(0, Math.min(scrollOffset + candleOffset, maxOffset));
    
    onScrollChange(newOffset);
  };

  const handlePanEnd = (event: any) => {
    if (zoomLevel <= 1) return;
    
    const { velocityX } = event.nativeEvent;
    
    if (Math.abs(velocityX) > 100) {
      const pixelsPerCandle = chartWidth / visibleCandles.length;
      const additionalOffset = (velocityX / 1000) * 5;
      
      const maxOffset = Math.max(0, candles.length - visibleCandleCount);
      const newOffset = Math.max(0, Math.min(scrollOffset + additionalOffset, maxOffset));
      
      onScrollChange(newOffset);
    }
  };

  // 더블탭 줌 리셋
  const handleDoubleTap = () => {
    if (onDoubleTap) {
      onDoubleTap();
    }
  };

  const chartContent = (
    <View>
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
      {selectedIndex != null && selectedCandle ? (
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

      {/* 차트 - 핀치 + 드래그 제스처 래퍼 */}
      {Platform.OS !== "web" ? (
        <TapGestureHandler
          numberOfTaps={2}
          onActivated={handleDoubleTap}
        >
          <PinchGestureHandler
            onGestureEvent={handlePinchGesture}
            onHandlerStateChange={handlePinchEnd}
          >
            <PanGestureHandler
              onGestureEvent={handlePanGesture}
              onHandlerStateChange={handlePanEnd}
              enabled={zoomLevel > 1}
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
});
