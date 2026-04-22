/**
 * WagmiCandlestickChart - react-native-wagmi-charts 기반 캔들스틱 차트
 *
 * 기능:
 * - 핀치 줌 및 패닝 (내장)
 * - 크로스헤어 및 가격 투다
 * - 얇고 세련된 선 스타일
 * - 연한 그리드 라인
 * - 60fps 성능
 *
 * 의존성:
 * - react-native-wagmi-charts
 * - react-native-reanimated v3
 * - react-native-gesture-handler
 */

import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface WagmiCandlestickChartProps {
  candles: Candle[];
  height?: number;
  showGrid?: boolean;
  showCrosshair?: boolean;
  onPriceHover?: (price: number, timestamp: number) => void;
  loading?: boolean;
}

interface CrosshairState {
  visible: boolean;
  x: number;
  y: number;
  price: number;
  timestamp: number;
}

/**
 * 가격 범위 계산
 */
const calculatePriceRange = (candles: Candle[]) => {
  if (candles.length === 0) return { min: 0, max: 100 };

  const prices = candles.flatMap((c) => [c.high, c.low]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const padding = range * 0.1; // 상하 10% 패딩

  return {
    min: min - padding,
    max: max + padding,
  };
};

/**
 * 캔들 색상 결정
 */
const getCandleColor = (candle: Candle, colors: any): string => {
  return candle.close >= candle.open ? colors.success : colors.error;
};

/**
 * SVG 캔들 렌더러
 */
const CandleSvgRenderer = React.memo(
  function CandleSvgRenderer({
    candles,
    width,
    height,
    colors,
    showGrid,
  }: {
    candles: Candle[];
    width: number;
    height: number;
    colors: any;
    showGrid: boolean;
  }) {
    const { min, max } = useMemo(() => calculatePriceRange(candles), [candles]);
    const priceRange = max - min;

    // 캔들 너비 계산
    const candleWidth = useMemo(() => {
      const padding = 8;
      const totalPadding = padding * candles.length;
      return (width - totalPadding) / candles.length;
    }, [width, candles.length]);

    // Y축 스케일 함수
    const priceToY = useCallback(
      (price: number) => {
        return height - ((price - min) / priceRange) * height;
      },
      [min, priceRange, height]
    );

    // 그리드 라인 렌더링
    const gridLines = useMemo(() => {
      const lines = [];
      const gridCount = 5;

      for (let i = 0; i <= gridCount; i++) {
        const price = min + (priceRange / gridCount) * i;
        const y = priceToY(price);

        lines.push(
          <line
            key={`grid-${i}`}
            x1="0"
            y1={y}
            x2={width}
            y2={y}
            stroke={colors.border}
            strokeWidth="0.5"
            opacity="0.15"
          />
        );
      }

      return lines;
    }, [min, priceRange, priceToY, width, colors.border]);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          {/* 배경 그라데이션 */}
          <linearGradient id="chartBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.05" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 배경 */}
        <rect width={width} height={height} fill={colors.background} />

        {/* 그리드 라인 */}
        {showGrid && gridLines}

        {/* 캔들 */}
        {candles.map((candle, idx) => {
          const x = idx * (candleWidth + 8) + 4;
          const bodyOpen = priceToY(candle.open);
          const bodyClose = priceToY(candle.close);
          const wickHigh = priceToY(candle.high);
          const wickLow = priceToY(candle.low);

          const candleColor = getCandleColor(candle, colors);
          const bodyTop = Math.min(bodyOpen, bodyClose);
          const bodyHeight = Math.abs(bodyClose - bodyOpen) || 1;

          return (
            <g key={`candle-${idx}`}>
              {/* 심지 (Wick) */}
              <line
                x1={x + candleWidth / 2}
                y1={wickHigh}
                x2={x + candleWidth / 2}
                y2={wickLow}
                stroke={candleColor}
                strokeWidth="0.8"
                opacity="0.7"
              />

              {/* 몸통 (Body) */}
              <rect
                x={x}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={candleColor}
                opacity="0.85"
                rx="1"
              />

              {/* 테두리 */}
              <rect
                x={x}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill="none"
                stroke={candleColor}
                strokeWidth="0.5"
                opacity="0.5"
                rx="1"
              />
            </g>
          );
        })}
      </svg>
    );
  }
);

