import React, { useState, useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, GestureResponderEvent } from "react-native";
import Svg, { Rect, Line, G, Path, Text as SvgText, Circle } from "react-native-svg";
import { PinchGestureHandler, PanGestureHandler, State } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import type { Candle, SupportResistanceLevel, PatternResult, TechnicalIndicators } from "@/shared/stockTypes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CandlestickChartOptimizedProps {
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
  }>;
}

const PADDING = { top: 20, right: 60, bottom: 40, left: 40 };
const MIN_VISIBLE_CANDLES = 10;
const MAX_VISIBLE_CANDLES = 200;
const BASE_VISIBLE_CANDLES = 60;

export function CandlestickChartOptimized({
  candles,
  supportResistance = [],
  patterns = [],
  indicators,
  activeIndicators = { ma5: false, ma20: false, ma60: false, bb: false },
  width = SCREEN_WIDTH - 16,
  height = 300,
  currency = "KRW",
  earnings = [],
}: CandlestickChartOptimizedProps) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 차트 영역 계산
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // ============ Shared Values (Reanimated) ============
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const baseOffsetX = useSharedValue(0);

  // ============ 줌 레벨에 따른 표시 캔들 수 계산 ============
  const visibleCandleCount = useMemo(() => {
    const count = Math.max(
      MIN_VISIBLE_CANDLES,
      Math.floor(BASE_VISIBLE_CANDLES / scale.value)
    );
    return Math.min(count, Math.min(MAX_VISIBLE_CANDLES, candles.length));
  }, [scale.value, candles.length]);

  // ============ 시작 인덱스 계산 (스크롤 오프셋 기반) ============
  const startIndex = useMemo(() => {
    const candleStep = chartWidth / visibleCandleCount;
    const index = Math.floor(Math.abs(offsetX.value) / candleStep);
    return Math.max(0, Math.min(index, candles.length - visibleCandleCount));
  }, [offsetX.value, chartWidth, visibleCandleCount, candles.length]);

  const endIndex = Math.min(startIndex + visibleCandleCount, candles.length);

  // ============ 화면에 보이는 캔들 데이터 ============
  const visibleCandles = useMemo(() => {
    return candles.slice(startIndex, endIndex);
  }, [candles, startIndex, endIndex]);

  // ============ Y축 범위 자동 계산 ============
  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (visibleCandles.length === 0) {
      return { minPrice: 0, maxPrice: 100, priceRange: 100 };
    }

    let min = Infinity;
    let max = -Infinity;

    // 캔들 데이터에서 최고/최저가 찾기
    for (const candle of visibleCandles) {
      min = Math.min(min, candle.low);
      max = Math.max(max, candle.high);
    }

    // 지지/저항 레벨 포함
    for (const sr of supportResistance) {
      min = Math.min(min, sr.price);
      max = Math.max(max, sr.price);
    }

    // 상하 패딩 추가 (5%)
    const padding = (max - min) * 0.05;
    const finalMin = min - padding;
    const finalMax = max + padding;

    return {
      minPrice: finalMin,
      maxPrice: finalMax,
      priceRange: finalMax - finalMin,
    };
  }, [visibleCandles, supportResistance]);

  // ============ 좌표 변환 함수 ============
  const toX = useCallback(
    (index: number) => {
      const candleWidth = chartWidth / visibleCandleCount;
      return PADDING.left + (index - startIndex) * candleWidth + candleWidth / 2;
    },
    [chartWidth, visibleCandleCount, startIndex]
  );

  const toY = useCallback(
    (price: number) => {
      if (priceRange === 0) return PADDING.top + chartHeight / 2;
      return (
        PADDING.top +
        chartHeight -
        ((price - minPrice) / priceRange) * chartHeight
      );
    },
    [minPrice, priceRange, chartHeight]
  );

  // ============ 캔들 너비 계산 (동적) ============
  const candleWidth = useMemo(() => {
    return Math.max(1, (chartWidth / visibleCandleCount) * 0.7);
  }, [chartWidth, visibleCandleCount]);

  const candleSpacing = useMemo(() => {
    return chartWidth / visibleCandleCount;
  }, [chartWidth, visibleCandleCount]);

  // ============ 핀치 제스처 핸들러 ============
  const pinchHandler = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      baseScale.value = scale.value;
    } else if (event.nativeEvent.state === State.ACTIVE) {
      // 줌 레벨 계산 (1x ~ 5x)
      const newScale = Math.max(1, Math.min(5, baseScale.value * event.nativeEvent.scale));
      scale.value = newScale;
    } else if (event.nativeEvent.state === State.END) {
      // 스프링 애니메이션으로 부드럽게 정렬
      scale.value = withSpring(Math.round(scale.value * 2) / 2);
    }
  };

  // ============ 팬 제스처 핸들러 ============
  const panHandler = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      baseOffsetX.value = offsetX.value;
    } else if (event.nativeEvent.state === State.ACTIVE) {
      // 최대 스크롤 범위 계산
      const maxOffset = chartWidth * (1 - 1 / scale.value);
      let newOffset = baseOffsetX.value + event.nativeEvent.translationX;

      // 바운더리 처리
      newOffset = Math.max(-maxOffset, Math.min(0, newOffset));
      offsetX.value = newOffset;
    } else if (event.nativeEvent.state === State.END) {
      // 관성 스크롤
      if (Math.abs(event.nativeEvent.velocityX) > 500) {
        const maxOffset = chartWidth * (1 - 1 / scale.value);
        let targetOffset = offsetX.value + event.nativeEvent.velocityX * 0.1;
        targetOffset = Math.max(-maxOffset, Math.min(0, targetOffset));
        offsetX.value = withSpring(targetOffset);
      }
    }
  };
  // ============ 차트 렌더링 ============
  const renderChart = () => {
    const elements = [];

    // 1. 배경
    elements.push(
      <Rect
        key="background"
        x="0"
        y="0"
        width={width}
        height={height}
        fill={colors.background}
      />
    );

    // 2. 그리드 라인
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = PADDING.top + (chartHeight / gridLines) * i;
      elements.push(
        <Line
          key={`grid-${i}`}
          x1={PADDING.left}
          y1={y}
          x2={width - PADDING.right}
          y2={y}
          stroke={colors.border}
          strokeWidth="0.5"
          opacity="0.3"
        />
      );
    }

    // 3. Y축 레이블
    for (let i = 0; i <= gridLines; i++) {
      const price =
        maxPrice - (priceRange / gridLines) * i;
      const y = PADDING.top + (chartHeight / gridLines) * i;
      elements.push(
        <SvgText
          key={`y-label-${i}`}
          x={width - PADDING.right + 8}
          y={y + 4}
          fontSize="10"
          fill={colors.muted}
        >
          {price.toFixed(0)}
        </SvgText>
      );
    }

    // 4. 캔들 렌더링
    for (let i = 0; i < visibleCandles.length; i++) {
      const candle = visibleCandles[i];
      const x = toX(startIndex + i);
      const openY = toY(candle.open);
      const closeY = toY(candle.close);
      const highY = toY(candle.high);
      const lowY = toY(candle.low);

      const isGreen = candle.close >= candle.open;
      const bodyColor = isGreen ? colors.success : colors.error;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;

      // 심지 (Wick)
      elements.push(
        <Line
          key={`wick-${i}`}
          x1={x}
          y1={highY}
          x2={x}
          y2={lowY}
          stroke={bodyColor}
          strokeWidth="0.5"
        />
      );

      // 몸통 (Body)
      elements.push(
        <Rect
          key={`candle-${i}`}
          x={x - candleWidth / 2}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={bodyColor}
          stroke={bodyColor}
          strokeWidth="0.5"
        />
      );
    }

    // 5. 이동평균선 (MA)
    if (activeIndicators.ma5 && indicators?.ma5) {
      const ma5Points = visibleCandles
        .map((_, i) => {
          const idx = startIndex + i;
          if (indicators.ma5[idx]) {
            return `${toX(idx)},${toY(indicators.ma5[idx])}`;
          }
          return null;
        })
        .filter(Boolean)
        .join(" L ");

      if (ma5Points) {
        elements.push(
          <Path
            key="ma5"
            d={`M ${ma5Points}`}
            stroke="#F59E0B"
            strokeWidth="1.5"
            fill="none"
          />
        );
      }
    }

    if (activeIndicators.ma20 && indicators?.ma20) {
      const ma20Points = visibleCandles
        .map((_, i) => {
          const idx = startIndex + i;
          if (indicators.ma20[idx]) {
            return `${toX(idx)},${toY(indicators.ma20[idx])}`;
          }
          return null;
        })
        .filter(Boolean)
        .join(" L ");

      if (ma20Points) {
        elements.push(
          <Path
            key="ma20"
            d={`M ${ma20Points}`}
            stroke="#3B82F6"
            strokeWidth="1.5"
            fill="none"
          />
        );
      }
    }

    if (activeIndicators.ma60 && indicators?.ma60) {
      const ma60Points = visibleCandles
        .map((_, i) => {
          const idx = startIndex + i;
          if (indicators.ma60[idx]) {
            return `${toX(idx)},${toY(indicators.ma60[idx])}`;
          }
          return null;
        })
        .filter(Boolean)
        .join(" L ");

      if (ma60Points) {
        elements.push(
          <Path
            key="ma60"
            d={`M ${ma60Points}`}
            stroke="#EC4899"
            strokeWidth="1.5"
            fill="none"
          />
        );
      }
    }

    // 6. 볼린저 밴드 (BB)
    if (activeIndicators.bb && indicators?.bollingerBands) {
      const bbUpper = visibleCandles
        .map((_, i) => {
          const idx = startIndex + i;
          if (indicators.bollingerBands?.upper[idx]) {
            return `${toX(idx)},${toY(indicators.bollingerBands.upper[idx])}`;
          }
          return null;
        })
        .filter(Boolean)
        .join(" L ");

      const bbLower = visibleCandles
        .map((_, i) => {
          const idx = startIndex + i;
          if (indicators.bollingerBands?.lower[idx]) {
            return `${toX(idx)},${toY(indicators.bollingerBands.lower[idx])}`;
          }
          return null;
        })
        .filter(Boolean)
        .join(" L ");

      if (bbUpper) {
        elements.push(
          <Path
            key="bb-upper"
            d={`M ${bbUpper}`}
            stroke="#8B5CF6"
            strokeWidth="1"
            strokeDasharray="2,2"
            fill="none"
          />
        );
      }

      if (bbLower) {
        elements.push(
          <Path
            key="bb-lower"
            d={`M ${bbLower}`}
            stroke="#8B5CF6"
            strokeWidth="1"
            strokeDasharray="2,2"
            fill="none"
          />
        );
      }
    }

    // 7. 지지/저항 레벨
    for (let i = 0; i < supportResistance.length; i++) {
      const sr = supportResistance[i];
      const y = toY(sr.price);
      const isSupport = sr.type === "support";

      elements.push(
        <Line
          key={`sr-${i}`}
          x1={PADDING.left}
          y1={y}
          x2={width - PADDING.right}
          y2={y}
          stroke={isSupport ? colors.success : colors.error}
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.5"
        />
      );

      elements.push(
        <SvgText
          key={`sr-label-${i}`}
          x={PADDING.left + 4}
          y={y - 4}
          fontSize="10"
          fill={isSupport ? colors.success : colors.error}
        >
          {isSupport ? "S" : "R"}: {sr.price.toFixed(2)}
        </SvgText>
      );
    }

    // 8. 어닝(E) 아이콘 - X축 하단에 고정
    for (const earning of earnings) {
      // 어닝 날짜에 해당하는 캔들 인덱스 찾기
      const earningCandle = candles.find(
        (c) => new Date(c.timestamp).getTime() === earning.date
      );

      if (earningCandle) {
        const candleIndex = candles.indexOf(earningCandle);

        // 화면에 보이는 범위인지 확인
        if (candleIndex >= startIndex && candleIndex < endIndex) {
          const x = toX(candleIndex);
          const isBeating = earning.surpriseType === "beat";
          const markerColor = isBeating ? colors.success : colors.error;

          // E 아이콘 (X축 바로 위)
          elements.push(
            <Circle
              key={`earnings-${candleIndex}`}
              cx={x}
              cy={height - PADDING.bottom + 12}
              r="8"
              fill={markerColor}
              opacity="0.8"
            />
          );

          elements.push(
            <SvgText
              key={`earnings-label-${candleIndex}`}
              x={x - 3}
              y={height - PADDING.bottom + 16}
              fontSize="10"
              fontWeight="bold"
              fill={colors.background}
              textAnchor="middle"
            >
              E
            </SvgText>
          );
        }
      }
    }

    // 9. X축 레이블 (날짜)
    const labelInterval = Math.max(1, Math.floor(visibleCandleCount / 5));
    for (let i = 0; i < visibleCandles.length; i += labelInterval) {
      const candle = visibleCandles[i];
      const date = new Date(candle.timestamp);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      const x = toX(startIndex + i);

      elements.push(
        <SvgText
          key={`x-label-${i}`}
          x={x}
          y={height - 8}
          fontSize="10"
          fill={colors.muted}
          textAnchor="middle"
        >
          {label}
        </SvgText>
      );
    }

    return elements;
  };

  return (
            <PinchGestureHandler onGestureEvent={pinchHandler} onHandlerStateChange={pinchHandler}>
      <Animated.View>
        <PanGestureHandler onGestureEvent={panHandler} onHandlerStateChange={panHandler}>
          <Animated.View>
            <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
              {renderChart()}
            </Svg>
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>
    </PinchGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
