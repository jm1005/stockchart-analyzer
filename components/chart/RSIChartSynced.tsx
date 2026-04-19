import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line, Text as SvgText, G, Rect } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

interface RSIChartSyncedProps {
  rsiData: (number | null)[];
  width: number;
  height?: number;
  totalCandles: number;
  zoomLevel: number; // 1x ~ 5x
  scrollOffset: number; // 픽셀 단위 스크롤 오프셋
}

export function RSIChartSynced({
  rsiData,
  width,
  height = 80,
  totalCandles,
  zoomLevel,
  scrollOffset,
}: RSIChartSyncedProps) {
  const colors = useColors();

  const PADDING = { top: 8, right: 60, bottom: 8, left: 8 };
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // 줌 레벨에 따른 표시 캔들 개수 계산
  const baseVisibleCount = 60;
  const visibleCount = Math.max(10, Math.floor(baseVisibleCount / zoomLevel));
  
  // 스크롤 오프셋을 캔들 인덱스로 변환
  const candleStep = chartWidth / visibleCount;
  const startIndex = Math.max(0, Math.floor(-scrollOffset / candleStep));
  const endIndex = Math.min(totalCandles, startIndex + visibleCount);

  const toX = (index: number) =>
    PADDING.left + (index - startIndex) * candleStep + candleStep / 2 + scrollOffset;

  const toY = (value: number) =>
    PADDING.top + chartHeight - ((value - 0) / 100) * chartHeight;

  // RSI 라인 경로 생성
  const pathParts: string[] = [];
  let started = false;
  for (let i = startIndex; i < endIndex; i++) {
    const val = rsiData[i];
    if (val == null) {
      started = false;
      continue;
    }
    const x = toX(i);
    const y = toY(val);
    if (!started) {
      pathParts.push(`M ${x} ${y}`);
      started = true;
    } else {
      pathParts.push(`L ${x} ${y}`);
    }
  }

  const lastRSI = rsiData.slice().reverse().find((v) => v != null);

  return (
    <View>
      <Text style={[styles.label, { color: colors.muted }]}>
        RSI(14) {lastRSI != null ? lastRSI.toFixed(1) : "--"}
      </Text>
      <Svg width={width} height={height}>
        {/* Overbought/Oversold zones */}
        <Rect
          x={PADDING.left}
          y={toY(70)}
          width={chartWidth}
          height={toY(30) - toY(70)}
          fill={colors.muted}
          opacity={0.05}
        />

        {/* 70 line */}
        <Line
          x1={PADDING.left}
          y1={toY(70)}
          x2={width - PADDING.right}
          y2={toY(70)}
          stroke={colors.muted}
          strokeWidth={0.5}
          opacity={0.5}
        />

        {/* 50 line */}
        <Line
          x1={PADDING.left}
          y1={toY(50)}
          x2={width - PADDING.right}
          y2={toY(50)}
          stroke={colors.muted}
          strokeWidth={0.5}
          opacity={0.3}
        />

        {/* 30 line */}
        <Line
          x1={PADDING.left}
          y1={toY(30)}
          x2={width - PADDING.right}
          y2={toY(30)}
          stroke={colors.muted}
          strokeWidth={0.5}
          opacity={0.5}
        />

        {/* RSI line */}
        {pathParts.length > 0 && (
          <Path
            d={pathParts.join(" ")}
            stroke={colors.primary}
            strokeWidth={2}
            fill="none"
            opacity={0.8}
          />
        )}

        {/* Y축 레이블 */}
        <SvgText
          x={width - PADDING.right + 4}
          y={toY(70) + 4}
          fontSize="10"
          fill={colors.muted}
          opacity={0.6}
        >
          70
        </SvgText>
        <SvgText
          x={width - PADDING.right + 4}
          y={toY(50) + 4}
          fontSize="10"
          fill={colors.muted}
          opacity={0.6}
        >
          50
        </SvgText>
        <SvgText
          x={width - PADDING.right + 4}
          y={toY(30) + 4}
          fontSize="10"
          fill={colors.muted}
          opacity={0.6}
        >
          30
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
});
