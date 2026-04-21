import { describe, it, expect, beforeEach } from "vitest";
import {
  generateId,
  calculateFibonacciPrice,
  FIBONACCI_LEVELS,
  DRAWING_COLORS,
  DEFAULT_STROKE_WIDTH,
  TrendLine,
  FibonacciRetracement,
  HorizontalLine,
  VerticalLine,
  Point,
} from "../shared/drawingTools";

describe("Drawing Tools", () => {
  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it("should generate ID with timestamp and random string", () => {
      const id = generateId();
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe("calculateFibonacciPrice", () => {
    it("should calculate fibonacci retracement levels", () => {
      const highPrice = 100;
      const lowPrice = 50;

      expect(calculateFibonacciPrice(highPrice, lowPrice, 0)).toBe(100);
      expect(calculateFibonacciPrice(highPrice, lowPrice, 1)).toBe(50);
      expect(calculateFibonacciPrice(highPrice, lowPrice, 0.5)).toBe(75);
      expect(calculateFibonacciPrice(highPrice, lowPrice, 0.618)).toBeCloseTo(69.1, 1);
    });

    it("should handle inverted price range", () => {
      const highPrice = 50;
      const lowPrice = 100;

      expect(calculateFibonacciPrice(highPrice, lowPrice, 0)).toBe(50);
      expect(calculateFibonacciPrice(highPrice, lowPrice, 1)).toBe(100);
    });
  });

  describe("Drawing Objects", () => {
    let startPoint: Point;
    let endPoint: Point;

    beforeEach(() => {
      startPoint = { x: 10, y: 100, price: 100, timestamp: 1000 };
      endPoint = { x: 200, y: 300, price: 50, timestamp: 2000 };
    });

    it("should create TrendLine object", () => {
      const trendLine: TrendLine = {
        id: generateId(),
        type: "trendline",
        startPoint,
        endPoint,
        color: DRAWING_COLORS.trendline,
        strokeWidth: DEFAULT_STROKE_WIDTH,
        createdAt: Date.now(),
      };

      expect(trendLine.type).toBe("trendline");
      expect(trendLine.startPoint).toBe(startPoint);
      expect(trendLine.endPoint).toBe(endPoint);
      expect(trendLine.color).toBe(DRAWING_COLORS.trendline);
    });

    it("should create FibonacciRetracement object", () => {
      const fib: FibonacciRetracement = {
        id: generateId(),
        type: "fibonacci",
        highPoint: startPoint,
        lowPoint: endPoint,
        color: DRAWING_COLORS.fibonacci,
        strokeWidth: DEFAULT_STROKE_WIDTH,
        levels: FIBONACCI_LEVELS,
        createdAt: Date.now(),
      };

      expect(fib.type).toBe("fibonacci");
      expect(fib.levels).toEqual(FIBONACCI_LEVELS);
      expect(fib.levels.length).toBe(7);
    });

    it("should create HorizontalLine object", () => {
      const hLine: HorizontalLine = {
        id: generateId(),
        type: "horizontal",
        price: 75,
        color: DRAWING_COLORS.horizontal,
        strokeWidth: DEFAULT_STROKE_WIDTH,
        createdAt: Date.now(),
      };

      expect(hLine.type).toBe("horizontal");
      expect(hLine.price).toBe(75);
    });

    it("should create VerticalLine object", () => {
      const vLine: VerticalLine = {
        id: generateId(),
        type: "vertical",
        timestamp: 1500,
        color: DRAWING_COLORS.vertical,
        strokeWidth: DEFAULT_STROKE_WIDTH,
        createdAt: Date.now(),
      };

      expect(vLine.type).toBe("vertical");
      expect(vLine.timestamp).toBe(1500);
    });
  });

  describe("Drawing Colors", () => {
    it("should have all required colors defined", () => {
      expect(DRAWING_COLORS.trendline).toBeDefined();
      expect(DRAWING_COLORS.fibonacci).toBeDefined();
      expect(DRAWING_COLORS.horizontal).toBeDefined();
      expect(DRAWING_COLORS.vertical).toBeDefined();
    });

    it("should have valid hex color codes", () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      Object.values(DRAWING_COLORS).forEach((color) => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });

  describe("Fibonacci Levels", () => {
    it("should have standard fibonacci levels", () => {
      expect(FIBONACCI_LEVELS).toEqual([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
    });

    it("should have 7 levels", () => {
      expect(FIBONACCI_LEVELS.length).toBe(7);
    });

    it("should have levels in ascending order", () => {
      for (let i = 0; i < FIBONACCI_LEVELS.length - 1; i++) {
        expect(FIBONACCI_LEVELS[i]).toBeLessThan(FIBONACCI_LEVELS[i + 1]);
      }
    });
  });

  describe("Default Stroke Width", () => {
    it("should have valid stroke width", () => {
      expect(DEFAULT_STROKE_WIDTH).toBeGreaterThan(0);
      expect(DEFAULT_STROKE_WIDTH).toBeLessThan(10);
    });
  });
});
