/**
 * AnalysisScreenContent - 분석 탭 통합 레이아웃
 *
 * 구조:
 * 1. AI 종합 투자 심리 게이지 (상단)
 * 2. 감지된 패턴 리스트
 * 3. 지지/저항 레벨
 *
 * 성능 최적화:
 * - Memoization으로 불필요한 리렌더링 방지
 * - ScrollView에서 FlatList 사용
 * - 게이지 애니메이션 중 하단 리스트 렌더링 분리
 */

import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SentimentGaugeCard } from "./SentimentGaugeCard";
import { useColors } from "@/hooks/use-colors";

interface AnalysisScreenContentProps {
  // 게이지 데이터
  sentimentScore: number; // 0-100
  isLiveUpdate?: boolean;

  // 패턴 데이터
  patterns: Array<{
    id: string;
    name: string;
    confidence: number;
    description: string;
  }>;
  patternsLoading?: boolean;

  // 지지/저항 데이터
  supportResistanceLevels: Array<{
    id: string;
    type: "support" | "resistance";
    price: number;
    strength: number; // 0-1
  }>;
  srLoading?: boolean;

  // 통화
  currency?: string;

  // 콜백
  onSentimentChange?: (score: number) => void;
}

/**
 * 패턴 카드 (Memoized)
 */
const PatternCardItem = React.memo(function PatternCardItem({
  item,
  colors,
}: {
  item: AnalysisScreenContentProps["patterns"][0];
  colors: any;
}) {
  const confidenceColor =
    item.confidence >= 0.7
      ? colors.bullish
      : item.confidence >= 0.4
      ? colors.warning
      : colors.bearish;

  return (
    <View
      style={[
        styles.patternCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.patternHeader}>
        <Text style={[styles.patternName, { color: colors.foreground }]}>
          {item.name}
        </Text>
        <View
          style={[
            styles.confidenceBadge,
            {
              backgroundColor: confidenceColor + "22",
              borderColor: confidenceColor,
            },
          ]}
        >
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {(item.confidence * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
      <Text style={[styles.patternDescription, { color: colors.muted }]}>
        {item.description}
      </Text>
    </View>
  );
});

/**
 * 지지/저항 레벨 카드 (Memoized)
 */
const SRLevelItem = React.memo(function SRLevelItem({
  item,
  colors,
  currency,
}: {
  item: AnalysisScreenContentProps["supportResistanceLevels"][0];
  colors: any;
  currency?: string;
}) {
  const isSupport = item.type === "support";
  const levelColor = isSupport ? colors.support : colors.resistance;
  const strengthPercent = Math.round(item.strength * 100);

  const priceStr =
    currency === "KRW"
      ? `₩${item.price.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`
      : `$${item.price.toFixed(2)}`;

  return (
    <View
      style={[
        styles.srLevelCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.srLevelHeader}>
        <View
          style={[
            styles.srTypeBadge,
            {
              backgroundColor: levelColor + "22",
              borderColor: levelColor,
            },
          ]}
        >
          <Text style={[styles.srTypeText, { color: levelColor }]}>
            {isSupport ? "지지" : "저항"}
          </Text>
        </View>
        <Text style={[styles.srPrice, { color: colors.foreground }]}>
          {priceStr}
        </Text>
      </View>
      <View style={styles.srStrengthBar}>
        <View
          style={[
            styles.srStrengthFill,
            {
              width: `${strengthPercent}%`,
              backgroundColor: levelColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.srStrengthLabel, { color: colors.muted }]}>
        강도: {strengthPercent}%
      </Text>
    </View>
  );
});

/**
 * 메인 컴포넌트
 */
export const AnalysisScreenContent = React.memo(
  function AnalysisScreenContent({
    sentimentScore,
    isLiveUpdate = true,
    patterns,
    patternsLoading = false,
    supportResistanceLevels,
    srLoading = false,
    currency = "USD",
    onSentimentChange,
  }: AnalysisScreenContentProps) {
    const colors = useColors();

    // 섹션별 렌더러
    const renderPatternItem = useCallback(
      ({ item }: { item: AnalysisScreenContentProps["patterns"][0] }) => (
        <PatternCardItem item={item} colors={colors} />
      ),
      [colors]
    );

    const renderSRItem = useCallback(
      ({ item }: { item: AnalysisScreenContentProps["supportResistanceLevels"][0] }) => (
        <SRLevelItem item={item} colors={colors} currency={currency} />
      ),
      [colors, currency]
    );

    const patternKeyExtractor = useCallback(
      (item: AnalysisScreenContentProps["patterns"][0]) => item.id,
      []
    );

    const srKeyExtractor = useCallback(
      (item: AnalysisScreenContentProps["supportResistanceLevels"][0]) => item.id,
      []
    );

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* AI 종합 투자 심리 게이지 */}
        <SentimentGaugeCard
          score={sentimentScore}
          isLive={isLiveUpdate}
          onScoreChange={onSentimentChange}
        />

        {/* 감지된 패턴 섹션 */}
        {patterns.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              📊 감지된 패턴
            </Text>
            {patternsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} size="small" />
              </View>
            ) : (
              <FlatList
                data={patterns}
                renderItem={renderPatternItem}
                keyExtractor={patternKeyExtractor}
                scrollEnabled={false}
                nestedScrollEnabled={false}
              />
            )}
          </View>
        )}

        {/* 지지/저항 레벨 섹션 */}
        {supportResistanceLevels.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              🎯 지지/저항 레벨
            </Text>
            {srLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} size="small" />
              </View>
            ) : (
              <FlatList
                data={supportResistanceLevels}
                renderItem={renderSRItem}
                keyExtractor={srKeyExtractor}
                scrollEnabled={false}
                nestedScrollEnabled={false}
              />
            )}
          </View>
        )}

        {/* 빈 상태 */}
        {patterns.length === 0 && supportResistanceLevels.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              분석 데이터가 없습니다
            </Text>
          </View>
        )}

        {/* 하단 여백 */}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.sentimentScore === nextProps.sentimentScore &&
      prevProps.isLiveUpdate === nextProps.isLiveUpdate &&
      prevProps.patterns.length === nextProps.patterns.length &&
      prevProps.supportResistanceLevels.length === nextProps.supportResistanceLevels.length &&
      prevProps.patternsLoading === nextProps.patternsLoading &&
      prevProps.srLoading === nextProps.srLoading &&
      prevProps.currency === nextProps.currency
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  patternCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  patternHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  patternName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  patternDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  srLevelCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  srLevelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  srTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  srTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  srPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  srStrengthBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  srStrengthFill: {
    height: "100%",
    borderRadius: 3,
  },
  srStrengthLabel: {
    fontSize: 11,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
  },
});
