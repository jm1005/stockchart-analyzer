import React, { useMemo } from "react";
import Svg, { Line, Text as SvgText, G } from "react-native-svg";
import {
  DrawingObject,
  TrendLine,
  FibonacciRetracement,
  HorizontalLine,
  VerticalLine,
  calculateFibonacciPrice,
  FIBONACCI_LEVELS,
} from "@/shared/drawingTools";

interface DrawingToolsRendererProps {
  drawnObjects: DrawingObject[];
  width: number;
  height: number;
  chartWidth: number;
  chartHeight: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  toX: (index: number) => number;
  toY: (price: number) => number;
  startIndex: number;
  candles: any[];
  selectedObjectId: string | null;
  colors: any;
}

export function DrawingToolsRenderer({
  drawnObjects,
  width,
  height,
  chartWidth,
  chartHeight,
  minPrice,
  maxPrice,
  priceRange,
  toX,
  toY,
  startIndex,
  candles,
  selectedObjectId,
  colors,
}: DrawingToolsRendererProps) {
  const elements: React.ReactNode[] = [];

  drawnObjects.forEach((obj) => {
    const isSelected = obj.id === selectedObjectId;
    const strokeWidth = isSelected ? obj.strokeWidth + 1 : obj.strokeWidth;
    const opacity = isSelected ? 1 : 0.8;

    switch (obj.type) {
      case "trendline": {
        const trendLine = obj as TrendLine;
        const x1 = trendLine.startPoint.x;
        const y1 = toY(trendLine.startPoint.price || 0);
        const x2 = trendLine.endPoint.x;
        const y2 = toY(trendLine.endPoint.price || 0);

        elements.push(
          <Line
            key={`trendline-${obj.id}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={trendLine.color}
            strokeWidth={strokeWidth}
            opacity={opacity}
            strokeDasharray={isSelected ? "5,5" : undefined}
          />
        );

        // 끝점 마커
        elements.push(
          <G key={`trendline-markers-${obj.id}`}>
            <circle cx={x1} cy={y1} r="4" fill={trendLine.color} opacity={opacity} />
            <circle cx={x2} cy={y2} r="4" fill={trendLine.color} opacity={opacity} />
          </G>
        );
        break;
      }

      case "fibonacci": {
        const fib = obj as FibonacciRetracement;
        const highY = toY(fib.highPoint.price || 0);
        const lowY = toY(fib.lowPoint.price || 0);
        const x1 = fib.highPoint.x;
        const x2 = fib.lowPoint.x;

        // 피보나치 레벨 선 그리기
        fib.levels.forEach((level, idx) => {
          const price = calculateFibonacciPrice(
            fib.highPoint.price || 0,
            fib.lowPoint.price || 0,
            level
          );
          const y = toY(price);

          elements.push(
            <Line
              key={`fib-level-${obj.id}-${idx}`}
              x1={Math.min(x1, x2)}
              y1={y}
              x2={Math.max(x1, x2)}
              y2={y}
              stroke={fib.color}
              strokeWidth={strokeWidth}
              opacity={opacity * 0.6}
              strokeDasharray="3,3"
            />
          );

          // 레벨 레이블
          const labelText = level === 0 ? "0%" : level === 1 ? "100%" : `${(level * 100).toFixed(1)}%`;
          elements.push(
            <SvgText
              key={`fib-label-${obj.id}-${idx}`}
              x={Math.max(x1, x2) + 5}
              y={y + 4}
              fontSize="9"
              fill={fib.color}
              opacity={opacity}
            >
              {labelText}
            </SvgText>
          );
        });

        // 시작/끝점 마커
        elements.push(
          <G key={`fib-markers-${obj.id}`}>
            <circle cx={x1} cy={highY} r="4" fill={fib.color} opacity={opacity} />
            <circle cx={x2} cy={lowY} r="4" fill={fib.color} opacity={opacity} />
          </G>
        );
        break;
      }

      case "horizontal": {
        const hLine = obj as HorizontalLine;
        const y = toY(hLine.price);

        elements.push(
          <Line
            key={`hline-${obj.id}`}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke={hLine.color}
            strokeWidth={strokeWidth}
            opacity={opacity}
            strokeDasharray={isSelected ? "5,5" : "2,2"}
          />
        );

        // 가격 레이블
        elements.push(
          <SvgText
            key={`hline-label-${obj.id}`}
            x={width - 55}
            y={y - 3}
            fontSize="10"
            fill={hLine.color}
            opacity={opacity}
            fontWeight="bold"
          >
            {hLine.price.toFixed(2)}
          </SvgText>
        );
        break;
      }

      case "vertical": {
        const vLine = obj as VerticalLine;
        // 타임스탬프를 기반으로 X 좌표 계산
        const candleIndex = candles.findIndex(
          (c) => c.timestamp >= vLine.timestamp
        );
        if (candleIndex >= 0) {
          const x = toX(candleIndex);

          elements.push(
            <Line
              key={`vline-${obj.id}`}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              stroke={vLine.color}
              strokeWidth={strokeWidth}
              opacity={opacity}
              strokeDasharray={isSelected ? "5,5" : "2,2"}
            />
          );
        }
        break;
      }
    }
  });

  return <Svg width={width} height={height}>{elements}</Svg>;
}
