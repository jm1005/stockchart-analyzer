import React from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface FinancialData {
  pe?: number;
  pb?: number;
  dividendYield?: number;
  revenue?: number;
  operatingIncome?: number;
  netIncome?: number;
  eps?: number;
  roe?: number;
  roa?: number;
  debtToEquity?: number;
  currentRatio?: number;
  profitMargin?: number;
  operatingMargin?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

interface FinancialsTabProps {
  data?: FinancialData;
  isLoading?: boolean;
  currency?: string;
}

export function FinancialsTab({ data, isLoading, currency = "USD" }: FinancialsTabProps) {
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.muted }]}>재무지표 로딩 중...</Text>
      </View>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.errorText, { color: colors.muted }]}>재무지표 데이터를 불러올 수 없습니다</Text>
      </View>
    );
  }

  const formatNumber = (value: number | undefined, decimals: number = 2): string => {
    if (value === undefined || value === null) return "—";
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(decimals);
  };

  const formatPercent = (value: number | undefined): string => {
    if (value === undefined || value === null) return "—";
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return "—";
    if (currency === "KRW") {
      return `₩${Math.round(value).toLocaleString("ko-KR")}`;
    }
    return `$${value.toFixed(2)}`;
  };

  const metrics = [
    {
      category: "밸류에이션",
      items: [
        { label: "PER (P/E)", value: data.pe, format: (v: number | undefined) => formatNumber(v, 2) },
        { label: "PBR (P/B)", value: data.pb, format: (v: number | undefined) => formatNumber(v, 2) },
        { label: "배당수익률", value: data.dividendYield, format: formatPercent },
        { label: "52주 최고", value: data.fiftyTwoWeekHigh, format: formatCurrency },
        { label: "52주 최저", value: data.fiftyTwoWeekLow, format: formatCurrency },
      ],
    },
    {
      category: "수익성",
      items: [
        { label: "EPS", value: data.eps, format: formatCurrency },
        { label: "순이익률", value: data.profitMargin, format: formatPercent },
        { label: "영업이익률", value: data.operatingMargin, format: formatPercent },
        { label: "ROE", value: data.roe, format: formatPercent },
        { label: "ROA", value: data.roa, format: formatPercent },
      ],
    },
    {
      category: "재무상태",
      items: [
        { label: "시가총액", value: data.marketCap, format: (v: number | undefined) => formatNumber(v, 0) },
        { label: "총수익", value: data.revenue, format: (v: number | undefined) => formatNumber(v, 0) },
        { label: "순이익", value: data.netIncome, format: (v: number | undefined) => formatNumber(v, 0) },
        { label: "부채비율", value: data.debtToEquity, format: (v: number | undefined) => formatNumber(v, 2) },
        { label: "유동비율", value: data.currentRatio, format: (v: number | undefined) => formatNumber(v, 2) },
      ],
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false}>
      {metrics.map((section, sectionIdx) => (
        <View key={sectionIdx} style={styles.section}>
          <Text style={[styles.categoryTitle, { color: colors.primary }]}>{section.category}</Text>
          <View style={[styles.metricsGrid, { borderTopColor: colors.border }]}>
            {section.items.map((item, itemIdx) => (
              <View
                key={itemIdx}
                style={[
                  styles.metricItem,
                  {
                    borderRightColor: itemIdx % 2 === 0 ? colors.border : "transparent",
                    borderBottomColor: itemIdx < section.items.length - 1 ? colors.border : "transparent",
                  },
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.muted }]}>{item.label}</Text>
                <Text style={[styles.metricValue, { color: colors.foreground }]}>
                  {item.format(item.value)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.disclaimer}>
        <Text style={[styles.disclaimerText, { color: colors.muted }]}>
          * 재무지표는 Yahoo Finance에서 제공하는 최신 데이터를 기반으로 합니다.
        </Text>
        <Text style={[styles.disclaimerText, { color: colors.muted }]}>
          * 정확한 투자 판단을 위해 공식 재무제표를 참고하세요.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
  },
  metricItem: {
    width: "50%",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
  disclaimer: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  disclaimerText: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 14,
  },
});
