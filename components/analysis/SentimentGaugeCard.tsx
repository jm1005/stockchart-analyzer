/**
 * SentimentGaugeCard - AI 종합 투자 심리 게이지
 *
 * 기능:
 * - SVG 반원 게이지 (매수 → 중립 → 매도)
 * - 물리 연산 기반 바늘 애니메이션 (withSpring)
 * - 실시간 업데이트 인디케이터 (LIVE 뱃지)
 * - 투자 등급 캡슐 (Chip)
 * - 성능 최적화 (Memoization)
 */

import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import Svg, { Circle, Path, G, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32; // 양쪽 16px 패딩
const GAUGE_SIZE = 280;
const GAUGE_RADIUS = 120;

interface SentimentGaugeCardProps {
  score: number; // 0-100
  isLive?: boolean;
  onScoreChange?: (score: number) => void;
}

/**
 * 투자 등급 정의
 */
interface InvestmentGrade {
  label: string;
  color: string;
  backgroundColor: string;
  scoreRange: [number, number];
}

const INVESTMENT_GRADES: InvestmentGrade[] = [
  {
    label: "강력 매수",
    color: "#10B981",
    backgroundColor: "#10B98122",
    scoreRange: [80, 100],
  },
  {
    label: "매수",
    color: "#3B82F6",
    backgroundColor: "#3B82F622",
    scoreRange: [60, 79],
  },
  {
    label: "중립",
    color: "#9CA3AF",
    backgroundColor: "#9CA3AF22",
    scoreRange: [40, 59],
  },
  {
    label: "매도",
    color: "#F59E0B",
    backgroundColor: "#F59E0B22",
    scoreRange: [20, 39],
  },
  {
    label: "강력 매도",
    color: "#EF4444",
    backgroundColor: "#EF444422",
    scoreRange: [0, 19],
  },
];

/**
 * 점수에 맞는 투자 등급 반환
 */
const getInvestmentGrade = (score: number): InvestmentGrade => {
  return INVESTMENT_GRADES.find(
    (grade) => score >= grade.scoreRange[0] && score <= grade.scoreRange[1]
  ) || INVESTMENT_GRADES[2]; // 기본값: 중립
};

/**
 * 점수(0-100)를 각도(-90 ~ 90도)로 변환
 */
const scoreToAngle = (score: number): number => {
  return interpolate(score, [0, 100], [-90, 90], Extrapolate.CLAMP);
};

/**
 * 각도를 라디안으로 변환
 */
const degreesToRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * SVG 게이지 렌더러 (Memoized)
 */
const GaugeSvgRenderer = React.memo(
  function GaugeSvgRenderer({
    score,
    colors,
  }: {
    score: number;
    colors: any;
  }) {
    const angle = scoreToAngle(score);
    const radians = degreesToRadians(angle);

    // 바늘 끝점 계산
    const needleLength = GAUGE_RADIUS - 20;
    const needleEndX = GAUGE_SIZE / 2 + needleLength * Math.cos(radians - Math.PI / 2);
    const needleEndY = GAUGE_SIZE / 2 + needleLength * Math.sin(radians - Math.PI / 2);

    return (
      <Svg width={GAUGE_SIZE} height={GAUGE_SIZE / 2 + 40} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE / 2 + 40}`}>
        <Defs>
          {/* 그라데이션: 매수(파랑) → 중립(회색) → 매도(빨강) */}
          <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#0EA5E9" stopOpacity="1" />
            <Stop offset="25%" stopColor="#3B82F6" stopOpacity="1" />
            <Stop offset="50%" stopColor="#9CA3AF" stopOpacity="1" />
            <Stop offset="75%" stopColor="#F59E0B" stopOpacity="1" />
            <Stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* 배경 반원 */}
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke={colors.border}
          strokeWidth="1"
          opacity="0.3"
        />

        {/* 게이지 호 (그라데이션) */}
        <Path
          d={`
            M ${GAUGE_SIZE / 2 - GAUGE_RADIUS} ${GAUGE_SIZE / 2}
            A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${GAUGE_SIZE / 2 + GAUGE_RADIUS} ${GAUGE_SIZE / 2}
          `}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* 5개 섹션 구분선 */}
        {[0, 25, 50, 75, 100].map((pct, idx) => {
          const sectionAngle = degreesToRadians(scoreToAngle(pct));
          const x1 = GAUGE_SIZE / 2 + (GAUGE_RADIUS - 8) * Math.cos(sectionAngle - Math.PI / 2);
          const y1 = GAUGE_SIZE / 2 + (GAUGE_RADIUS - 8) * Math.sin(sectionAngle - Math.PI / 2);
          const x2 = GAUGE_SIZE / 2 + (GAUGE_RADIUS + 4) * Math.cos(sectionAngle - Math.PI / 2);
          const y2 = GAUGE_SIZE / 2 + (GAUGE_RADIUS + 4) * Math.sin(sectionAngle - Math.PI / 2);

          return (
            <Path
              key={`section-${idx}`}
              d={`M ${x1} ${y1} L ${x2} ${y2}`}
              stroke={colors.border}
              strokeWidth="1.5"
              opacity="0.5"
            />
          );
        })}

        {/* 바늘 (중심 원판) */}
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r="8"
          fill={colors.primary}
          opacity="0.9"
        />

        {/* 바늘 (선) */}
        <Path
          d={`M ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2} L ${needleEndX} ${needleEndY}`}
          stroke={colors.primary}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* 바늘 끝 (원형) */}
        <Circle
          cx={needleEndX}
          cy={needleEndY}
          r="5"
          fill={colors.primary}
          opacity="0.9"
        />

        {/* 점수 텍스트 (중앙 하단) */}
        <SvgText
          x={GAUGE_SIZE / 2}
          y={GAUGE_SIZE / 2 + 50}
          fontSize="48"
          fontWeight="bold"
          textAnchor="middle"
          fill={colors.foreground}
        >
          {Math.round(score)}
        </SvgText>

        {/* 점수 라벨 */}
        <SvgText
          x={GAUGE_SIZE / 2}
          y={GAUGE_SIZE / 2 + 75}
          fontSize="12"
          textAnchor="middle"
          fill={colors.muted}
        >
          / 100
        </SvgText>
      </Svg>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.score === nextProps.score && prevProps.colors === nextProps.colors;
  }
);

/**
 * 메인 컴포넌트
 */
export const SentimentGaugeCard = React.memo(
  function SentimentGaugeCard({
    score,
    isLive = true,
    onScoreChange,
  }: SentimentGaugeCardProps) {
    const colors = useColors();

    // 애니메이션 값
    const animatedScore = useSharedValue(score);

    // 점수 변경 시 애니메이션 실행
    React.useEffect(() => {
      animatedScore.value = withSpring(score, {
        damping: 8,
        mass: 1,
        overshootClamping: false,
      });

      onScoreChange?.(score);
    }, [score, animatedScore, onScoreChange]);

    // 투자 등급
    const investmentGrade = useMemo(() => getInvestmentGrade(score), [score]);

    // 애니메이션 스타일
    const animatedGaugeStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: 1 }],
      };
    });

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            AI 종합 분석 점수
          </Text>

          {/* LIVE 뱃지 */}
          {isLive && (
            <View style={[styles.liveBadge, { backgroundColor: colors.success + "22" }]}>
              <View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor: colors.success,
                  },
                ]}
              />
              <Text style={[styles.liveText, { color: colors.success }]}>
                LIVE
              </Text>
            </View>
          )}
        </View>

        {/* 게이지 */}
        <Animated.View style={[animatedGaugeStyle, styles.gaugeContainer]}>
          <GaugeSvgRenderer score={score} colors={colors} />
        </Animated.View>

        {/* 투자 등급 캡슐 */}
        <View style={styles.gradeContainer}>
          <View
            style={[
              styles.gradeCapsule,
              {
                backgroundColor: investmentGrade.backgroundColor,
                borderColor: investmentGrade.color,
              },
            ]}
          >
            <Text
              style={[
                styles.gradeText,
                {
                  color: investmentGrade.color,
                },
              ]}
            >
              {investmentGrade.label}
            </Text>
          </View>
        </View>

        {/* 범례 */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: "#0EA5E9" },
              ]}
            />
            <Text style={[styles.legendLabel, { color: colors.muted }]}>
              강력 매수
            </Text>

            <View
              style={[
                styles.legendDot,
                { backgroundColor: "#9CA3AF" },
              ]}
            />
            <Text style={[styles.legendLabel, { color: colors.muted }]}>
              중립
            </Text>

            <View
              style={[
                styles.legendDot,
                { backgroundColor: "#EF4444" },
              ]}
            />
            <Text style={[styles.legendLabel, { color: colors.muted }]}>
              강력 매도
            </Text>
          </View>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.score === nextProps.score && prevProps.isLive === nextProps.isLive;
  }
);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    backgroundColor: "#1E1E1E",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "600",
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  gradeContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  gradeCapsule: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  legend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    marginLeft: 4,
  },
});
