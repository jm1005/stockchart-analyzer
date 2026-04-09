import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface StarRatingProps {
  rating: number; // 0-1 (0% to 100%)
  size?: number;
  showPercentage?: boolean;
}

export function StarRating({ rating, size = 16, showPercentage = true }: StarRatingProps) {
  const colors = useColors();

  // 0-1 범위를 5성으로 변환
  const stars = Math.round(rating * 5);
  const percentage = Math.round(rating * 100);

  // 신뢰도별 색상
  const getColor = () => {
    if (rating >= 0.8) return colors.bullish; // 높음 - 초록색
    if (rating >= 0.6) return "#F59E0B"; // 중간 - 주황색
    return colors.bearish; // 낮음 - 빨강색
  };

  const color = getColor();

  return (
    <View style={styles.container}>
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text
            key={star}
            style={[
              styles.star,
              { fontSize: size, color: star <= stars ? color : colors.border },
            ]}
          >
            ★
          </Text>
        ))}
      </View>
      {showPercentage && (
        <Text style={[styles.percentage, { color }]}>
          {percentage}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starContainer: {
    flexDirection: "row",
    gap: 2,
  },
  star: {
    fontWeight: "bold",
  },
  percentage: {
    fontSize: 12,
    fontWeight: "700",
  },
});
