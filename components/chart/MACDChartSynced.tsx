import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line, Text as SvgText, G, Rect } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

interface MACDChartSyncedProps {
  macdData: {
    macd: (number | null)[];
    signal: (number | null)[];
    histogram: (number | null)[];
  };
  width: number;
  height?: number;
  totalCandles: number;
  zoomLevel: number; // 1x ~ 5x
  scrollOffset: number; // 픽셀 단위 스크롤 오프셋
}

export function MACDChartSynced({
  macdData,
  width,
  height = 100,
  totalCandles,
  zoomLevel,
  scrollOffset,
}: MACDChartSyncedProps) {
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

  // MACD 데이터 범위 계산
  let minValue = 0;
  let maxValue = 0;
  for (let i = startIndex; i < endIndex; i++) {
    const macd = macdData.macd[i];
    const signal = macdData.signal[i];
    const hist = macdData.histogram[i];
    
    if (macd != null) {
      minValue = Math.min(minValue, macd);
      maxValue = Math.max(maxValue, macd);
    }
    if (signal != null) {
      minValue = Math.min(minValue, signal);
      maxValue = Math.max(maxValue, signal);
    }
    if (hist != null) {
      minValue = Math.min(minValue, hist);
      maxValue = Math.max(maxValue, hist);
    }
  }

  const range = maxValue - minValue || 1;
  const midValue = (minValue + maxValue) / 2;

  const toX = (index: number) =>
    PADDING.left + (index - startIndex) * candleStep + candleStep / 2 + scrollOffset;

  const toY = (value: number) =>
    PADDING.top + chartHeight / 2 - ((value - midValue) / range) * (chartHeight / 2);

  // MACD 라인 경로
  const macdPathParts: string[] = [];
  let macdStarted = false;
  for (let i = startIndex; i < endIndex; i++) {
    const val = macdData.macd[i];
    if (val == null) {
      macdStarted = false;
      continue;
    }
    const x = toX(i);
    const y = toY(val);
    if (!macdStarted) {
      macdPathParts.push(`M ${x} ${y}`);
      macdStarted = true;
    } else {
      macdPathParts.push(`L ${x} ${y}`);
    }
  }

  // Signal 라인 경로
  const signalPathParts: string[] = [];
  let signalStarted = false;
  for (let i = startIndex; i < endIndex; i++) {
    const val = macdData.signal[i];
    if (val == null) {
      signalStarted = false;
      continue;
    }
    const x = toX(i);
    const y = toY(val);
    if (!signalStarted) {
      signalPathParts.push(`M ${x} ${y}`);
      signalStarted = true;
    } else {
      signalPathParts.push(`L ${x} ${y}`);
    }
  }

  const lastMACD = macdData.macd.slice().reverse().find((v) => v != null);
  const lastSignal = macdData.signal.slice().reverse().find((v) => v != null);

  return (
    <View>
      <Text style={[styles.label, { color: colors.muted }]}>
        MACD {lastMACD != null ? lastMACD.toFixed(2) : "--"} | Signal{" "}
        {lastSignal != null ? lastSignal.toFixed(2) : "--"}
      </Text>
      <Svg width={width} height={height}>
        {/* 0 라인 (중앙) */}
        <Line
          x1={PADDING.left}
          y1={toY(midValue)}
          x2={width - PADDING.right}
          y2={toY(midValue)}
          stroke={colors.muted}
          strokeWidth={0.5}
          opacity={0.5}
        />

        {/* Histogram 바 */}
        {macdData.histogram.map((hist, idx) => {
          if (idx < startIndex || idx >= endIndex) return null;
          if (hist == null) return null;

          const x = toX(idx);
          const y = toY(hist);
          const centerY = toY(midValue);
          const barHeight = Math.abs(centerY - y);
          const barColor = hist >= 0 ? colors.bullish : colors.bearish;

          return (
            <Rect
              key={`hist-${idx}`}
              x={x - 2}
              y={Math.min(y, centerY)}
              width={4}
              height={barHeight || 1}
              fill={barColor}
              opacity={0.5}
            />
          );
        })}

        {/* MACD 라인 */}
        {macdPathParts.length > 0 && (
          <Path
            d={macdPathParts.join(" ")}
            stroke="#3B82F6"
            strokeWidth={2}
            fill="none"
            opacity={0.8}
          />
        )}

        {/* Signal 라인 */}
        {signalPathParts.length > 0 && (
          <Path
            d={signalPathParts.join(" ")}
            stroke="#F59E0B"
            strokeWidth={2}
            fill="none"
            opacity={0.8}
          />
        )}
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
