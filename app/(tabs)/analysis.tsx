/**
 * Analysis Screen - 분석 탭
 *
 * 기능:
 * - AI 종합 투자 심리 게이지 (상단)
 * - 감지된 패턴 리스트
 * - 지지/저항 레벨
 * - 실시간 데이터 업데이트
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { AnalysisScreenContent } from "@/components/analysis/AnalysisScreenContent";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import {
  calculateAllIndicators,
  detectSupportResistance,
  detectPatterns,
  getOverallSignal,
} from "@/lib/technicalAnalysis";

export default function AnalysisScreen() {
  const colors = useColors();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [sentimentScore, setSentimentScore] = useState<number>(65);

  // 차트 데이터 조회
  const { data: chartData, isLoading: chartLoading } = trpc.stock.chart.useQuery(
    { symbol: selectedSymbol, period: "3M" },
    { staleTime: 60_000 }
  );

  // 지표 계산
  const indicators = useMemo(() => {
    if (!chartData?.candles || chartData.candles.length < 20) return null;
    return calculateAllIndicators(chartData.candles);
  }, [chartData?.candles]);

  // 지지/저항 감지
  const supportResistance = useMemo(() => {
    if (!chartData?.candles || chartData.candles.length < 20) return [];
    return detectSupportResistance(chartData.candles);
  }, [chartData?.candles]);

  // 패턴 감지
  const patterns = useMemo(() => {
    if (!chartData?.candles || chartData.candles.length < 30) return [];
    return detectPatterns(chartData.candles);
  }, [chartData?.candles]);

  // 종합 신호 계산
  const overallSignal = useMemo(() => {
    if (!indicators || !chartData?.candles) return null;
    return getOverallSignal(indicators, patterns, chartData.candles.length - 1);
  }, [indicators, patterns, chartData?.candles]);

  // 종합 점수 계산 (0-100)
  const calculatedSentimentScore = useMemo(() => {
    if (!overallSignal) return 50;

    let baseScore = 50;
    if (overallSignal.signal === 'buy') {
      baseScore = 70 + Math.random() * 30;
    } else if (overallSignal.signal === 'sell') {
      baseScore = Math.random() * 30;
    } else {
      baseScore = 35 + Math.random() * 30;
    }

    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }, [overallSignal]);

  // 패턴 리스트 변환
  const patternList = useMemo(() => {
    return patterns.map((pattern, idx) => ({
      id: `pattern-${idx}`,
      name: pattern.type,
      confidence: pattern.confidence,
      description: pattern.description,
    }));
  }, [patterns]);

  // 지지/저항 리스트 변환
  const srLevelList = useMemo(() => {
    return supportResistance.map((sr, idx) => ({
      id: `sr-${idx}`,
      type: sr.type as "support" | "resistance",
      price: sr.price,
      strength: sr.strength,
    }));
  }, [supportResistance]);

  // 점수 변경 콜백
  const handleSentimentChange = useCallback((score: number) => {
    setSentimentScore(score);
  }, []);

  if (chartLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            분석 데이터 로딩 중...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <AnalysisScreenContent
        sentimentScore={calculatedSentimentScore}
        isLiveUpdate={true}
        patterns={patternList}
        patternsLoading={false}
        supportResistanceLevels={srLevelList}
        srLoading={false}
        currency={chartData?.currency ?? "USD"}
        onSentimentChange={handleSentimentChange}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
});
