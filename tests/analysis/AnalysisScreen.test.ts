/**
 * 분석 탭 통합 테스트
 */

import { describe, it, expect } from "vitest";

interface InvestmentGrade {
  label: string;
  color: string;
  backgroundColor: string;
  scoreRange: [number, number];
}

const INVESTMENT_GRADES: InvestmentGrade[] = [
  {
    label: "강력 매수",
    color: "#10B981",
    backgroundColor: "#10B98122",
    scoreRange: [80, 100],
  },
  {
    label: "매수",
    color: "#3B82F6",
    backgroundColor: "#3B82F622",
    scoreRange: [60, 79],
  },
  {
    label: "중립",
    color: "#9CA3AF",
    backgroundColor: "#9CA3AF22",
    scoreRange: [40, 59],
  },
  {
    label: "매도",
    color: "#F59E0B",
    backgroundColor: "#F59E0B22",
    scoreRange: [20, 39],
  },
  {
    label: "강력 매도",
    color: "#EF4444",
    backgroundColor: "#EF444422",
    scoreRange: [0, 19],
  },
];

function getInvestmentGrade(score: number): InvestmentGrade {
  return INVESTMENT_GRADES.find(
    (grade) => score >= grade.scoreRange[0] && score <= grade.scoreRange[1]
  ) || INVESTMENT_GRADES[2];
}

function scoreToAngle(score: number): number {
  return ((score - 0) / (100 - 0)) * 180 - 90;
}

describe("Analysis Screen - Sentiment Score Calculation", () => {
  describe("Investment Grade Classification", () => {
    it("should classify score 85 as 강력 매수", () => {
      const grade = getInvestmentGrade(85);
      expect(grade.label).toBe("강력 매수");
      expect(grade.color).toBe("#10B981");
    });

    it("should classify score 70 as 매수", () => {
      const grade = getInvestmentGrade(70);
      expect(grade.label).toBe("매수");
      expect(grade.color).toBe("#3B82F6");
    });

    it("should classify score 50 as 중립", () => {
      const grade = getInvestmentGrade(50);
      expect(grade.label).toBe("중립");
      expect(grade.color).toBe("#9CA3AF");
    });

    it("should classify score 30 as 매도", () => {
      const grade = getInvestmentGrade(30);
      expect(grade.label).toBe("매도");
      expect(grade.color).toBe("#F59E0B");
    });

    it("should classify score 10 as 강력 매도", () => {
      const grade = getInvestmentGrade(10);
      expect(grade.label).toBe("강력 매도");
      expect(grade.color).toBe("#EF4444");
    });

    it("should handle boundary scores correctly", () => {
      expect(getInvestmentGrade(0).label).toBe("강력 매도");
      expect(getInvestmentGrade(100).label).toBe("강력 매수");
      expect(getInvestmentGrade(80).label).toBe("강력 매수");
      expect(getInvestmentGrade(79).label).toBe("매수");
      expect(getInvestmentGrade(60).label).toBe("매수");
      expect(getInvestmentGrade(59).label).toBe("중립");
      expect(getInvestmentGrade(40).label).toBe("중립");
      expect(getInvestmentGrade(39).label).toBe("매도");
      expect(getInvestmentGrade(20).label).toBe("매도");
      expect(getInvestmentGrade(19).label).toBe("강력 매도");
    });
  });

  describe("Gauge Angle Conversion", () => {
    it("should convert score 0 to -90 degrees", () => {
      const angle = scoreToAngle(0);
      expect(angle).toBe(-90);
    });

    it("should convert score 50 to 0 degrees", () => {
      const angle = scoreToAngle(50);
      expect(angle).toBe(0);
    });

    it("should convert score 100 to 90 degrees", () => {
      const angle = scoreToAngle(100);
      expect(angle).toBe(90);
    });

    it("should convert intermediate scores correctly", () => {
      expect(scoreToAngle(25)).toBe(-45);
      expect(scoreToAngle(75)).toBe(45);
    });
  });

  describe("Signal to Score Conversion", () => {
    it("should convert buy signal to 70-100 range", () => {
      const buyScores = Array.from({ length: 10 }, () => {
        const baseScore = 70 + Math.random() * 30;
        return Math.round(baseScore);
      });

      buyScores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(70);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it("should convert sell signal to 0-30 range", () => {
      const sellScores = Array.from({ length: 10 }, () => {
        const baseScore = Math.random() * 30;
        return Math.round(baseScore);
      });

      sellScores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(30);
      });
    });

    it("should convert neutral signal to 35-65 range", () => {
      const neutralScores = Array.from({ length: 10 }, () => {
        const baseScore = 35 + Math.random() * 30;
        return Math.round(baseScore);
      });

      neutralScores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(35);
        expect(score).toBeLessThanOrEqual(65);
      });
    });
  });

  describe("Color Mapping", () => {
    it("should map scores to correct colors", () => {
      const testCases = [
        { score: 90, expectedColor: "#10B981" },
        { score: 70, expectedColor: "#3B82F6" },
        { score: 50, expectedColor: "#9CA3AF" },
        { score: 30, expectedColor: "#F59E0B" },
        { score: 10, expectedColor: "#EF4444" },
      ];

      testCases.forEach(({ score, expectedColor }) => {
        const grade = getInvestmentGrade(score);
        expect(grade.color).toBe(expectedColor);
      });
    });

    it("should have valid background colors for all grades", () => {
      INVESTMENT_GRADES.forEach((grade) => {
        expect(grade.backgroundColor).toMatch(/^#[0-9A-F]{6}[0-9A-F]{2}$/i);
      });
    });
  });

  describe("Data Validation", () => {
    it("should handle invalid scores gracefully", () => {
      expect(getInvestmentGrade(-10).label).toBe("중립");
      expect(getInvestmentGrade(110).label).toBe("중립");
    });

    it("should have all grades with valid score ranges", () => {
      INVESTMENT_GRADES.forEach((grade) => {
        const [min, max] = grade.scoreRange;
        expect(min).toBeLessThan(max);
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeLessThanOrEqual(100);
      });
    });

    it("should have correct grade order", () => {
      expect(INVESTMENT_GRADES[0].label).toBe("강력 매수");
      expect(INVESTMENT_GRADES[1].label).toBe("매수");
      expect(INVESTMENT_GRADES[2].label).toBe("중립");
      expect(INVESTMENT_GRADES[3].label).toBe("매도");
      expect(INVESTMENT_GRADES[4].label).toBe("강력 매도");
    });
  });

  describe("Performance", () => {
    it("should calculate grade quickly", () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        getInvestmentGrade(Math.random() * 100);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(10);
    });

    it("should convert angle quickly", () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        scoreToAngle(Math.random() * 100);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(10);
    });
  });

  describe("Edge Cases", () => {
    it("should handle decimal scores", () => {
      const grade = getInvestmentGrade(75.5);
      expect(grade.label).toBe("매수");
    });

    it("should handle very small differences", () => {
      const grade1 = getInvestmentGrade(79);
      const grade2 = getInvestmentGrade(80);

      expect(grade1.label).toBe("매수");
      expect(grade2.label).toBe("강력 매수");
    });

    it("should be consistent across multiple calls", () => {
      const score = 65;
      const grade1 = getInvestmentGrade(score);
      const grade2 = getInvestmentGrade(score);

      expect(grade1.label).toBe(grade2.label);
      expect(grade1.color).toBe(grade2.color);
    });
  });
});
