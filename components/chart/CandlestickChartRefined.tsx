import React, { useState, useMemo, useCallback, memo } from "react";
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

interface CandlestickChartRefinedProps {
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

const PADDING = { top: 20, right: 60, bottom: 50, left: 40 };
const EVENT_LANE_HEIGHT = 20; // 어닝 아이콘용 얇은 공간
const MIN_VISIBLE_CANDLES = 10;
const MAX_VISIBLE_CANDLES = 200;
const BASE_VISIBLE_CANDLES = 60;

// ============ 차트 렌더링 로직 (Memoized) ============
interface ChartRenderProps {
  candles: Candle[];
  visibleCandles: Candle[];
  startIndex: number;
  endIndex: number;
  width: number;
  height: number;
  chartWidth: number;
  chartHeight: number;
  candleWidth: number;
  candleSpacing: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  toX: (index: number) => number;
  toY: (price: number) => number;
  indicators?: TechnicalIndicators;
  activeIndicators: {
    ma5: boolean;
    ma20: boolean;
    ma60: boolean;
    bb: boolean;
  };
  earnings: Array<{
    date: number;
    symbol: string;
    expectedEPS?: number;
    actualEPS?: number;
    surprise?: number;
    surpriseType: "beat" | "miss" | "neutral";
  }>;
  colors: any;
}

const ChartSvgRenderer = memo(function ChartSvgRenderer({
  candles,
  visibleCandles,
  startIndex,
  endIndex,
  width,
  height,
  chartWidth,
  chartHeight,
  candleWidth,
  candleSpacing,
  minPrice,
  maxPrice,
  priceRange,
  toX,
  toY,
  indicators,
  activeIndicators,
  earnings,
  colors,
}: ChartRenderProps) {
  const elements: React.ReactNode[] = [];

  // 1. 배경
  elements.push(
    <Rect
      key="bg"
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
    const price = maxPrice - (priceRange / gridLines) * i;
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

  // 4. 캔들 렌더링 (동적 너비)
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

    // 몸통 (Body) - 동적 너비로 겹침 방지
    elements.push(
      <Rect
        key={`candle-${i}`}
        x={x - candleWidth / 2}
        y={bodyTop}
        width={Math.max(1, candleWidth)}
        height={Math.max(1, bodyHeight)}
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
          stroke="#FFA500"
          strokeWidth="1"
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
          stroke="#4169E1"
          strokeWidth="1"
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
          stroke="#DA70D6"
          strokeWidth="1"
          fill="none"
        />
      );
    }
  }

  // 6. 볼린저 밴드
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
          stroke="#8B00FF"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          fill="none"
          opacity="0.5"
        />
      );
    }

    if (bbLower) {
      elements.push(
        <Path
          key="bb-lower"
          d={`M ${bbLower}`}
          stroke="#8B00FF"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          fill="none"
          opacity="0.5"
        />
      );
    }
  }

  return <Svg width={width} height={height}>{elements}</Svg>;
});

// ============ Event Lane 렌더러 (어닝 아이콘) ============
interface EventLaneProps {
  earnings: Array<{
    date: number;
    symbol: string;
    expectedEPS?: number;
    actualEPS?: number;
    surprise?: number;
    surpriseType: "beat" | "miss" | "neutral";
  }>;
  candles: Candle[];
  startIndex: number;
  endIndex: number;
  width: number;
  height: number;
  chartWidth: number;
  toX: (index: number) => number;
  colors: any;
}

const EventLaneRenderer = memo(function EventLaneRenderer({
  earnings,
  candles,
  startIndex,
  endIndex,
  width,
  height,
  chartWidth,
  toX,
  colors,
}: EventLaneProps) {
  const elements: React.ReactNode[] = [];

  // Event Lane 배경
  elements.push(
    <Rect
      key="event-lane-bg"
      x="0"
      y={height - EVENT_LANE_HEIGHT}
      width={width}
      height={EVENT_LANE_HEIGHT}
      fill={colors.surface}
      stroke={colors.border}
      strokeWidth="0.5"
    />
  );

  // 어닝 마커 렌더링
  earnings.forEach((earning, idx) => {
    // 어닝 날짜를 캔들 인덱스로 변환
    const earningDate = earning.date;
    const earningCandleIndex = candles.findIndex(
      (c) => c.timestamp >= earningDate
    );

    if (earningCandleIndex >= startIndex && earningCandleIndex < endIndex) {
      const x = toX(earningCandleIndex);
      const iconColor = earning.surpriseType === "beat" ? colors.success : colors.error;

      // 'E' 아이콘 (원형 배경)
      elements.push(
        <Circle
          key={`earning-bg-${idx}`}
          cx={x}
          cy={height - EVENT_LANE_HEIGHT / 2}
          r="8"
          fill={iconColor}
          opacity="0.8"
        />
      );

      // 'E' 텍스트
      elements.push(
        <SvgText
          key={`earning-text-${idx}`}
          x={x}
          y={height - EVENT_LANE_HEIGHT / 2 + 3}
          fontSize="10"
          fontWeight="bold"
          fill={colors.background}
          textAnchor="middle"
        >
          E
        </SvgText>
      );
    }
  });

  return <Svg width={width} height={height}>{elements}</Svg>;
});

