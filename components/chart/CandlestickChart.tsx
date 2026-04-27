import React, { useMemo, useCallback, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Line, Rect, Text as SvgText, G } from "react-native-svg";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from "react-native-reanimated";

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  candles: Candle[];
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

// 💡 ト스/트레이딩뷰 감성의 부드러운 핀치 줌인/아웃 캔들스틱 차트
export default function CandlestickChart({ candles }: Props) {
  const chartWidth = SCREEN_WIDTH - 60; 
  const chartHeight = 250;

  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);

  const [viewport, setViewport] = useState({
    startIndex: Math.max(0, candles.length - 60), // 기본 60개 캔들 표시
    endIndex: candles.length - 1,
    candleWidth: chartWidth / 60,
    minPrice: 0,
    maxPrice: 0,
  });

  const calculateViewport = useCallback((zoomLevel: number, panX: number) => {
    const visibleCount = Math.max(10, Math.floor(60 / zoomLevel));
    const pixelPerCandle = chartWidth / visibleCount;
    const panOffset = Math.floor(panX / pixelPerCandle);
    
    let startIndex = Math.max(0, candles.length - visibleCount - panOffset);
    let endIndex = Math.min(candles.length - 1, startIndex + visibleCount);

    if (endIndex - startIndex < visibleCount) {
      startIndex = Math.max(0, endIndex - visibleCount);
    }

    const visibleCandles = candles.slice(startIndex, endIndex + 1);
    const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1;

    return {
      startIndex,
      endIndex,
      candleWidth: chartWidth / (endIndex - startIndex + 1),
      minPrice: minPrice - padding,
      maxPrice: maxPrice + padding,
    };
  }, [candles, chartWidth]);

  const updateViewport = useCallback((zoomLevel: number, panX: number) => {
    setViewport(calculateViewport(zoomLevel, panX));
  }, [calculateViewport]);

  // 💡 핀치 (줌 인/아웃) 제스처
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = Math.max(0.5, Math.min(5, event.scale));
      scale.value = newScale;
      runOnJS(updateViewport)(newScale, offsetX.value);
    });

  // 💡 패닝 (좌우 이동) 제스처
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      offsetX.value = event.translationX;
      runOnJS(updateViewport)(scale.value, event.translationX);
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const priceToY = useCallback((price: number) => {
    const { minPrice, maxPrice } = viewport;
    const range = maxPrice - minPrice;
    return chartHeight - ((price - minPrice) / range) * chartHeight;
  }, [viewport, chartHeight]);

  const { minPrice, maxPrice, startIndex, endIndex, candleWidth } = viewport;

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.chartContainer}>
          <AnimatedSvg width={SCREEN_WIDTH} height={chartHeight} style={styles.svg}>
            {/* 배경선 (토스 감성의 연한 선) */}
            <Line x1="45" y1={chartHeight} x2={SCREEN_WIDTH} y2={chartHeight} stroke="#f1f5f9" strokeWidth="1" />
            <Line x1="45" y1={chartHeight/2} x2={SCREEN_WIDTH} y2={chartHeight/2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* 가격 라벨 */}
            <SvgText x="40" y="15" fontSize="10" fill="#94a3b8" textAnchor="end">
              {Math.round(maxPrice).toLocaleString()}
            </SvgText>
            <SvgText x="40" y={chartHeight - 5} fontSize="10" fill="#94a3b8" textAnchor="end">
              {Math.round(minPrice).toLocaleString()}
            </SvgText>

            {/* 캔들 그리기 */}
            {candles.slice(startIndex, endIndex + 1).map((candle, idx) => {
              const x = idx * candleWidth + 50;
              const topY = priceToY(Math.max(candle.open, candle.close));
              const bottomY = priceToY(Math.min(candle.open, candle.close));
              const isBull = candle.close >= candle.open;
              const color = isBull ? "#ef4444" : "#3b82f6"; // 상승 빨강, 하락 파랑

              return (
                <G key={idx}>
                  <Line x1={x + candleWidth / 2} y1={priceToY(candle.high)} x2={x + candleWidth / 2} y2={priceToY(candle.low)} stroke={color} strokeWidth="1.5" />
                  <Rect x={x + candleWidth * 0.1} y={topY} width={candleWidth * 0.8} height={Math.max(1, bottomY - topY)} fill={color} rx="1" />
                </G>
              );
            })}
          </AnimatedSvg>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', marginVertical: 10 },
  chartContainer: { height: 250, width: '100%', overflow: 'hidden' },
  svg: { width: '100%', height: '100%' }
});