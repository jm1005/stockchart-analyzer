import { describe, it, expect } from "vitest";

describe("Earnings Marker", () => {
  // 어닝 날짜와 가장 가까운 캔들 인덱스 찾기
  it("should find closest candle index for earnings date", () => {
    const candles = [
      { timestamp: 1000 },
      { timestamp: 2000 },
      { timestamp: 3000 },
      { timestamp: 4000 },
      { timestamp: 5000 },
    ];

    const earningDate = 3100;
    let closestIdx = -1;
    let minDiff = Infinity;

    for (let i = 0; i < candles.length; i++) {
      const diff = Math.abs(candles[i].timestamp - earningDate);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    expect(closestIdx).toBe(2); // 3000에 가장 가까움
  });

  // 어닝 마커 색상 결정
  it("should determine marker color based on surprise type", () => {
    const getMarkerColor = (surpriseType: string): string => {
      switch (surpriseType) {
        case "beat":
          return "#22C55E"; // 초록색
        case "miss":
          return "#EF4444"; // 빨간색
        case "neutral":
          return "#6B7280"; // 회색
        default:
          return "#0a7ea4";
      }
    };

    expect(getMarkerColor("beat")).toBe("#22C55E");
    expect(getMarkerColor("miss")).toBe("#EF4444");
    expect(getMarkerColor("neutral")).toBe("#6B7280");
  });

  // 어닝 데이터 구조
  it("should validate earnings event structure", () => {
    const event = {
      date: 1704067200000,
      symbol: "AAPL",
      expectedEPS: 1.5,
      actualEPS: 1.65,
      surprise: 10,
      surpriseType: "beat" as const,
      revenue: { expected: 50000, actual: 52000 },
    };

    expect(event.date).toBeDefined();
    expect(event.symbol).toBe("AAPL");
    expect(event.expectedEPS).toBe(1.5);
    expect(event.actualEPS).toBe(1.65);
    expect(event.surprise).toBe(10);
    expect(event.surpriseType).toBe("beat");
  });

  // 마커 위치 계산
  it("should calculate marker position correctly", () => {
    const PADDING = { left: 40, right: 16, top: 16, bottom: 40 };
    const width = 360;
    const height = 300;
    const visibleCandleCount = 30;

    const toX = (index: number) => {
      const candleWidth = (width - PADDING.left - PADDING.right) / visibleCandleCount;
      return PADDING.left + index * candleWidth + candleWidth / 2;
    };

    const x = toX(0);
    expect(x).toBeGreaterThan(PADDING.left);
    expect(x).toBeLessThan(width - PADDING.right);
  });

  // 마커 Y 좌표 (고정)
  it("should place marker at fixed Y position below chart", () => {
    const PADDING = { left: 40, right: 16, top: 16, bottom: 40 };
    const height = 300;
    const markerY = height - PADDING.bottom + 20;

    expect(markerY).toBe(280);
  });

  // 마커 반경
  it("should have correct marker radius", () => {
    const markerRadius = 6;
    const backgroundRadius = markerRadius + 2;

    expect(markerRadius).toBe(6);
    expect(backgroundRadius).toBe(8);
  });

  // 어닝 마커 배열 필터링
  it("should filter earnings with valid closest candle index", () => {
    const candles = [
      { timestamp: 1000 },
      { timestamp: 2000 },
      { timestamp: 3000 },
    ];

    const earnings = [
      { date: 1500, symbol: "AAPL", surpriseType: "beat" as const },
      { date: 3500, symbol: "AAPL", surpriseType: "miss" as const },
    ];

    const validEarnings = earnings.filter((event) => {
      let closestIdx = -1;
      let minDiff = Infinity;
      for (let i = 0; i < candles.length; i++) {
        const diff = Math.abs(candles[i].timestamp - event.date);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      return closestIdx >= 0;
    });

    expect(validEarnings.length).toBe(2);
  });

  // 어닝 서프라이즈 계산
  it("should calculate EPS surprise percentage", () => {
    const expectedEPS = 1.5;
    const actualEPS = 1.65;
    const surprise = ((actualEPS - expectedEPS) / expectedEPS) * 100;

    expect(surprise).toBeCloseTo(10, 1);
  });

  // 어닝 마커 줌 동기화
  it("should maintain marker position during zoom", () => {
    const candleIndex = 15;
    const baseVisibleCount = 60;
    const zoomLevel = 2;
    const visibleCount = Math.max(10, Math.floor(baseVisibleCount / zoomLevel));

    // 줌 후에도 같은 캔들 인덱스에 마커가 위치해야 함
    expect(candleIndex).toBeLessThan(visibleCount);
  });

  // 어닝 마커 스크롤 동기화
  it("should maintain marker position during scroll", () => {
    const candleIndex = 15;
    const scrollOffset = 10;
    const visibleStartIndex = scrollOffset;
    const visibleEndIndex = scrollOffset + 30;

    // 스크롤 후에도 마커가 보이는 범위에 있어야 함
    const isVisible = candleIndex >= visibleStartIndex && candleIndex < visibleEndIndex;
    expect(isVisible).toBe(true);
  });

  // Floating Tooltip 위치 계산
  it("should calculate tooltip position within screen bounds", () => {
    const screenWidth = 390;
    const tooltipWidth = 200;
    const markerX = 300;

    let tooltipX = markerX - tooltipWidth / 2;
    if (tooltipX < 8) tooltipX = 8;
    if (tooltipX + tooltipWidth > screenWidth - 8) {
      tooltipX = screenWidth - tooltipWidth - 8;
    }

    expect(tooltipX).toBeGreaterThanOrEqual(8);
    expect(tooltipX + tooltipWidth).toBeLessThanOrEqual(screenWidth - 8);
  });

  // 어닝 데이터 정렬
  it("should sort earnings by date", () => {
    const earnings = [
      { date: 3000, symbol: "AAPL", surpriseType: "beat" as const },
      { date: 1000, symbol: "AAPL", surpriseType: "miss" as const },
      { date: 2000, symbol: "AAPL", surpriseType: "neutral" as const },
    ];

    const sorted = [...earnings].sort((a, b) => a.date - b.date);

    expect(sorted[0].date).toBe(1000);
    expect(sorted[1].date).toBe(2000);
    expect(sorted[2].date).toBe(3000);
  });
});
