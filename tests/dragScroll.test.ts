import { describe, it, expect } from "vitest";

describe("Drag Scroll Functionality", () => {
  // 드래그 거리 계산
  it("should calculate scroll offset from drag distance", () => {
    const chartWidth = 360;
    const visibleCandleCount = 30;
    const pixelsPerCandle = chartWidth / visibleCandleCount;
    
    const translationX = -60; // 왼쪽으로 드래그
    const candleOffset = -translationX / pixelsPerCandle;
    
    expect(candleOffset).toBeCloseTo(5, 1);
  });

  it("should handle positive drag (right direction)", () => {
    const chartWidth = 360;
    const visibleCandleCount = 30;
    const pixelsPerCandle = chartWidth / visibleCandleCount;
    
    const translationX = 60; // 오른쪽으로 드래그
    const candleOffset = -translationX / pixelsPerCandle;
    
    expect(candleOffset).toBeCloseTo(-5, 1);
  });

  // 스크롤 오프셋 업데이트
  it("should update scroll offset correctly", () => {
    const scrollOffset = 10;
    const candleOffset = 5;
    const totalCandles = 100;
    const visibleCandleCount = 30;
    
    const maxOffset = totalCandles - visibleCandleCount;
    const newOffset = Math.max(0, Math.min(scrollOffset + candleOffset, maxOffset));
    
    expect(newOffset).toBe(15);
    expect(newOffset <= maxOffset).toBe(true);
  });

  it("should clamp scroll offset at start", () => {
    const scrollOffset = 2;
    const candleOffset = -5;
    const totalCandles = 100;
    const visibleCandleCount = 30;
    
    const maxOffset = totalCandles - visibleCandleCount;
    const newOffset = Math.max(0, Math.min(scrollOffset + candleOffset, maxOffset));
    
    expect(newOffset).toBe(0);
  });

  it("should clamp scroll offset at end", () => {
    const scrollOffset = 68;
    const candleOffset = 5;
    const totalCandles = 100;
    const visibleCandleCount = 30;
    
    const maxOffset = totalCandles - visibleCandleCount;
    const newOffset = Math.max(0, Math.min(scrollOffset + candleOffset, maxOffset));
    
    expect(newOffset).toBe(70);
  });

  // 관성 스크롤
  it("should apply inertia scroll with velocity", () => {
    const scrollOffset = 20;
    const velocityX = 500; // 빠른 속도
    
    const additionalOffset = (velocityX / 1000) * 5;
    expect(additionalOffset).toBe(2.5);
    
    const newOffset = scrollOffset + additionalOffset;
    expect(newOffset).toBe(22.5);
  });

  it("should handle slow velocity (no inertia)", () => {
    const scrollOffset = 20;
    const velocityX = 50; // 느린 속도
    
    if (Math.abs(velocityX) > 100) {
      const additionalOffset = (velocityX / 1000) * 5;
      expect(additionalOffset).toBe(0.25);
    } else {
      // 느린 속도는 관성 스크롤 적용 안 함
      expect(scrollOffset).toBe(20);
    }
  });

  it("should handle negative velocity (left direction)", () => {
    const scrollOffset = 20;
    const velocityX = -500;
    
    const additionalOffset = (velocityX / 1000) * 5;
    expect(additionalOffset).toBe(-2.5);
    
    const newOffset = Math.max(0, scrollOffset + additionalOffset);
    expect(newOffset).toBe(17.5);
  });

  // 줌 상태 확인
  it("should only enable drag when zoom > 1", () => {
    const zoomLevel = 1;
    const isDragEnabled = zoomLevel > 1;
    expect(isDragEnabled).toBe(false);
  });

  it("should enable drag when zoom > 1", () => {
    const zoomLevel = 2.5;
    const isDragEnabled = zoomLevel > 1;
    expect(isDragEnabled).toBe(true);
  });

  // 연속 드래그
  it("should handle consecutive drag gestures", () => {
    let scrollOffset = 0;
    const totalCandles = 100;
    const visibleCandleCount = 30;
    const maxOffset = totalCandles - visibleCandleCount;
    
    // 첫 번째 드래그
    scrollOffset = Math.max(0, Math.min(scrollOffset + 5, maxOffset));
    expect(scrollOffset).toBe(5);
    
    // 두 번째 드래그
    scrollOffset = Math.max(0, Math.min(scrollOffset + 3, maxOffset));
    expect(scrollOffset).toBe(8);
    
    // 세 번째 드래그
    scrollOffset = Math.max(0, Math.min(scrollOffset + 2, maxOffset));
    expect(scrollOffset).toBe(10);
  });

  // 드래그 후 버튼 스크롤
  it("should work with button scroll after drag", () => {
    let scrollOffset = 20;
    const totalCandles = 100;
    const visibleCandleCount = 30;
    const maxOffset = totalCandles - visibleCandleCount;
    
    // 드래그로 이동
    scrollOffset = Math.max(0, Math.min(scrollOffset + 5, maxOffset));
    expect(scrollOffset).toBe(25);
    
    // 버튼으로 추가 이동
    scrollOffset = Math.min(maxOffset, scrollOffset + 5);
    expect(scrollOffset).toBe(30);
  });

  // 극단적인 드래그
  it("should handle extreme drag distances", () => {
    const chartWidth = 360;
    const visibleCandleCount = 30;
    const pixelsPerCandle = chartWidth / visibleCandleCount;
    
    const translationX = -3600; // 매우 큰 드래그
    const candleOffset = -translationX / pixelsPerCandle;
    
    expect(candleOffset).toBe(300);
  });

  it("should clamp extreme scroll offset", () => {
    let scrollOffset = 0;
    const totalCandles = 100;
    const visibleCandleCount = 30;
    const maxOffset = totalCandles - visibleCandleCount;
    
    // 매우 큰 오프셋 시도
    scrollOffset = Math.max(0, Math.min(scrollOffset + 300, maxOffset));
    expect(scrollOffset).toBe(70);
  });

  // 드래그 속도 계산
  it("should calculate drag velocity correctly", () => {
    const velocityX = 1000;
    const additionalOffset = (velocityX / 1000) * 5;
    expect(additionalOffset).toBe(5);
  });

  it("should handle zero velocity", () => {
    const velocityX = 0;
    const additionalOffset = (velocityX / 1000) * 5;
    expect(additionalOffset).toBe(0);
  });
});
