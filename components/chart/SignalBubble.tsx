import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

type Signal = "buy" | "sell" | "neutral";

interface OverallSignal {
  signal: Signal;
  score: number;
  reasons: string[];
}

interface SignalBubbleProps {
  signal: Signal;
  targetPrice?: number;
  currentPrice?: number;
  confidence?: number;
}

/**
 * 매수/매도/중립 신호 풍선 컴포넌트
 *
 * 차트 최하단에 표시되는 신호 풍선으로, 신호 종류, 목표가, 신뢰도를 표시합니다.
 */
export function SignalBubble({
  signal,
  targetPrice,
  currentPrice,
  confidence = 0,
}: SignalBubbleProps) {
  const colors = useColors();

  // 신호별 스타일 정의
  const signalConfig = useMemo(() => {
    switch (signal) {
      case "buy":
        return {
          label: "매수",
          icon: "📈",
          bgColor: colors.success,
          textColor: "#ffffff",
          description: "상승 신호",
        };
      case "sell":
        return {
          label: "매도",
          icon: "📉",
          bgColor: colors.error,
          textColor: "#ffffff",
          description: "하락 신호",
        };
      case "neutral":
      default:
        return {
          label: "중립",
          icon: "➡️",
          bgColor: colors.muted,
          textColor: "#ffffff",
          description: "중립 신호",
        };
    }
  }, [signal, colors]);

  // 목표가 방향 표시
  const priceDirection = useMemo(() => {
    if (!targetPrice || !currentPrice) return "";

    const diff = targetPrice - currentPrice;
    const percent = ((diff / currentPrice) * 100).toFixed(1);

    if (diff > 0) {
      return `+${percent}%`;
    } else if (diff < 0) {
      return `${percent}%`;
    }
    return "0%";
  }, [targetPrice, currentPrice]);

  return (
    <View style={[styles.container, { backgroundColor: signalConfig.bgColor }]}>
      {/* 아이콘 + 라벨 */}
      <View style={styles.labelSection}>
        <Text style={styles.icon}>{signalConfig.icon}</Text>
        <View style={styles.labelText}>
          <Text
            style={[
              styles.label,
              { color: signalConfig.textColor },
            ]}
          >
            {signalConfig.label}
          </Text>
          <Text
            style={[
              styles.description,
              { color: signalConfig.textColor, opacity: 0.8 },
            ]}
          >
            {signalConfig.description}
          </Text>
        </View>
      </View>

      {/* 신뢰도 + 목표가 */}
      <View style={styles.infoSection}>
        {confidence > 0 && (
          <View style={styles.confidenceBox}>
            <Text style={[styles.infoLabel, { color: signalConfig.textColor }]}>
              신뢰도
            </Text>
            <Text
              style={[
                styles.infoValue,
                { color: signalConfig.textColor },
              ]}
            >
              {Math.round(confidence)}%
            </Text>
          </View>
        )}

        {targetPrice && currentPrice && (
          <View style={styles.targetBox}>
            <Text style={[styles.infoLabel, { color: signalConfig.textColor }]}>
              목표가
            </Text>
            <Text
              style={[
                styles.infoValue,
                { color: signalConfig.textColor },
              ]}
            >
              {targetPrice.toLocaleString("ko-KR")}
            </Text>
            <Text
              style={[
                styles.priceChange,
                { color: signalConfig.textColor, opacity: 0.9 },
              ]}
            >
              {priceDirection}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  labelSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  labelText: {
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    fontWeight: "500",
  },
  infoSection: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  confidenceBox: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  targetBox: {
    alignItems: "flex-end",
    paddingHorizontal: 8,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.8,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  priceChange: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
