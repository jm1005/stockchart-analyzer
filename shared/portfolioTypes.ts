/**
 * 포트폴리오 관련 타입 정의
 */

export type TradeType = "buy" | "sell";

export interface Trade {
  id: string;
  symbol: string;
  type: TradeType;
  quantity: number;
  price: number;
  date: number; // timestamp
  notes?: string;
}

export interface Position {
  symbol: string;
  name?: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  trades: Trade[];
  lastUpdated: number;
}

export interface Portfolio {
  positions: Position[];
  totalCost: number;
  totalValue: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  totalRealizedPnL: number;
  totalPnL: number;
  totalPnLPercent: number;
  lastUpdated: number;
}

export interface PortfolioStats {
  winRate: number; // 수익 거래 비율
  averageWin: number;
  averageLoss: number;
  profitFactor: number; // 총 수익 / 총 손실
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  largestWin: number;
  largestLoss: number;
}

export interface PortfolioHistory {
  date: number;
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
}
