import { describe, it, expect } from "vitest";
import {
  calculateMA,
  calculateRSI,
  calculateEMA,
  calculateBollingerBands,
  detectSupportResistance,
  detectPatterns,
  getOverallSignal,
  calculateAllIndicators,
} from "../lib/technicalAnalysis";
import type { Candle } from "../shared/stockTypes";

// Helper: generate synthetic candle data
function makeTrendingCandles(n: number, startPrice = 100, trend = 1): Candle[] {
  return Array.from({ length: n }, (_, i) => {
    const base = startPrice + i * trend + Math.sin(i * 0.5) * 2;
    return {
      timestamp: Date.now() + i * 86400000,
      open: base - 0.5,
      high: base + 1,
      low: base - 1,
      close: base,
      volume: 1000000 + i * 10000,
    };
  });
}

function makeDoubleTopCandles(): Candle[] {
  // Create a pattern: rise → peak1 → dip → peak2 → fall
  const prices = [
    100, 102, 105, 108, 112, 115, 118, 120, 118, 115, 112, 108, 110, 113, 116, 119, 121, 120, 118, 115, 110, 105, 100, 95,
  ];
  return prices.map((p, i) => ({
    timestamp: Date.now() + i * 86400000,
    open: p - 0.5,
    high: p + 1,
    low: p - 1,
    close: p,
    volume: 1000000,
  }));
}

describe("calculateMA", () => {
  it("returns null for first period-1 values", () => {
    const closes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const ma5 = calculateMA(closes, 5);
    expect(ma5[0]).toBeNull();
    expect(ma5[3]).toBeNull();
    expect(ma5[4]).not.toBeNull();
  });

  it("calculates correct MA5 value", () => {
    const closes = [10, 20, 30, 40, 50];
    const ma5 = calculateMA(closes, 5);
    expect(ma5[4]).toBe(30); // (10+20+30+40+50)/5 = 30
  });

  it("handles period larger than data", () => {
    const closes = [1, 2, 3];
    const ma5 = calculateMA(closes, 5);
    expect(ma5.every((v) => v === null)).toBe(true);
  });
});

describe("calculateRSI", () => {
  it("returns null for first 14 values", () => {
    const closes = makeTrendingCandles(30).map((c) => c.close);
    const rsi = calculateRSI(closes, 14);
    expect(rsi[0]).toBeNull();
    expect(rsi[13]).toBeNull();
    expect(rsi[14]).not.toBeNull();
  });

  it("RSI is between 0 and 100", () => {
    const closes = makeTrendingCandles(50).map((c) => c.close);
    const rsi = calculateRSI(closes, 14);
    for (const v of rsi) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it("RSI > 50 for strong uptrend", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const rsi = calculateRSI(closes, 14);
    const lastRSI = rsi.filter((v) => v !== null).pop()!;
    expect(lastRSI).toBeGreaterThan(50);
  });
});

describe("calculateEMA", () => {
  it("returns null before period", () => {
    const closes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const ema = calculateEMA(closes, 5);
    expect(ema[0]).toBeNull();
    expect(ema[3]).toBeNull();
    expect(ema[4]).not.toBeNull();
  });

  it("EMA is close to SMA for initial value", () => {
    const closes = [10, 20, 30, 40, 50, 60];
    const ema = calculateEMA(closes, 5);
    // Initial EMA = SMA of first 5 = 30
    expect(ema[4]).toBeCloseTo(30, 0);
  });
});

describe("calculateBollingerBands", () => {
  it("upper > middle > lower", () => {
    const closes = makeTrendingCandles(30).map((c) => c.close);
    const bb = calculateBollingerBands(closes, 20);
    for (let i = 19; i < closes.length; i++) {
      expect(bb.upper[i]!).toBeGreaterThan(bb.middle[i]!);
      expect(bb.middle[i]!).toBeGreaterThan(bb.lower[i]!);
    }
  });
});

describe("detectSupportResistance", () => {
  it("returns empty array for insufficient data", () => {
    const candles = makeTrendingCandles(10);
    const levels = detectSupportResistance(candles);
    expect(levels).toHaveLength(0);
  });

  it("returns levels for sufficient data", () => {
    const candles = makeTrendingCandles(60, 100, 0.5);
    const levels = detectSupportResistance(candles);
    expect(Array.isArray(levels)).toBe(true);
  });

  it("each level has correct structure", () => {
    const candles = makeTrendingCandles(60, 100, 0.5);
    const levels = detectSupportResistance(candles);
    for (const level of levels) {
      expect(level).toHaveProperty("price");
      expect(level).toHaveProperty("type");
      expect(level).toHaveProperty("strength");
      expect(["support", "resistance"]).toContain(level.type);
      expect(level.strength).toBeGreaterThanOrEqual(1);
      expect(level.strength).toBeLessThanOrEqual(5);
    }
  });
});

describe("detectPatterns", () => {
  it("returns empty for insufficient data", () => {
    const candles = makeTrendingCandles(20);
    const patterns = detectPatterns(candles);
    expect(patterns).toHaveLength(0);
  });

  it("returns array for sufficient data", () => {
    const candles = makeTrendingCandles(80, 100, 0.3);
    const patterns = detectPatterns(candles);
    expect(Array.isArray(patterns)).toBe(true);
  });

  it("each pattern has required fields", () => {
    const candles = makeTrendingCandles(80, 100, 0.3);
    const patterns = detectPatterns(candles);
    for (const p of patterns) {
      expect(p).toHaveProperty("type");
      expect(p).toHaveProperty("confidence");
      expect(p).toHaveProperty("signal");
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
      expect(["bullish", "bearish", "neutral"]).toContain(p.signal);
    }
  });

  it("no duplicate pattern types", () => {
    const candles = makeTrendingCandles(80, 100, 0.3);
    const patterns = detectPatterns(candles);
    const types = patterns.map((p) => p.type);
    const uniqueTypes = new Set(types);
    expect(types.length).toBe(uniqueTypes.size);
  });
});

describe("calculateAllIndicators", () => {
  it("returns all indicator arrays with correct length", () => {
    const candles = makeTrendingCandles(60);
    const indicators = calculateAllIndicators(candles);
    expect(indicators.ma5).toHaveLength(60);
    expect(indicators.ma20).toHaveLength(60);
    expect(indicators.ma60).toHaveLength(60);
    expect(indicators.rsi).toHaveLength(60);
    expect(indicators.macd.macd).toHaveLength(60);
    expect(indicators.macd.signal).toHaveLength(60);
    expect(indicators.macd.histogram).toHaveLength(60);
    expect(indicators.bollingerBands.upper).toHaveLength(60);
    expect(indicators.bollingerBands.middle).toHaveLength(60);
    expect(indicators.bollingerBands.lower).toHaveLength(60);
  });
});

describe("getOverallSignal", () => {
  it("returns valid signal type", () => {
    const candles = makeTrendingCandles(60);
    const indicators = calculateAllIndicators(candles);
    const result = getOverallSignal(indicators, [], 59);
    expect(["buy", "sell", "neutral"]).toContain(result.signal);
    expect(Array.isArray(result.reasons)).toBe(true);
  });

  it("returns a numeric score", () => {
    const candles = makeTrendingCandles(60, 100, 3);
    const indicators = calculateAllIndicators(candles);
    const result = getOverallSignal(indicators, [], 59);
    // Score should be a number
    expect(typeof result.score).toBe("number");
    // Signal should be one of the valid types
    expect(["buy", "sell", "neutral"]).toContain(result.signal);
  });
});
