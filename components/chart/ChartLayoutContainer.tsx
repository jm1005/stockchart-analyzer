/**
 * ChartLayoutContainer - 메인 차트와 RSI 지표 레이아웃 분리
 *
 * 구조:
 * - 메인 캔들스틱 차트: 70% 높이
 * - RSI 보조 지표: 30% 높이
 * - 명확한 경계선 분리
 * - 절대 영역 침범 방지
 */

import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { WagmiCandlestickChart } from "./WagmiCandlestickChart";
import { useColors } from "@/hooks/use-colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface RSIData {
  timestamp: number;
  rsi: number;
}

interface ChartLayoutContainerProps {
  chartData: ChartData[];
  rsiData?: RSIData[];
  loading?: boolean;
  onPriceHover?: (price: number, timestamp: number) => void;
  onRSIHover?: (rsi: number, timestamp: number) => void;
}

/**
 * RSI 차트 렌더러
 */
const RSIChart = React.memo(
  function RSIChart({
    rsiData,
    width,
    height,
    colors,
  }: {
    rsiData: RSIData[];
    width: number;
    height: number;
    colors: any;
  }) {
    if (!rsiData || rsiData.length === 0) {
      return (
        <View style={[styles.rsiEmpty, { height, backgroundColor: colors.background }]}>
          <View style={styles.rsiEmptyContent} />
        </View>
      );
    }

    // RSI 범위 (0-100)
    const rsiMin = 0;
    const rsiMax = 100;
    const rsiRange = rsiMax - rsiMin;

    // Y축 스케일 함수
    const rsiToY = (rsi: number) => {
      return height - ((rsi - rsiMin) / rsiRange) * height;
    };

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          {/* 배경 그라데이션 */}
          <linearGradient id="rsiBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.08" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 배경 */}
        <rect width={width} height={height} fill={colors.background} />

        {/* 그리드 라인 (20, 50, 80) */}
        {[20, 50, 80].map((level) => {
          const y = rsiToY(level);
          const opacity = level === 50 ? 0.3 : 0.15;
          return (
            <line
              key={`rsi-grid-${level}`}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke={colors.border}
              strokeWidth="0.5"
              opacity={opacity}
            />
          );
        })}

        {/* 과매수/과매도 영역 */}
        <rect
          x="0"
          y="0"
          width={width}
          height={rsiToY(80)}
          fill={colors.error}
          opacity="0.05"
        />
        <rect
          x="0"
          y={rsiToY(20)}
          width={width}
          height={height - rsiToY(20)}
          fill={colors.success}
          opacity="0.05"
        />

        {/* RSI 라인 */}
        <polyline
          points={rsiData
            .map((d, idx) => `${(idx / rsiData.length) * width},${rsiToY(d.rsi)}`)
            .join(" ")}
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* RSI 영역 채우기 */}
        <polygon
          points={`0,${height} ${rsiData
            .map((d, idx) => `${(idx / rsiData.length) * width},${rsiToY(d.rsi)}`)
            .join(" ")} ${width},${height}`}
          fill={colors.primary}
          opacity="0.1"
        />

        {/* 레이블 */}
        <text x="10" y="15" fontSize="11" fill={colors.muted} opacity="0.6">
          RSI (14)
        </text>
      </svg>
    );
  }
);

/**
 * 메인 컴포넌트
 */
export const ChartLayoutContainer = React.memo(
  function ChartLayoutContainer({
    chartData,
    rsiData,
    loading = false,
    onPriceHover,
    onRSIHover,
  }: ChartLayoutContainerProps) {
    const colors = useColors();

    // 계산된 높이 (70% / 30% 분리)
    const mainChartHeight = useMemo(() => {
      const availableHeight = SCREEN_HEIGHT * 0.6; // 탭바 등 제외
      return Math.floor(availableHeight * 0.7);
    }, []);

    const rsiChartHeight = useMemo(() => {
      const availableHeight = SCREEN_HEIGHT * 0.6;
      return Math.floor(availableHeight * 0.3);
    }, []);

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* 메인 캔들스틱 차트 (70%) */}
        <View
          style={[
            styles.mainChartSection,
            {
              height: mainChartHeight,
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <WagmiCandlestickChart
            candles={chartData}
            height={mainChartHeight - 1} // 경계선 높이 제외
            showGrid={true}
            showCrosshair={true}
            onPriceHover={onPriceHover}
            loading={loading}
          />
        </View>

        {/* 구분선 */}
        <View
          style={[
            styles.divider,
            {
              backgroundColor: colors.border,
            },
          ]}
        />

        {/* RSI 보조 지표 (30%) */}
        <View
          style={[
            styles.rsiChartSection,
            {
              height: rsiChartHeight,
              backgroundColor: colors.background,
            },
          ]}
        >
          <RSIChart
            rsiData={rsiData || []}
            width={Dimensions.get("window").width - 32}
            height={rsiChartHeight}
            colors={colors}
          />
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.chartData.length === nextProps.chartData.length &&
      prevProps.rsiData?.length === nextProps.rsiData?.length &&
      prevProps.loading === nextProps.loading
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  mainChartSection: {
    borderBottomWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    width: "100%",
  },
  rsiChartSection: {
    justifyContent: "center",
    alignItems: "center",
  },
  rsiEmpty: {
    justifyContent: "center",
    alignItems: "center",
  },
  rsiEmptyContent: {
    width: "80%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});
