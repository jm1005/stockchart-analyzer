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

      <ScrollView showsVerticalScrollIndicator={false}>
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
              />
              <VolumeChart
                candles={chartData.candles}
                width={CHART_WIDTH}
                height={60}
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
          ).map((sc) => (
            <TouchableOpacity
              key={sc.key}
              onPress={() => setSubChart(subChart === sc.key ? "none" : sc.key)}
              style={[
                styles.indicatorBtn,
                subChart === sc.key && { backgroundColor: colors.primary + "33", borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.indicatorText,
                  { color: subChart === sc.key ? colors.primary : colors.muted },
                ]}
              >
                {sc.label}
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
                height={90}
                totalCandles={chartData.candles.length}
              />
            )}
            {subChart === "macd" && (
              <MACDChart
                macdData={indicators.macd}
                width={CHART_WIDTH}
                height={90}
                totalCandles={chartData.candles.length}
              />
            )}
          </View>
        )}

        {/* Support & Resistance Levels */}
        {supportResistance.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              🎯 지지/저항 레벨
            </Text>
            {supportResistance.map((sr, i) => (
              <View key={i} style={[styles.srRow, { borderBottomColor: colors.border }]}>
                <View
                  style={[
                    styles.srTypeBadge,
                    { backgroundColor: sr.type === "support" ? colors.support + "22" : colors.resistance + "22" },
                  ]}
                >
                  <Text
                    style={[
                      styles.srTypeText,
                      { color: sr.type === "support" ? colors.support : colors.resistance },
                    ]}
                  >
                    {sr.type === "support" ? "지지" : "저항"}
                  </Text>
                </View>
                <Text style={[styles.srPrice, { color: colors.foreground }]}>
                  {chartData?.currency === "KRW"
                    ? `₩${sr.price.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`
                    : `$${sr.price.toFixed(2)}`}
                </Text>
                <View style={styles.srStrength}>
                  {Array.from({ length: 5 }, (_, j) => (
                    <View
                      key={j}
                      style={[
                        styles.srStrengthDot,
                        {
                          backgroundColor:
                            j < sr.strength
                              ? sr.type === "support"
                                ? colors.support
                                : colors.resistance
                              : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.srTouches, { color: colors.muted }]}>
                  {sr.strength}회 접촉
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Detected Patterns */}
        {patterns.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              📊 감지된 패턴
            </Text>
            {patterns.map((pattern, i) => (
              <PatternCard key={i} pattern={pattern} currency={chartData?.currency ?? "KRW"} />
            ))}
          </View>
        )}

        {/* Overall Signal */}
        {overallSignal && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              📈 종합 분석
            </Text>
            <View
              style={[
                styles.signalCard,
                {
                  backgroundColor:
                    overallSignal.signal === "buy"
                      ? colors.bullish + "15"
                      : overallSignal.signal === "sell"
                      ? colors.bearish + "15"
                      : colors.muted + "15",
                  borderColor:
                    overallSignal.signal === "buy"
                      ? colors.bullish
                      : overallSignal.signal === "sell"
                      ? colors.bearish
                      : colors.muted,
                },
              ]}
            >
              <Text
                style={[
                  styles.signalTitle,
                  {
                    color:
                      overallSignal.signal === "buy"
                        ? colors.bullish
                        : overallSignal.signal === "sell"
                        ? colors.bearish
                        : colors.muted,
                  },
                ]}
              >
                {overallSignal.signal === "buy"
                  ? "🟢 매수 신호"
                  : overallSignal.signal === "sell"
                  ? "🔴 매도 신호"
                  : "⚪ 중립"}
              </Text>
              <Text style={[styles.signalScore, { color: colors.muted }]}>
                신호 강도: {Math.abs(overallSignal.score)}/5
              </Text>
              {overallSignal.reasons.map((reason, i) => (
                <Text key={i} style={[styles.signalReason, { color: colors.foreground }]}>
                  • {reason}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { paddingRight: 8, minWidth: 60 },
  backText: { fontSize: 17, fontWeight: "400" },
  headerCenter: { flex: 1, alignItems: "center" },
  symbolText: { fontSize: 17, fontWeight: "700" },
  nameText: { fontSize: 12, marginTop: 1, maxWidth: 160 },
  watchBtn: { minWidth: 40, alignItems: "flex-end" },
  priceBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  priceText: { fontSize: 22, fontWeight: "700" },
  changeText: { fontSize: 14, fontWeight: "500" },
  signalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: "auto",
  },
  signalText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  periodRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  periodText: { fontSize: 12, fontWeight: "600" },
  chartContainer: {
    marginTop: 2,
    paddingTop: 8,
    minHeight: 200,
  },
  loadingContainer: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: { fontSize: 14 },
  errorText: { fontSize: 15, fontWeight: "600" },
  errorSubText: { fontSize: 12 },
  indicatorRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    borderTopWidth: 0.5,
    marginTop: 2,
    flexWrap: "wrap",
  },
  indicatorBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  indicatorText: { fontSize: 11, fontWeight: "600" },
  subChartDivider: { width: 1, backgroundColor: "#30363D", marginHorizontal: 4 },
  subChartContainer: {
    borderTopWidth: 0.5,
    paddingTop: 4,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  srRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  srTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 40,
    alignItems: "center",
  },
  srTypeText: { fontSize: 11, fontWeight: "700" },
  srPrice: { flex: 1, fontSize: 14, fontWeight: "600" },
  srStrength: { flexDirection: "row", gap: 3 },
  srStrengthDot: { width: 6, height: 6, borderRadius: 3 },
  srTouches: { fontSize: 11 },
  signalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  signalTitle: { fontSize: 16, fontWeight: "700" },
  signalScore: { fontSize: 12, marginBottom: 4 },
  signalReason: { fontSize: 13 },
});
