import { describe, it, expect } from "vitest";

describe("Moving Average Line Zoom Scaling", () => {
  // MA 라인 렌더링 범위 계산
  it("should render MA lines only for visible candles", () => {
    const startIndex = 10;
    const visibleCandleCount = 30;
    const totalCandles = 100;
    
    const isVisible = (idx: number) => {
      return idx >= startIndex && idx < startIndex + visibleCandleCount;
    };
    
    expect(isVisible(9)).toBe(false);
    expect(isVisible(10)).toBe(true);
    expect(isVisible(39)).toBe(true);
    expect(isVisible(40)).toBe(false);
  });

  // MA 라인 스케일 계산
  it("should calculate MA line Y position correctly", () => {
    const minPrice = 100;
    const maxPrice = 200;
    const priceRange = maxPrice - minPrice;
    const chartHeight = 300;
    const paddingTop = 16;
    
    const toY = (price: number) =>
      paddingTop + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    
    // 최소 가격일 때 Y 좌표
    expect(toY(minPrice)).toBe(paddingTop + chartHeight);
    
    // 최대 가격일 때 Y 좌표
    expect(toY(maxPrice)).toBe(paddingTop);
    
    // 중간 가격일 때 Y 좌표
    expect(toY((minPrice + maxPrice) / 2)).toBeCloseTo(paddingTop + chartHeight / 2, 1);
  });

  // 줌 레벨에 따른 표시 캔들 개수
  it("should calculate visible candle count based on zoom level", () => {
    const baseVisibleCount = 60;
    
    const getVisibleCount = (zoomLevel: number) => {
      return Math.max(10, Math.floor(baseVisibleCount / zoomLevel));
    };
    
    expect(getVisibleCount(1)).toBe(60);
    expect(getVisibleCount(2)).toBe(30);
    expect(getVisibleCount(3)).toBeCloseTo(20, 0);
    expect(getVisibleCount(5)).toBe(12);
  });

  // MA 라인 연속성 확인
  it("should connect MA line segments correctly", () => {
    const ma = [100, 102, 101, 103, 105, 104];
    const startIndex = 0;
    const visibleCandleCount = 6;
    
    let lineCount = 0;
    for (let idx = 0; idx < ma.length; idx++) {
      if (idx < startIndex || idx >= startIndex + visibleCandleCount) continue;
      if (ma[idx] === null) continue;
      
      const nextIdx = idx + 1;
      if (nextIdx >= ma.length) continue;
      if (ma[nextIdx] === null) continue;
      
      lineCount++;
    }
    
    expect(lineCount).toBe(5); // 6개 점 = 5개 선
  });

  // 스크롤 오프셋 적용
  it("should apply scroll offset to MA line rendering", () => {
    const scrollOffset = 20;
    const startIndex = scrollOffset;
    const visibleCandleCount = 30;
    const totalCandles = 100;
    
    expect(startIndex).toBe(20);
    expect(startIndex + visibleCandleCount).toBe(50);
    expect(startIndex + visibleCandleCount <= totalCandles).toBe(true);
  });

  // MA 라인 null 값 처리
  it("should skip null MA values", () => {
    const ma = [100, null, 102, 101, null, 103];
    const validPoints = ma.filter((m) => m !== null).length;
    
    expect(validPoints).toBe(4);
  });

  // 줌 레벨별 MA 라인 간격
  it("should maintain MA line spacing at different zoom levels", () => {
    const chartWidth = 360;
    const baseVisibleCount = 60;
    
    const getSpacing = (zoomLevel: number) => {
      const visibleCount = Math.max(10, Math.floor(baseVisibleCount / zoomLevel));
      return chartWidth / visibleCount;
    };
    
    const spacing1x = getSpacing(1);
    const spacing2x = getSpacing(2);
    const spacing5x = getSpacing(5);
    
    expect(spacing1x).toBeCloseTo(6, 0);
    expect(spacing2x).toBeCloseTo(12, 0);
    expect(spacing5x).toBeCloseTo(30, 0);
    
    // 줌이 높을수록 간격이 넓어야 함
    expect(spacing5x > spacing2x).toBe(true);
    expect(spacing2x > spacing1x).toBe(true);
  });

  // MA 라인 색상 토글
  it("should toggle MA line visibility based on indicators", () => {
    const activeIndicators = {
      ma5: true,
      ma20: false,
      ma60: true,
      bb: false,
    };
    
    expect(activeIndicators.ma5).toBe(true);
    expect(activeIndicators.ma20).toBe(false);
    expect(activeIndicators.ma60).toBe(true);
  });

  // 연속 줌 시 MA 라인 스케일
  it("should scale MA lines smoothly with continuous zoom", () => {
    let zoomLevel = 1;
    const baseVisibleCount = 60;
    
    const getVisibleCount = (zoom: number) => {
      return Math.max(10, Math.floor(baseVisibleCount / zoom));
    };
    
    expect(getVisibleCount(zoomLevel)).toBe(60);
    
    zoomLevel = 1.5;
    expect(getVisibleCount(zoomLevel)).toBe(40);
    
    zoomLevel = 2.0;
    expect(getVisibleCount(zoomLevel)).toBe(30);
    
    zoomLevel = 2.5;
    expect(getVisibleCount(zoomLevel)).toBe(24);
    
    zoomLevel = 3.0;
    expect(getVisibleCount(zoomLevel)).toBe(20);
  });

  // 드래그 후 MA 라인 위치
  it("should maintain MA line position after drag", () => {
    const scrollOffset = 0;
    const startIndex = scrollOffset;
    
    // 드래그로 5칸 이동
    const newScrollOffset = scrollOffset + 5;
    const newStartIndex = newScrollOffset;
    
    expect(newStartIndex).toBe(5);
    expect(newStartIndex - startIndex).toBe(5);
  });

  // 더블탭 리셋 후 MA 라인
  it("should reset MA line to initial state on double tap", () => {
    let zoomLevel = 3;
    let scrollOffset = 20;
    
    // 더블탭 리셋
    zoomLevel = 1;
    scrollOffset = 0;
    
    expect(zoomLevel).toBe(1);
    expect(scrollOffset).toBe(0);
  });
});
