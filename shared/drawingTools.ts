/**
 * 차트 그리기 도구 타입 및 상태 관리
 */

export type DrawingToolType = "trendline" | "fibonacci" | "horizontal" | "vertical" | "none";

export interface Point {
  x: number;
  y: number;
  price?: number;
  timestamp?: number;
}

export interface TrendLine {
  id: string;
  type: "trendline";
  startPoint: Point;
  endPoint: Point;
  color: string;
  strokeWidth: number;
  createdAt: number;
}

export interface FibonacciRetracement {
  id: string;
  type: "fibonacci";
  highPoint: Point;
  lowPoint: Point;
  color: string;
  strokeWidth: number;
  levels: number[]; // [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
  createdAt: number;
}

export interface HorizontalLine {
  id: string;
  type: "horizontal";
  price: number;
  color: string;
  strokeWidth: number;
  label?: string;
  createdAt: number;
}

export interface VerticalLine {
  id: string;
  type: "vertical";
  timestamp: number;
  color: string;
  strokeWidth: number;
  label?: string;
  createdAt: number;
}

export type DrawingObject = TrendLine | FibonacciRetracement | HorizontalLine | VerticalLine;

export interface DrawingState {
  isDrawing: boolean;
  currentTool: DrawingToolType;
  drawnObjects: DrawingObject[];
  currentStartPoint: Point | null;
  selectedObjectId: string | null;
}

export interface DrawingToolsContextType {
  state: DrawingState;
  setCurrentTool: (tool: DrawingToolType) => void;
  startDrawing: (point: Point) => void;
  endDrawing: (point: Point) => void;
  cancelDrawing: () => void;
  deleteObject: (id: string) => void;
  deleteAllObjects: () => void;
  selectObject: (id: string | null) => void;
  saveDrawings: (symbol: string) => Promise<void>;
  loadDrawings: (symbol: string) => Promise<void>;
  clearDrawings: () => void;
}

// 기본 색상 설정
export const DRAWING_COLORS = {
  trendline: "#4169E1", // 로얄 블루
  fibonacci: "#FF8C00", // 다크 오렌지
  horizontal: "#9370DB", // 미디엄 퍼플
  vertical: "#20B2AA", // 라이트 씨 그린
};

// 기본 스트로크 너비
export const DEFAULT_STROKE_WIDTH = 1.5;

// 피보나치 레벨
export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// 유틸리티 함수
export function calculateFibonacciPrice(
  highPrice: number,
  lowPrice: number,
  level: number
): number {
  const range = highPrice - lowPrice;
  return highPrice - range * level;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
