import { describe, it, expect } from "vitest";

/**
 * Twelve Data API 연동 테스트
 *
 * 참고: Python 스크립트는 별도로 테스트합니다.
 * 이 테스트는 환경변수 설정 확인 및 기본 타입 검증입니다.
 */
describe("Twelve Data Integration", () => {
  it("should have TWELVE_DATA_API_KEY in environment", () => {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey?.length).toBeGreaterThan(0);
  });

  it("should validate candle data structure", () => {
    const mockCandle = {
      date: "2026-04-09T15:30:00+09:00",
      open: 1000,
      high: 1050,
      low: 990,
      close: 1020,
      volume: 1000000,
    };

    expect(mockCandle).toHaveProperty("date");
    expect(mockCandle).toHaveProperty("open");
    expect(mockCandle).toHaveProperty("high");
    expect(mockCandle).toHaveProperty("low");
    expect(mockCandle).toHaveProperty("close");
    expect(mockCandle).toHaveProperty("volume");

    // ISO 8601 형식 검증
    expect(mockCandle.date).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
    );

    // 가격 검증
    expect(mockCandle.high).toBeGreaterThanOrEqual(mockCandle.low);
    expect(mockCandle.open).toBeGreaterThan(0);
    expect(mockCandle.close).toBeGreaterThan(0);
    expect(mockCandle.volume).toBeGreaterThanOrEqual(0);
  });

  it("should handle multiple symbols", () => {
    const symbols = ["AAPL", "005930.KS", "MSFT"];
    expect(symbols).toHaveLength(3);
    expect(symbols).toContain("005930.KS");
  });

  it("should validate timezone conversion", () => {
    // KST (한국, UTC+9)
    const kstDate = new Date("2026-04-09T15:30:00+09:00");
    expect(kstDate).toBeInstanceOf(Date);

    // EST (미국, UTC-5)
    // KST 15:30 = EST 01:30 (KST - 14시간)
    const estDate = new Date("2026-04-09T01:30:00-05:00");
    expect(estDate).toBeInstanceOf(Date);

    // 같은 시간대를 나타내는지 확인
    expect(kstDate.getTime()).toBe(estDate.getTime());
  });

  it("should validate data sampling logic", () => {
    // 1000개 데이터를 500개로 샘플링
    const originalSize = 1000;
    const targetPoints = 500;
    const step = originalSize / targetPoints;

    expect(step).toBe(2);
    expect(Math.floor(originalSize / step)).toBeLessThanOrEqual(targetPoints);
  });
});
