import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CandlestickChart } from "@/components/chart/CandlestickChart";
import { VolumeChart } from "@/components/chart/VolumeChart";
import { RSIChart } from "@/components/chart/RSIChart";
import { MACDChart } from "@/components/chart/MACDChart";
import { PatternCard } from "@/components/chart/PatternCard";
import { FinancialsTab } from "@/components/chart/FinancialsTab";
import { AnalysisCommentsPanel } from "@/components/chart/AnalysisCommentsPanel";
import { generateAllComments } from "@/lib/analysisComments";

import { useColors } from "@/hooks/use-colors";
import { useWatchlist } from "@/hooks/useWatchlist";
import { trpc } from "@/lib/trpc";
import {
  calculateAllIndicators,
  detectSupportResistance,
  detectPatterns,
  getOverallSignal,
} from "@/lib/technicalAnalysis";
import type { Period } from "@/shared/stockTypes";
import * as Haptics from "expo-haptics";
import { useChartZoom } from "@/hooks/useChartZoom";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 16;

const PERIODS: Period[] = ["1D", "1W", "1M", "3M", "6M", "1Y"];

type SubChart = "none" | "rsi" | "macd";

export default function ChartScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const colors = useColors();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const [period, setPeriod] = useState<Period>("3M");
  const [subChart, setSubChart] = useState<SubChart>("none");
  const [activeTab, setActiveTab] = useState<"chart" | "financials" | "analysis">("chart");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState({
    ma5: false,
    ma20: true,
    ma60: false,
    bb: false,
  });

  const { data: chartData, isLoading, error } = trpc.stock.chart.useQuery(
    { symbol: symbol ?? "", period },
    { enabled: !!symbol, staleTime: 60_000 }
  );

  const { data: quote } = trpc.stock.quote.useQuery(
    { symbol: symbol ?? "" },
    { enabled: !!symbol, staleTime: 30_000 }
  );

  const { data: financials, isLoading: financialsLoading } = trpc.stock.financials.useQuery(
    { symbol: symbol ?? "" },
    { enabled: !!symbol && activeTab === "financials", staleTime: 300_000 }
  );

  // 줌 상태 관리
  const { zoom, handleZoomChange, handlePan, handleDoubleTap, maxCandlesVisible } = useChartZoom(
    chartData?.candles?.length ?? 0,
    CHART_WIDTH
  );

  const indicators = useMemo(() => {
    if (!chartData?.candles || chartData.candles.length < 20) return null;
    return calculateAllIndicators(chartData.candles);
  }, [chartData?.candles]);

  const supportResistance = useMemo(() => {
    if (!chartData?.candles || chartData.candles.length < 20) return [];
    return detectSupportResistance(chartData.candles);
  }, [chartData?.candles]);

  const patterns = useMemo(() => {
    if (!chartData?.candles || chartData.candles.length < 30) return [];
    return detectPatterns(chartData.candles);
  }, [chartData?.candles]);

  const overallSignal = useMemo(() => {
    if (!indicators || !chartData?.candles) return null;
    return getOverallSignal(indicators, patterns, chartData.candles.length - 1);
  }, [indicators, patterns, chartData?.candles]);

  const inWatchlist = isInWatchlist(symbol ?? "");

  const toggleWatchlist = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (inWatchlist) {
      await removeFromWatchlist(symbol ?? "");
    } else {
      await addToWatchlist(symbol ?? "", quote?.name ?? symbol ?? "");
    }
  }, [inWatchlist, symbol, quote?.name, addToWatchlist, removeFromWatchlist]);

  const toggleIndicator = useCallback((key: keyof typeof activeIndicators) => {
    setActiveIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const formatPrice = (price: number, currency: string) => {
    if (currency === "KRW") return `₩${price.toLocaleString("ko-KR")}`;
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number, pct: number, currency: string) => {
    const sign = change >= 0 ? "+" : "";
    const priceStr = currency === "KRW"
      ? `${sign}₩${Math.abs(change).toLocaleString("ko-KR")}`
      : `${sign}$${Math.abs(change).toFixed(2)}`;
    return `${priceStr} (${sign}${pct.toFixed(2)}%)`;
  };

  const isPositive = (quote?.changePercent ?? 0) >= 0;
  const changeColor = isPositive ? colors.bullish : colors.bearish;

  if (!symbol) {
    return (
      <ScreenContainer>
        <Text style={{ color: colors.foreground, textAlign: "center", marginTop: 40 }}>
          종목을 선택해주세요
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹ 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.symbolText, { color: colors.foreground }]}>{symbol}</Text>
          {quote && (
            <Text style={[styles.nameText, { color: colors.muted }]} numberOfLines={1}>
              {quote.name}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={toggleWatchlist} style={styles.watchBtn}>
          <Text style={{ fontSize: 22 }}>{inWatchlist ? "★" : "☆"}</Text>
        </TouchableOpacity>
      </View>

      {/* Price Info */}
      {quote && (
        <View style={[styles.priceBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.priceText, { color: colors.foreground }]}>
            {formatPrice(quote.price, quote.currency)}
          </Text>
          <Text style={[styles.changeText, { color: changeColor }]}>
            {formatChange(quote.change, quote.changePercent, quote.currency)}
          </Text>
          {overallSignal && (
            <View
              style={[
                styles.signalBadge,
                {
                  backgroundColor:
                    overallSignal.signal === "buy"
                      ? colors.bullish
                      : overallSignal.signal === "sell"
                      ? colors.bearish
                      : colors.muted,
                },
              ]}
            >
              <Text style={styles.signalText}>
                {overallSignal.signal === "buy" ? "매수" : overallSignal.signal === "sell" ? "매도" : "중립"}
              </Text>
            </View>
          )}
        </View>
      )}

        {/* Tab Selection */}
        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab("chart")}
            style={[styles.tabButton, activeTab === "chart" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === "chart" ? colors.primary : colors.muted }]}>
              차트
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("analysis")}
            style={[styles.tabButton, activeTab === "analysis" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === "analysis" ? colors.primary : colors.muted }]}>
              분석
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("financials")}
            style={[styles.tabButton, activeTab === "financials" && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === "financials" ? colors.primary : colors.muted }]}>
              재무
            </Text>
          </TouchableOpacity>
        </View>

      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={scrollEnabled}>
        {/* Chart Tab */}
        {activeTab === "chart" && (
          <>
            {/* Period Tabs */}
            <View style={[styles.periodRow, { backgroundColor: colors.surface }]}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[
                    styles.periodBtn,
                    period === p && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      { color: period === p ? "#fff" : colors.muted },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chart Area */}
            <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={[styles.loadingText, { color: colors.muted }]}>
                    차트 데이터 로딩 중...
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    데이터를 불러올 수 없습니다
                  </Text>
                  <Text style={[styles.errorSubText, { color: colors.muted }]}>
                    {error.message}
                  </Text>
                </View>
              ) : chartData && chartData.candles.length > 0 ? (
                <>
                  <CandlestickChart
                    candles={chartData.candles}
                    supportResistance={supportResistance}
                    patterns={patterns}
                    indicators={indicators ?? undefined}
                    activeIndicators={activeIndicators}
                    width={CHART_WIDTH}
                    height={280}
                    currency={chartData.currency}
                    zoom={zoom}
                    onPan={handlePan}
                    onZoomChange={handleZoomChange}
                    maxCandlesVisible={maxCandlesVisible}
                  />
                  <VolumeChart
                    candles={chartData.candles}
                    width={CHART_WIDTH}
                    height={60}
                    zoomOffset={zoom.offsetX}
                    maxCandlesVisible={maxCandlesVisible}
                  />
                </>
              ) : (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.errorText, { color: colors.muted }]}>
                    데이터 없음
                  </Text>
                </View>
              )}
            </View>

            {/* Indicator Toggle */}
            <View style={[styles.indicatorRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              {(
                [
                  { key: "ma5" as const, label: "MA5", color: "#F59E0B" },
                  { key: "ma20" as const, label: "MA20", color: "#3B82F6" },
                  { key: "ma60" as const, label: "MA60", color: "#EC4899" },
                  { key: "bb" as const, label: "BB", color: "#8B5CF6" },
                ] as const
              ).map((ind) => (
                <TouchableOpacity
                  key={ind.key}
                  onPress={() => toggleIndicator(ind.key)}
                  style={[
                    styles.indicatorBtn,
                    activeIndicators[ind.key] && { backgroundColor: ind.color + "33", borderColor: ind.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.indicatorText,
                      { color: activeIndicators[ind.key] ? ind.color : colors.muted },
                    ]}
                  >
                    {ind.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.subChartDivider} />

              {(
                [
                  { key: "rsi" as const, label: "RSI" },
                  { key: "macd" as const, label: "MACD" },
                ] as const
              ).map((chart) => (
                <TouchableOpacity
                  key={chart.key}
                  onPress={() => setSubChart(subChart === chart.key ? "none" : chart.key)}
                  style={[
                    styles.indicatorBtn,
                    subChart === chart.key && { backgroundColor: colors.primary + "33", borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.indicatorText,
                      { color: subChart === chart.key ? colors.primary : colors.muted },
                    ]}
                  >
                    {chart.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sub Chart */}
            {subChart !== "none" && chartData && indicators && (
              <View style={[styles.subChartContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                {subChart === "rsi" && (
                  <RSIChart
                    rsiData={indicators.rsi}
                    width={CHART_WIDTH}
                    height={80}
                    totalCandles={chartData.candles.length}
                    zoomOffset={zoom.offsetX}
                    maxCandlesVisible={maxCandlesVisible}
                  />
                )}
                {subChart === "macd" && (
                  <MACDChart
                    macdData={indicators.macd}
                    width={CHART_WIDTH}
                    height={80}
                    totalCandles={chartData.candles.length}
                    zoomOffset={zoom.offsetX}
                    maxCandlesVisible={maxCandlesVisible}
                  />
                )}
              </View>
            )}

            {/* ①번 지지/저항 레벨 */}
            {supportResistance.length > 0 && (
              <View style={[styles.srContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <Text style={[styles.srTitle, { color: colors.foreground }]}>① 지지/저항 레벨</Text>
                {supportResistance.slice(0, 2).map((sr, i) => (
                  <View key={i} style={[styles.srItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.srInfo}>
                      <Text style={[styles.srLabel, { color: colors.muted }]}>
                        {sr.type === "support" ? "지지" : "저항"} - {sr.strength.toFixed(0)}% 신뢰도
                      </Text>
                      <Text style={[styles.srPrice, { color: colors.foreground }]}>{sr.price.toFixed(0)}</Text>
                    </View>
                    <View style={[styles.confidenceBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.confidenceFill,
                          {
                            width: `${sr.strength}%`,
                            backgroundColor: sr.type === "support" ? colors.success : colors.error,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ②번 강약 패턴 */}
            {patterns.length > 0 && (
              <View style={[styles.patternContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <Text style={[styles.patternTitle, { color: colors.foreground }]}>② 강약 패턴</Text>
                {patterns.slice(0, 3).map((pattern, i) => (
                  <View key={i} style={[styles.patternItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.patternInfo}>
                      <Text style={[styles.patternName, { color: colors.foreground }]}>{pattern.type}</Text>
                      <Text style={[styles.patternSignal, { color: pattern.signal === "bullish" ? colors.bullish : colors.bearish }]}>
                        {pattern.signal === "bullish" ? "▲ 상승" : "▼ 하락"}
                      </Text>
                    </View>
                    <View style={[styles.confidenceBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.confidenceFill,
                          {
                            width: `${pattern.confidence * 100}%`,
                            backgroundColor: pattern.signal === "bullish" ? colors.bullish : colors.bearish,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.confidenceText, { color: colors.muted }]}>{(pattern.confidence * 100).toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Pattern Cards */}
            {overallSignal && patterns.length > 0 && (
              <View style={[styles.patternsContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <Text style={[styles.patternsTitle, { color: colors.foreground }]}>감지된 패턴</Text>
                {patterns.slice(0, 3).map((pattern, i) => (
                  <PatternCard key={i} pattern={pattern} />
                ))}
              </View>
            )}
          </>
        )}

        {/* Analysis Tab */}
        {activeTab === "analysis" && chartData && indicators && (
          <View style={{ height: 600 }}>
            <AnalysisCommentsPanel
              comments={generateAllComments(indicators, chartData.candles, supportResistance, patterns)}
            />
          </View>
        )}

        {/* Financials Tab */}
        {activeTab === "financials" && (
          <View style={{ height: 600 }}>
            <FinancialsTab data={financials} isLoading={financialsLoading} currency={quote?.currency} />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  symbolText: {
    fontSize: 18,
    fontWeight: "700",
  },
  nameText: {
    fontSize: 11,
    marginTop: 2,
  },
  watchBtn: {
    paddingHorizontal: 8,
  },
  priceBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "700",
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  signalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: "auto",
  },
  signalText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  periodRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: "center",
  },
  periodText: {
    fontSize: 11,
    fontWeight: "600",
  },
  chartContainer: {
    marginHorizontal: 8,
    marginVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  loadingContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorSubText: {
    fontSize: 12,
    marginTop: 4,
  },
  indicatorRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
    borderTopWidth: 1,
    flexWrap: "wrap",
  },
  indicatorBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  indicatorText: {
    fontSize: 11,
    fontWeight: "600",
  },
  subChartDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#ccc",
    opacity: 0.3,
  },
  subChartContainer: {
    marginHorizontal: 8,
    marginVertical: 8,
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  patternsContainer: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  patternsTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  srContainer: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  srTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  srItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  srInfo: {
    marginBottom: 6,
  },
  srLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  srPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  confidenceBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  confidenceFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 11,
    marginTop: 4,
  },
  patternContainer: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  patternTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  patternItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  patternInfo: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 6,
  },
  patternName: {
    fontSize: 12,
    fontWeight: "600",
  },
  patternSignal: {
    fontSize: 12,
    fontWeight: "600",
  },
});