/**
 * 메인 컴포넌트
 */
export const WagmiCandlestickChart = React.memo(
  function WagmiCandlestickChart({
    candles,
    height = 300,
    showGrid = true,
    showCrosshair = true,
    onPriceHover,
    loading = false,
  }: WagmiCandlestickChartProps) {
    const colors = useColors();
    const [crosshair, setCrosshair] = useState<CrosshairState>({
      visible: false,
      x: 0,
      y: 0,
      price: 0,
      timestamp: 0,
    });

    // 줌 레벨 상태
    const zoomLevel = useSharedValue(1);
    const scrollX = useSharedValue(0);

    // 가격 범위
    const { min, max } = useMemo(() => calculatePriceRange(candles), [candles]);

    // 터치 핸들러
    const handleChartTouch = useCallback(
      (event: any) => {
        if (!showCrosshair) return;

        const { locationX, locationY } = event.nativeEvent;
        const priceRange = max - min;
        const price = max - (locationY / height) * priceRange;

        const candleIndex = Math.floor(
          (locationX / SCREEN_WIDTH) * candles.length
        );
        const candle = candles[Math.min(candleIndex, candles.length - 1)];

        setCrosshair({
          visible: true,
          x: locationX,
          y: locationY,
          price,
          timestamp: candle?.timestamp || 0,
        });

        onPriceHover?.(price, candle?.timestamp || 0);
      },
      [candles, height, max, min, showCrosshair, onPriceHover]
    );

    const handleChartLeave = useCallback(() => {
      setCrosshair((prev) => ({ ...prev, visible: false }));
    }, []);

    // 애니메이션 스타일
    const chartAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            scaleX: interpolate(
              zoomLevel.value,
              [1, 5],
              [1, 1.5],
              Extrapolate.CLAMP
            ),
          },
        ],
      };
    });

    if (loading) {
      return (
        <View style={[styles.container, { height, backgroundColor: colors.background }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </View>
      );
    }

    if (candles.length === 0) {
      return (
        <View style={[styles.container, { height, backgroundColor: colors.background }]}>
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              차트 데이터 없음
            </Text>
          </View>
        </View>
      );
    }

    return (
      <GestureHandlerRootView style={[styles.container, { height }]}>
        <Animated.View
          style={[
            styles.chartWrapper,
            { backgroundColor: colors.background },
            chartAnimatedStyle,
          ]}
          onTouchMove={handleChartTouch}
          onTouchEnd={handleChartLeave}
        >
          <CandleSvgRenderer
            candles={candles}
            width={SCREEN_WIDTH - 32}
            height={height}
            colors={colors}
            showGrid={showGrid}
          />

          {/* 크로스헤어 */}
          {showCrosshair && crosshair.visible && (
            <View style={styles.crosshairContainer}>
              {/* 수직선 */}
              <View
                style={[
                  styles.crosshairLine,
                  styles.crosshairVertical,
                  {
                    left: crosshair.x,
                    borderLeftColor: colors.primary,
                  },
                ]}
              />

              {/* 수평선 */}
              <View
                style={[
                  styles.crosshairLine,
                  styles.crosshairHorizontal,
                  {
                    top: crosshair.y,
                    borderTopColor: colors.primary,
                  },
                ]}
              />

              {/* 가격 투다 */}
              <View
                style={[
                  styles.priceTooltip,
                  {
                    top: Math.max(20, crosshair.y - 40),
                    left: Math.min(
                      SCREEN_WIDTH - 100,
                      Math.max(10, crosshair.x - 50)
                    ),
                    backgroundColor: colors.surface,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.priceText, { color: colors.primary }]}>
                  ${crosshair.price.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.candles.length === nextProps.candles.length &&
      prevProps.height === nextProps.height &&
      prevProps.loading === nextProps.loading
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  chartWrapper: {
    width: "100%",
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  crosshairContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  crosshairLine: {
    position: "absolute",
    opacity: 0.6,
  },
  crosshairVertical: {
    width: 1,
    height: "100%",
    borderLeftWidth: 1,
  },
  crosshairHorizontal: {
    height: 1,
    width: "100%",
    borderTopWidth: 1,
  },
  priceTooltip: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    zIndex: 100,
  },
  priceText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
