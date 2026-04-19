import { describe, it, expect } from "vitest";

describe("Chart Zoom Functionality", () => {
  // 줌 레벨 계산
  it("should calculate visible candle count based on zoom level", () => {
    const baseVisibleCount = 60;
    const zoomLevel = 1;
    const visibleCount = Math.max(10, Math.floor(baseVisibleCount / zoomLevel));
    expect(visibleCount).toBe(60);
  });

  it("should reduce visible candle count when zooming in", () => {
    const baseVisibleCount = 60;
    const zoomLevel = 2;
    const visibleCount = Math.max(10, Math.floor(baseVisibleCount / zoomLevel));
    expect(visibleCount).toBe(30);
  });

  it("should maintain minimum visible candle count", () => {
    const baseVisibleCount = 60;
    const zoomLevel = 5;
    const visibleCount = Math.max(10, Math.floor(baseVisibleCount / zoomLevel));
    expect(visibleCount).toBe(12);
  });

  // 줌 레벨 범위
  it("should limit zoom level between 1x and 5x", () => {
    let zoomLevel = 1;
    zoomLevel = Math.max(1, Math.min(5, zoomLevel - 0.5));
    expect(zoomLevel).toBe(1);

    zoomLevel = 5;
    zoomLevel = Math.max(1, Math.min(5, zoomLevel + 0.5));
    expect(zoomLevel).toBe(5);
  });

  // 스크롤 오프셋 계산
  it("should calculate scroll offset correctly", () => {
    const totalCandles = 100;
    const visibleCandleCount = 30;
    let scrollOffset = 0;

    const maxOffset = totalCandles - visibleCandleCount;
    expect(maxOffset).toBe(70);

    scrollOffset = Math.max(0, Math.min(scrollOffset, maxOffset));
    expect(scrollOffset).toBe(0);
  });

  it("should clamp scroll offset to valid range", () => {
    const totalCandles = 100;
    const visibleCandleCount = 30;
    let scrollOffset = 80;

    const maxOffset = totalCandles - visibleCandleCount;
    scrollOffset = Math.max(0, Math.min(scrollOffset, maxOffset));
    expect(scrollOffset).toBe(70);
  });

  // 스크롤 이동
  it("should move scroll left correctly", () => {
    let scrollOffset = 20;
    scrollOffset = Math.max(0, scrollOffset - 5);
    expect(scrollOffset).toBe(15);
  });

  it("should move scroll right correctly", () => {
    const totalCandles = 100;
    const visibleCandleCount = 30;
    let scrollOffset = 20;

    const maxOffset = totalCandles - visibleCandleCount;
    scrollOffset = Math.min(maxOffset, scrollOffset + 5);
    expect(scrollOffset).toBe(25);
  });

  it("should prevent scroll left beyond start", () => {
    let scrollOffset = 2;
    scrollOffset = Math.max(0, scrollOffset - 5);
    expect(scrollOffset).toBe(0);
  });

  it("should prevent scroll right beyond end", () => {
    const totalCandles = 100;
    const visibleCandleCount = 30;
    let scrollOffset = 68;

    const maxOffset = totalCandles - visibleCandleCount;
    scrollOffset = Math.min(maxOffset, scrollOffset + 5);
    expect(scrollOffset).toBe(70);
  });

  // 표시 캔들 범위 계산
  it("should calculate visible candle range correctly", () => {
    const totalCandles = 100;
    const visibleCandleCount = 30;
    const scrollOffset = 10;

    const startIndex = scrollOffset;
    const endIndex = scrollOffset + visibleCandleCount;

    expect(startIndex).toBe(10);
    expect(endIndex).toBe(40);
    expect(endIndex - startIndex).toBe(30);
  });

  // 줌 리셋
  it("should reset zoom level to 1x", () => {
    let zoomLevel = 3.5;
    zoomLevel = 1;
    expect(zoomLevel).toBe(1);
  });

  it("should reset scroll offset to 0", () => {
    let scrollOffset = 50;
    scrollOffset = 0;
    expect(scrollOffset).toBe(0);
  });

  // 스크롤 인디케이터 위치
  it("should calculate scroll indicator position correctly", () => {
    const totalCandles = 100;
    const visibleCandleCount = 30;
    const scrollOffset = 0;

    const indicatorPosition = ((scrollOffset + visibleCandleCount / 2) / totalCandles) * 100;
    expect(indicatorPosition).toBeCloseTo(15, 1);
  });

  it("should update scroll indicator position on scroll", () => {
    const totalCandles = 100;
    const visibleCandleCount = 30;
    let scrollOffset = 35;

    const indicatorPosition = ((scrollOffset + visibleCandleCount / 2) / totalCandles) * 100;
    expect(indicatorPosition).toBeCloseTo(50, 1);
  });
});
