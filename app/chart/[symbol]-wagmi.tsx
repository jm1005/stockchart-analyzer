/**
 * 차트 상세 화면 (Wagmi 기반)
 *
 * 구조:
 * - 헤더: 종목명, 현재가, 변동률
 * - 차트 레이아웃: 메인(70%) + RSI(30%)
 * - 컨트롤: 기간 선택, 지표 토글
 */

import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { ChartLayoutContainer } from "@/components/chart/ChartLayoutContainer";
import { useColors } from "@/hooks/use-colors";
// import { useChartData } from "@/hooks/use-chart-data";

type Period = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

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

/**
 * RSI 계산
 */
const calculateRSI = (candles: ChartData[], period: number = 14): RSIData[] => {
  if (candles.length < period + 1) return [];

  const rsiData: RSIData[] = [];
  let gains = 0;
  let losses = 0;

  // 첫 번째 기간 계산
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // RSI 계산
  for (let i = period; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    rsiData.push({
      timestamp: candles[i].timestamp,
      rsi,
    });
  }

  return rsiData;
};

export default function ChartDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const colors = useColors();

  // 상태
  const [period, setPeriod] = useState<Period>("1M");
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredRSI, setHoveredRSI] = useState<number | null>(null);

  // 데이터 조회 (임시 목 데이터)
  const chartData: any = null;
  const isLoading = false;

  // 임시 목 데이터
  const mockCandles: ChartData[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: Date.now() - (100 - i) * 86400000,
    open: 100 + Math.random() * 20,
    high: 110 + Math.random() * 20,
    low: 90 + Math.random() * 20,
    close: 100 + Math.random() * 20,
    volume: Math.random() * 1000000,
  }));

  // 데이터 변환
  const candles = useMemo<ChartData[]>(() => {
    if (chartData && chartData.candles) {
      return chartData.candles.map((c: any) => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));
    }
    return mockCandles;
  }, [chartData, mockCandles]);

  // RSI 계산
  const rsiData = useMemo<RSIData[]>(() => {
    return calculateRSI(candles, 14);
  }, [candles]);

  // 현재 정보
  const currentInfo = useMemo(() => {
    const lastCandle = candles[candles.length - 1];
    if (!lastCandle) return null;

    const price = chartData?.currentPrice || lastCandle.close;
    const change = price - (lastCandle?.open || 0);
    const changePercent = (change / (lastCandle?.open || 1)) * 100;

    return {
      price,
      change,
      changePercent,
      currency: chartData?.currency || "USD",
    };
  }, [chartData, candles]);

  // 핸들러
  const handlePriceHover = useCallback((price: number) => {
    setHoveredPrice(price);
  }, []);

  const handleRSIHover = useCallback((rsi: number) => {
    setHoveredRSI(rsi);
  }, []);

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setPeriod(newPeriod);
  }, []);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.symbolText, { color: colors.foreground }]}>
              {symbol}
            </Text>
            {currentInfo && (
              <>
                <Text style={[styles.priceText, { color: colors.foreground }]}>
                  {currentInfo.currency === "KRW"
                    ? `₩${currentInfo.price.toLocaleString("ko-KR", {
                        maximumFractionDigits: 0,
                      })}`
                    : `$${currentInfo.price.toFixed(2)}`}
                </Text>
                <Text
                  style={[
                    styles.changeText,
                    {
                      color:
                        currentInfo.change >= 0
                          ? colors.success
                          : colors.error,
                    },
                  ]}
                >
                  {currentInfo.change >= 0 ? "+" : ""}
                  {currentInfo.change.toFixed(2)} (
                  {currentInfo.changePercent.toFixed(2)}%)
                </Text>
              </>
            )}
          </View>

          {/* 호버 정보 */}
          {hoveredPrice && (
            <View style={styles.hoverInfo}>
              <Text style={[styles.hoverText, { color: colors.muted }]}>
                {hoveredPrice.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* 기간 선택 */}
        <View style={styles.periodSelector}>
          {(["1D", "1W", "1M", "3M", "6M", "1Y"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => handlePeriodChange(p)}
              style={[
                styles.periodButton,
                {
                  backgroundColor:
                    period === p ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  {
                    color: period === p ? colors.background : colors.foreground,
                  },
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 차트 레이아웃 */}
        {isLoading ? (
          <View style={[styles.loadingContainer, { height: 400 }]}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <ChartLayoutContainer
            chartData={candles}
            rsiData={rsiData}
            loading={isLoading}
            onPriceHover={handlePriceHover}
            onRSIHover={handleRSIHover}
          />
        )}

        {/* 하단 여백 */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerLeft: {
    flex: 1,
  },
  symbolText: {
    fontSize: 18,
    fontWeight: "700",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  changeText: {
    fontSize: 14,
    marginTop: 2,
  },
  hoverInfo: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 6,
  },
  hoverText: {
    fontSize: 12,
    fontWeight: "600",
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
