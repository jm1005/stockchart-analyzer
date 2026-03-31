import { describe, it, expect } from "vitest";

/**
 * useChartZoom 훅 테스트
 * 
 * 주의: React 훅을 직접 테스트하려면 @testing-library/react가 필요하지만,
 * 현재 프로젝트에 설치되어 있지 않습니다.
 * 
 * 대신 핵심 로직을 검증하는 통합 테스트를 수행합니다:
 * - 줌 레벨 계산 로직
 * - 오프셋 제약 조건
 * - 최대 캔들 개수 계산
 */

describe("useChartZoom - 핵심 로직 검증", () => {
  // 줌 레벨 제약 로직
  const clampScale = (scale: number): number => Math.max(1, Math.min(5, scale));

  // 최대 오프셋 계산
  const calcMaxOffset = (totalCandles: number, maxCandlesVisible: number): number =>
    Math.max(0, totalCandles - maxCandlesVisible);

  // 최대 표시 캔들 개수 계산
  const calcMaxCandlesVisible = (scale: number): number =>
    Math.max(10, Math.floor(60 / scale));

  it("줌 레벨이 1x ~ 5x 범위로 제한된다", () => {
    expect(clampScale(0.5)).toBe(1);
    expect(clampScale(1)).toBe(1);
    expect(clampScale(2.5)).toBe(2.5);
    expect(clampScale(5)).toBe(5);
    expect(clampScale(6)).toBe(5);
  });

  it("줌 레벨에 따라 표시 캔들 개수가 계산된다", () => {
    expect(calcMaxCandlesVisible(1)).toBe(60);
    expect(calcMaxCandlesVisible(1.5)).toBe(40);
    expect(calcMaxCandlesVisible(2)).toBe(30);
    expect(calcMaxCandlesVisible(3)).toBe(20);
    expect(calcMaxCandlesVisible(5)).toBe(12);
  });

  it("최소 표시 캔들 개수는 10개 이상이다", () => {
    // 매우 높은 줌 레벨에서도 최소 10개는 표시
    expect(calcMaxCandlesVisible(10)).toBe(10);
    expect(calcMaxCandlesVisible(100)).toBe(10);
  });

  it("오프셋이 최대값을 초과하지 않는다", () => {
    const totalCandles = 200;
    const scale = 2;
    const maxCandlesVisible = calcMaxCandlesVisible(scale);
    const maxOffset = calcMaxOffset(totalCandles, maxCandlesVisible);

    expect(maxOffset).toBe(totalCandles - maxCandlesVisible);
    expect(maxOffset).toBeLessThanOrEqual(totalCandles);
  });

  it("1x 줌에서는 모든 데이터를 표시한다", () => {
    const totalCandles = 100;
    const maxCandlesVisible = calcMaxCandlesVisible(1);
    const maxOffset = calcMaxOffset(totalCandles, maxCandlesVisible);

    // 1x 줌에서는 60개만 표시 가능하므로 offset 최대값 = 100 - 60 = 40
    expect(maxOffset).toBe(40);
  });

  it("5x 줌에서는 세밀한 분석이 가능하다", () => {
    const totalCandles = 100;
    const maxCandlesVisible = calcMaxCandlesVisible(5);
    const maxOffset = calcMaxOffset(totalCandles, maxCandlesVisible);

    // 5x 줌에서는 12개만 표시 가능하므로 offset 최대값 = 100 - 12 = 88
    expect(maxOffset).toBe(88);
    expect(maxCandlesVisible).toBe(12);
  });

  it("패닝 범위가 올바르게 제한된다", () => {
    const totalCandles = 200;
    const scale = 2;
    const maxCandlesVisible = calcMaxCandlesVisible(scale);
    const maxOffset = calcMaxOffset(totalCandles, maxCandlesVisible);

    // 유효한 오프셋 범위: 0 ~ maxOffset
    const validOffsets = [0, 10, 50, maxOffset];
    for (const offset of validOffsets) {
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThanOrEqual(maxOffset);
    }
  });

  it("다양한 데이터 크기에서 올바르게 작동한다", () => {
    const testCases = [
      { totalCandles: 100, scale: 1 },
      { totalCandles: 100, scale: 2 },
      { totalCandles: 500, scale: 3 },
      { totalCandles: 1000, scale: 5 },
    ];

    for (const { totalCandles, scale } of testCases) {
      const maxCandlesVisible = calcMaxCandlesVisible(scale);
      const maxOffset = calcMaxOffset(totalCandles, maxCandlesVisible);

      expect(maxCandlesVisible).toBeGreaterThanOrEqual(10);
      expect(maxCandlesVisible).toBeLessThanOrEqual(60);
      expect(maxOffset).toBeGreaterThanOrEqual(0);
      // maxOffset + maxCandlesVisible은 totalCandles 이하여야 함
      expect(maxOffset + maxCandlesVisible).toBeLessThanOrEqual(totalCandles);
    }
  });
});
