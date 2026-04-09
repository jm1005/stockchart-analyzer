import React, { useMemo, useCallback, useState, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Line, Rect, Text as SvgText, G } from "react-native-svg";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useDerivedValue,
  useAnimatedProps,
  runOnJS,
} from "react-native-reanimated";
import type { Candle, TechnicalIndicators } from "@/shared/stockTypes";
import { useColors } from "@/hooks/use-colors";

interface AdvancedCandlestickChartProps {
  candles: Candle[];
  width?: number;
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
}

interface ViewportState {
  startIndex: number;
  endIndex: number;
  candleWidth: number;
  minPrice: number;
  maxPrice: number;
}

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/**
 * 고성능 핸치 줌 캔들스틱 차트
 *
 * 특징:
 * - GestureHandler 기반 부드러운 줌/패닝
 * - Reanimated v3 최적화 (useDerivedValue)
 * - 동적 인덱스 범위 계산
 * - 자동 Y축 스케일링
 * - 줌 상태 유지
 */
export function AdvancedCandlestickChart({
  candles,
  width = Dimensions.get("window").width,
  height = 400,
  showVolume = true,
  showIndicators = false,
}: AdvancedCandlestickChartProps) {
  const colors = useColors();
  const chartWidth = width - 60; // 좌우 패딩
  const chartHeight = showVolume ? height * 0.7 : height;
  const volumeHeight = showVolume ? height * 0.3 : 0;

  // 줌 상태
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  // 뷰포트 상태
  const [viewport, setViewport] = useState<ViewportState>({
    startIndex: Math.max(0, candles.length - 60),
    endIndex: candles.length - 1,
    candleWidth: chartWidth / 60,
    minPrice: 0,
    maxPrice: 0,
  });

  /**
   * 동적 인덱스 범위 계산
   * 줌 레벨에 따라 표시할 캔들 개수를 동적으로 조정합니다.
   */
  const calculateViewport = useCallback(
    (zoomLevel: number, panX: number): ViewportState => {
      // 줌 레벨에 따른 캔들 개수 (1x: 60개, 2x: 30개, 5x: 12개)
      const baseCandleCount = 60;
      const visibleCandleCount = Math.max(
        5,
        Math.floor(baseCandleCount / zoomLevel)
      );

      // 패닝에 따른 시작 인덱스 계산
      const pixelPerCandle = chartWidth / visibleCandleCount;
      const panOffset = Math.floor(panX / pixelPerCandle);
      let startIndex = Math.max(
        0,
        candles.length - visibleCandleCount - panOffset
      );
      let endIndex = Math.min(candles.length - 1, startIndex + visibleCandleCount);

      // 범위 재조정
      if (endIndex - startIndex < visibleCandleCount) {
        startIndex = Math.max(0, endIndex - visibleCandleCount);
      }

      // 가격 범위 계산 (자동 Y축 스케일링)
      const visibleCandles = candles.slice(startIndex, endIndex + 1);
      const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;
      const padding = priceRange * 0.1; // 10% 패딩

      return {
        startIndex,
        endIndex,
        candleWidth: chartWidth / (endIndex - startIndex + 1),
        minPrice: minPrice - padding,
        maxPrice: maxPrice + padding,
      };
    },
    [candles, chartWidth]
  );

  /**
   * 줌 레벨 변경 시 뷰포트 업데이트
   */
  const updateViewport = useCallback(
    (zoomLevel: number, panX: number) => {
      const newViewport = calculateViewport(zoomLevel, panX);
      setViewport(newViewport);
    },
    [calculateViewport]
  );

  /**
   * 핀치 줌 제스처
   */
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      // 줌 범위 제한 (1x ~ 5x)
      const newScale = Math.max(1, Math.min(5, event.scale));
      scale.value = newScale;

      // 뷰포트 업데이트 (메인 스레드)
      runOnJS(updateViewport)(newScale, offsetX.value);
    })
    .onEnd(() => {
      // 줌 상태 유지 (스프링 애니메이션 없음)
      // scale.value = withSpring(scale.value);
    });

  /**
   * 패닝 제스처
   */
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      offsetX.value = event.translationX;
      runOnJS(updateViewport)(scale.value, event.translationX);
    })
    .onEnd(() => {
      // 패닝 상태 유지
      // offsetX.value = withSpring(0);
    });

  /**
   * 더블탭으로 리셋
   */
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      offsetX.value = withSpring(0);
      runOnJS(updateViewport)(1, 0);
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  /**
   * 가격을 Y 픽셀 좌표로 변환
   */
  const priceToPixelY = useCallback(
    (price: number): number => {
      const { minPrice, maxPrice } = viewport;
      const priceRange = maxPrice - minPrice;
      const normalized = (price - minPrice) / priceRange;
      return chartHeight - normalized * chartHeight;
    },
    [viewport, chartHeight]
  );

  /**
   * 캔들 렌더링
   */
  const candleElements = useMemo(() => {
    const { startIndex, endIndex, candleWidth } = viewport;
    const elements = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const candle = candles[i];
      const x = (i - startIndex) * candleWidth + 30; // 좌측 패딩

      const openY = priceToPixelY(candle.open);
      const closeY = priceToPixelY(candle.close);
      const highY = priceToPixelY(candle.high);
      const lowY = priceToPixelY(candle.low);

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;
      const isBullish = candle.close >= candle.open;
      const candleColor = isBullish ? colors.success : colors.error;

      elements.push(
        <G key={`candle-${i}`}>
          {/* 심지 (Wick) */}
          <Line
            x1={x + candleWidth / 2}
            y1={highY}
            x2={x + candleWidth / 2}
            y2={lowY}
            stroke={candleColor}
            strokeWidth="1"
            opacity="0.6"
          />

          {/* 몸통 (Body) */}
          <Rect
            x={x + candleWidth * 0.1}
            y={bodyTop}
            width={candleWidth * 0.8}
            height={bodyHeight}
            fill={candleColor}
            opacity={isBullish ? 0.3 : 0.6}
            stroke={candleColor}
            strokeWidth="1"
          />
        </G>
      );
    }

    return elements;
  }, [viewport, candles, priceToPixelY, colors]);

  /**
   * Y축 레이블 렌더링
   */
  const yAxisLabels = useMemo(() => {
    const { minPrice, maxPrice } = viewport;
    const labels = [];
    const step = (maxPrice - minPrice) / 4;

    for (let i = 0; i <= 4; i++) {
      const price = minPrice + step * i;
      const y = priceToPixelY(price);

      labels.push(
        <G key={`y-label-${i}`}>
          <Line
            x1="25"
            y1={y}
            x2="30"
            y2={y}
            stroke={colors.border}
            strokeWidth="1"
          />
          <SvgText
            x="20"
            y={y + 4}
            fontSize="10"
            fill={colors.muted}
            textAnchor="end"
          >
            {Math.round(price).toLocaleString("ko-KR")}
          </SvgText>
        </G>
      );
    }

    return labels;
  }, [viewport, priceToPixelY, colors]);

  /**
   * 볼륨 차트 렌더링
   */
  const volumeElements = useMemo(() => {
    if (!showVolume) return [];

    const { startIndex, endIndex, candleWidth } = viewport;
    const volumeData = candles.slice(startIndex, endIndex + 1);
    const maxVolume = Math.max(...volumeData.map((c) => c.volume));
    const elements = [];
    const volHeight = volumeHeight - 20;

    for (let i = 0; i < volumeData.length; i++) {
      const candle = volumeData[i];
      const x = i * candleWidth + 30;
      const barHeight = (candle.volume / maxVolume) * volHeight;

      elements.push(
        <Rect
          key={`volume-${i}`}
          x={x + candleWidth * 0.1}
          y={chartHeight + 20 + (volHeight - barHeight)}
          width={candleWidth * 0.8}
          height={barHeight}
          fill={colors.muted}
          opacity="0.3"
        />
      );
    }

    return elements;
  }, [viewport, candles, showVolume, chartHeight, volumeHeight, colors]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.chartContainer, { width, height }]}>
          <AnimatedSvg
            width={width}
            height={height}
            style={[
              styles.svg,
              useAnimatedStyle(() => ({
                transform: [{ scale: scale.value }],
              })),
            ]}
          >
            {/* 배경 */}
            <Rect
              x="0"
              y="0"
              width={width}
              height={height}
              fill={colors.background}
            />

            {/* 그리드 */}
            <Line
              x1="30"
              y1={chartHeight}
              x2={width - 30}
              y2={chartHeight}
              stroke={colors.border}
              strokeWidth="1"
            />

            {/* Y축 레이블 */}
            {yAxisLabels}

            {/* 캔들 */}
            {candleElements}

            {/* 볼륨 */}
            {volumeElements}

            {/* 줌 레벨 표시 */}
            <SvgText
              x={width - 40}
              y="20"
              fontSize="12"
              fill={colors.muted}
              textAnchor="end"
            >
              {scale.value.toFixed(1)}x
            </SvgText>
          </AnimatedSvg>
        </View>
      </GestureDetector>

      {/* 줌 팁 */}
      <View style={styles.tip}>
        <SvgText
          x="0"
          y="0"
          fontSize="12"
          fill={colors.muted}
        >
          핀치 줌 / 더블탭 리셋
        </SvgText>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    overflow: "hidden",
  },
  svg: {
    width: "100%",
    height: "100%",
  },
  tip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
});