// ============ Main Component ============
export function CandlestickChartRefined({
  candles,
  supportResistance = [],
  patterns = [],
  indicators,
  activeIndicators = { ma5: false, ma20: false, ma60: false, bb: false },
  width = SCREEN_WIDTH - 16,
  height = 300,
  currency = "KRW",
  earnings = [],
}: CandlestickChartRefinedProps) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 차트 영역 계산 (Event Lane 제외)
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom - EVENT_LANE_HEIGHT;

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

  // ============ 시작 인덱스 계산 ============
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

    visibleCandles.forEach((candle) => {
      min = Math.min(min, candle.low);
      max = Math.max(max, candle.high);
    });

    const padding = (max - min) * 0.1;
    const adjustedMin = Math.max(0, min - padding);
    const adjustedMax = max + padding;

    return {
      minPrice: adjustedMin,
      maxPrice: adjustedMax,
      priceRange: adjustedMax - adjustedMin,
    };
  }, [visibleCandles]);

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

  // ============ 캔들 너비 계산 (동적, 겹침 방지) ============
  const candleWidth = useMemo(() => {
    const baseWidth = (chartWidth / visibleCandleCount) * 0.7;
    return Math.max(1, Math.min(baseWidth, chartWidth / visibleCandleCount - 2));
  }, [chartWidth, visibleCandleCount]);

  const candleSpacing = useMemo(() => {
    return chartWidth / visibleCandleCount;
  }, [chartWidth, visibleCandleCount]);

  // ============ 핀치 제스처 핸들러 ============
  const pinchHandler = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      baseScale.value = scale.value;
    } else if (event.nativeEvent.state === State.ACTIVE) {
      const newScale = Math.max(1, Math.min(5, baseScale.value * event.nativeEvent.scale));
      scale.value = newScale;
    } else if (event.nativeEvent.state === State.END) {
      scale.value = withSpring(Math.round(scale.value * 2) / 2);
    }
  };

  // ============ 팬 제스처 핸들러 ============
  const panHandler = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      baseOffsetX.value = offsetX.value;
    } else if (event.nativeEvent.state === State.ACTIVE) {
      const maxOffset = chartWidth * (1 - 1 / scale.value);
      let newOffset = baseOffsetX.value + event.nativeEvent.translationX;

      newOffset = Math.max(0, Math.min(newOffset, maxOffset));
      offsetX.value = newOffset;
    } else if (event.nativeEvent.state === State.END) {
      // 관성 스크롤 (선택사항)
      offsetX.value = withSpring(offsetX.value);
    }
  };

  return (
    <View style={styles.container}>
      {/* 제스처 레이어 (차트 전체를 덮음) */}
      <PinchGestureHandler onHandlerStateChange={pinchHandler}>
        <Animated.View style={styles.gestureContainer}>
          <PanGestureHandler onHandlerStateChange={panHandler}>
            <Animated.View style={styles.gestureContainer}>
              {/* 차트 SVG */}
              <ChartSvgRenderer
                candles={candles}
                visibleCandles={visibleCandles}
                startIndex={startIndex}
                endIndex={endIndex}
                width={width}
                height={height - EVENT_LANE_HEIGHT}
                chartWidth={chartWidth}
                chartHeight={chartHeight}
                candleWidth={candleWidth}
                candleSpacing={candleSpacing}
                minPrice={minPrice}
                maxPrice={maxPrice}
                priceRange={priceRange}
                toX={toX}
                toY={toY}
                indicators={indicators}
                activeIndicators={activeIndicators}
                earnings={earnings}
                colors={colors}
              />

              {/* Event Lane (어닝 아이콘) */}
              <EventLaneRenderer
                earnings={earnings}
                candles={candles}
                startIndex={startIndex}
                endIndex={endIndex}
                width={width}
                height={height}
                chartWidth={chartWidth}
                toX={toX}
                colors={colors}
              />
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  gestureContainer: {
    flex: 1,
  },
});
