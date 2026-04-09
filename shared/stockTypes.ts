// Stock-specific shared types

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange?: string;
  marketState?: string;
}

export interface ChartData {
  symbol: string;
  currency: string;
  regularMarketPrice: number;
  previousClose: number;
  candles: Candle[];
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export type Period = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";

export interface SupportResistanceLevel {
  price: number;
  type: "support" | "resistance";
  strength: number;
  touches: number[];
}

export interface PatternResult {
  type: PatternType;
  confidence: number;
  startIndex: number;
  endIndex: number;
  description: string;
  signal: "bullish" | "bearish" | "neutral";
  targetPrice?: number;
  volumeConfirmed?: boolean;
}

export interface DivergenceResult {
  type: "rsi" | "macd";
  signal: "bullish" | "bearish";
  confidence: number;
  description: string;
}

export type PatternType =
  | "head_and_shoulders"
  | "inverse_head_and_shoulders"
  | "double_top"
  | "double_bottom"
  | "cup_and_handle"
  | "dead_cat_bounce"
  | "ascending_triangle"
  | "descending_triangle"
  | "symmetrical_triangle"
  | "bull_flag"
  | "bear_flag"
  | "rising_wedge"
  | "falling_wedge"
  | "flag_pennant"
  | "rsi_divergence"
  | "macd_divergence";

export interface TechnicalIndicators {
  ma5: (number | null)[];
  ma20: (number | null)[];
  ma60: (number | null)[];
  ma120: (number | null)[];
  rsi: (number | null)[];
  macd: {
    macd: (number | null)[];
    signal: (number | null)[];
    histogram: (number | null)[];
  };
  bollingerBands: {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  };
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  addedAt: number;
}
