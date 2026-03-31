import React, { useMemo, useCallback, useState } from "react";
import { View, Text, StyleSheet, Dimensions, PanResponder } from "react-native";
import Svg, { Rect, Line, G, Path, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import type { Candle, SupportResistanceLevel, PatternResult, TechnicalIndicators } from "@/shared/stockTypes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
}: CandlestickChartProps) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const PADDING = { top: 16, right: 60, bottom: 8, left: 8 };
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const visibleCandles = useMemo(() => {
    if (candles.length <= 60) return candles;
    return candles.slice(candles.length - 60);
  }, [candles]);

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 0, maxPrice: 100, priceRange: 100 };
    let min = Infinity;
    let max = -Infinity;
    for (const c of visibleCandles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    // Add SR levels to range
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
  const offset = candles.length > 60 ? candles.length - 60 : 0;

  const toX = useCallback(
    (index: number) =>
      PADDING.left + (index - offset) * (chartWidth / visibleCandles.length) + candleWidth / 2,
    [offset, chartWidth, visibleCandles.length, candleWidth, PADDING.left]
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
          setSelectedIndex(offset + clampedIdx);
        },
        onPanResponderMove: (e) => {
          const x = e.nativeEvent.locationX - PADDING.left;
          const idx = Math.round((x / chartWidth) * (visibleCandles.length - 1));
          const clampedIdx = Math.max(0, Math.min(visibleCandles.length - 1, idx));
          setSelectedIndex(offset + clampedIdx);
        },
        onPanResponderRelease: () => {
          setTimeout(() => setSelectedIndex(null), 2000);
        },
      }),
    [chartWidth, visibleCandles.length, offset, PADDING.left]
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

          {/* Bollinger Bands */}
          {indicators && activeIndicators.bb && (() => {
            const bb = indicators.bollingerBands;
            const upperPath: string[] = [];
            const lowerPath: string[] = [];
            let upperStarted = false;
            let lowerStarted = false;

            for (let i = offset; i < candles.length; i++) {
              const upper = bb.upper[i];
              const lower = bb.lower[i];
              const x = toX(i);
              if (upper != null) {
                const y = toY(upper);
                if (!upperStarted) { upperPath.push(`M ${x} ${y}`); upperStarted = true; }
                else upperPath.push(`L ${x} ${y}`);
              }
              if (lower != null) {
                const y = toY(lower);
                if (!lowerStarted) { lowerPath.push(`M ${x} ${y}`); lowerStarted = true; }
                else lowerPath.push(`L ${x} ${y}`);
              }
            }
            return (
              <G>
                <Path d={upperPath.join(" ")} stroke="#8B5CF6" strokeWidth={1} fill="none" opacity={0.6} />
                <Path d={lowerPath.join(" ")} stroke="#8B5CF6" strokeWidth={1} fill="none" opacity={0.6} />
              </G>
            );
          })()}

          {/* MA Lines */}
          {indicators && (
            <>
              {activeIndicators.ma5 && renderMALine(indicators.ma5, offset, candles.length, toX, toY, "#F59E0B")}
              {activeIndicators.ma20 && renderMALine(indicators.ma20, offset, candles.length, toX, toY, "#3B82F6")}
              {activeIndicators.ma60 && renderMALine(indicators.ma60, offset, candles.length, toX, toY, "#EC4899")}
            </>
          )}

          {/* Candlesticks */}
          {visibleCandles.map((candle, visIdx) => {
            const i = offset + visIdx;
            const x = toX(i);
            const openY = toY(candle.open);
            const closeY = toY(candle.close);
            const highY = toY(candle.high);
            const lowY = toY(candle.low);
            const isBullish = candle.close >= candle.open;
            const color = isBullish ? colors.bullish : colors.bearish;
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1, Math.abs(closeY - openY));
            const isSelected = selectedIndex === i;

            return (
              <G key={i}>
                {/* Wick */}
                <Line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth={1}
                  opacity={isSelected ? 1 : 0.9}
                />
                {/* Body */}
                <Rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isBullish ? color : color}
                  opacity={isSelected ? 1 : 0.85}
                  rx={1}
                />
                {/* Selection highlight */}
                {isSelected && (
                  <Line
                    x1={x}
                    y1={PADDING.top}
                    x2={x}
                    y2={height - PADDING.bottom}
                    stroke={colors.muted}
                    strokeWidth={1}
                    strokeDasharray="3,3"
                    opacity={0.5}
                  />
                )}
              </G>
            );
          })}

          {/* Pattern markers */}
          {patterns.map((pattern, i) => {
            const endIdx = Math.min(pattern.endIndex, candles.length - 1);
            const x = toX(endIdx);
            const y = PADDING.top + 8;
            const patternColor = pattern.signal === "bullish" ? colors.bullish : pattern.signal === "bearish" ? colors.bearish : colors.muted;
            return (
              <G key={`pattern-${i}`}>
                <Rect
                  x={x - 12}
                  y={y - 8}
                  width={24}
                  height={14}
                  fill={patternColor}
                  opacity={0.85}
                  rx={3}
                />
                <SvgText
                  x={x}
                  y={y + 2}
                  fontSize={7}
                  fill="#fff"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {pattern.signal === "bullish" ? "▲" : pattern.signal === "bearish" ? "▼" : "◆"}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

function renderMALine(
  maData: (number | null)[],
  offset: number,
  total: number,
  toX: (i: number) => number,
  toY: (price: number) => number,
  color: string
) {
  const pathParts: string[] = [];
  let started = false;
  for (let i = offset; i < total; i++) {
    const val = maData[i];
    if (val == null) { started = false; continue; }
    const x = toX(i);
    const y = toY(val);
    if (!started) { pathParts.push(`M ${x} ${y}`); started = true; }
    else pathParts.push(`L ${x} ${y}`);
  }
  if (pathParts.length === 0) return null;
  return <Path key={color} d={pathParts.join(" ")} stroke={color} strokeWidth={1.5} fill="none" opacity={0.8} />;
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  infoBar: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 8,
    flexWrap: "wrap",
  },
  infoText: {
    fontSize: 10,
    fontWeight: "500",
  },
});
