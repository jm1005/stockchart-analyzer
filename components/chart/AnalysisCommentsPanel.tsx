import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { StarRating } from "@/components/ui/StarRating";
import type { AnalysisComment } from "@/lib/analysisComments";

interface AnalysisCommentsPanelProps {
  comments: AnalysisComment[];
}

export function AnalysisCommentsPanel({ comments }: AnalysisCommentsPanelProps) {
  const colors = useColors();

  if (comments.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          분석 데이터가 충분하지 않습니다
        </Text>
      </View>
    );
  }

  const getCategoryLabel = (category: AnalysisComment["category"]): string => {
    const labels: Record<AnalysisComment["category"], string> = {
      moving_average: "이동평균선",
      rsi: "RSI",
      macd: "MACD",
      bollinger_bands: "볼린저밴드",
      support_resistance: "지지/저항",
      pattern: "패턴",
      price_action: "가격액션",
    };
    return labels[category];
  };

  const getSignalColor = (signal: "bullish" | "bearish" | "neutral"): string => {
    switch (signal) {
      case "bullish":
        return colors.bullish;
      case "bearish":
        return colors.bearish;
      case "neutral":
        return colors.muted;
    }
  };

  const getSignalLabel = (signal: "bullish" | "bearish" | "neutral"): string => {
    switch (signal) {
      case "bullish":
        return "매수";
      case "bearish":
        return "매도";
      case "neutral":
        return "중립";
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false}>
      {comments.map((comment, idx) => (
        <View key={idx} style={[styles.commentCard, { borderLeftColor: getSignalColor(comment.signal) }]}>
          {/* Header */}
          <View style={styles.commentHeader}>
            <View style={styles.titleSection}>
              <Text style={[styles.category, { color: colors.muted }]}>
                {getCategoryLabel(comment.category)}
              </Text>
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
                {comment.title}
              </Text>
            </View>
            <View
              style={[
                styles.signalBadge,
                { backgroundColor: getSignalColor(comment.signal) + "20" },
              ]}
            >
              <Text style={[styles.signalText, { color: getSignalColor(comment.signal) }]}>
                {getSignalLabel(comment.signal)}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.foreground }]}>
            {comment.description}
          </Text>

          {/* Confidence */}
          <View style={styles.confidenceContainer}>
            <StarRating rating={comment.confidence} size={12} showPercentage={true} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
  commentCard: {
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  category: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  signalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  signalText: {
    fontSize: 11,
    fontWeight: "700",
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  confidenceContainer: {
    marginTop: 4,
  },
});
