import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Trade, Position, Portfolio, PortfolioStats } from "@/shared/portfolioTypes";

const PORTFOLIO_KEY = "portfolio_trades";
const PORTFOLIO_VERSION = "1.0";

/**
 * 포트폴리오 저장소 관리 함수
 */

/**
 * 모든 거래 기록 조회
 */
export async function getTrades(): Promise<Trade[]> {
  try {
    const data = await AsyncStorage.getItem(PORTFOLIO_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.trades || [];
  } catch (error) {
    console.error("Failed to get trades:", error);
    return [];
  }
}

/**
 * 거래 추가
 */
export async function addTrade(trade: Omit<Trade, "id">): Promise<Trade> {
  try {
    const trades = await getTrades();
    const newTrade: Trade = {
      ...trade,
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    trades.push(newTrade);
    await AsyncStorage.setItem(PORTFOLIO_KEY, JSON.stringify({ version: PORTFOLIO_VERSION, trades }));
    return newTrade;
  } catch (error) {
    console.error("Failed to add trade:", error);
    throw error;
  }
}

/**
 * 거래 삭제
 */
export async function deleteTrade(tradeId: string): Promise<void> {
  try {
    const trades = await getTrades();
    const filtered = trades.filter((t) => t.id !== tradeId);
    await AsyncStorage.setItem(PORTFOLIO_KEY, JSON.stringify({ version: PORTFOLIO_VERSION, trades: filtered }));
  } catch (error) {
    console.error("Failed to delete trade:", error);
    throw error;
  }
}

/**
 * 거래 수정
 */
export async function updateTrade(tradeId: string, updates: Partial<Trade>): Promise<Trade> {
  try {
    const trades = await getTrades();
    const index = trades.findIndex((t) => t.id === tradeId);
    if (index === -1) throw new Error("Trade not found");

    trades[index] = { ...trades[index], ...updates, id: tradeId };
    await AsyncStorage.setItem(PORTFOLIO_KEY, JSON.stringify({ version: PORTFOLIO_VERSION, trades }));
    return trades[index];
  } catch (error) {
    console.error("Failed to update trade:", error);
    throw error;
  }
}

/**
 * 종목별 포지션 계산
 */
export function calculatePositions(trades: Trade[], currentPrices: Record<string, number>): Position[] {
  const positionMap: Record<string, Position> = {};

  // 거래 기록으로부터 포지션 계산
  for (const trade of trades) {
    if (!positionMap[trade.symbol]) {
      positionMap[trade.symbol] = {
        symbol: trade.symbol,
        quantity: 0,
        averagePrice: 0,
        totalCost: 0,
        currentPrice: currentPrices[trade.symbol] || 0,
        currentValue: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: 0,
        trades: [],
        lastUpdated: Date.now(),
      };
    }

    const position = positionMap[trade.symbol];
    position.trades.push(trade);

    if (trade.type === "buy") {
      const totalQuantity = position.quantity + trade.quantity;
      position.averagePrice =
        (position.averagePrice * position.quantity + trade.price * trade.quantity) / totalQuantity;
      position.quantity = totalQuantity;
      position.totalCost += trade.price * trade.quantity;
    } else {
      // sell
      position.quantity -= trade.quantity;
      const sellValue = trade.price * trade.quantity;
      const costOfSold = position.averagePrice * trade.quantity;
      position.realizedPnL += sellValue - costOfSold;
      position.totalCost = Math.max(0, position.totalCost - costOfSold);
    }
  }

  // 미실현 손익 계산
  for (const symbol in positionMap) {
    const position = positionMap[symbol];
    position.currentPrice = currentPrices[symbol] || position.currentPrice;
    position.currentValue = position.quantity * position.currentPrice;
    position.unrealizedPnL = position.currentValue - position.totalCost;
    position.unrealizedPnLPercent = position.totalCost > 0 ? (position.unrealizedPnL / position.totalCost) * 100 : 0;
  }

  return Object.values(positionMap).filter((p) => p.quantity > 0 || p.realizedPnL !== 0);
}

/**
 * 포트폴리오 통계 계산
 */
export function calculatePortfolioStats(trades: Trade[]): PortfolioStats {
  const completedTrades: Array<{ pnl: number; type: "win" | "loss" }> = [];
  let totalRealizedPnL = 0;

  // 매도 거래마다 손익 계산
  for (const sellTrade of trades.filter((t) => t.type === "sell")) {
    // 해당 종목의 매수 거래 찾기
    const buyTrades = trades.filter((t) => t.type === "buy" && t.symbol === sellTrade.symbol && t.date < sellTrade.date);

    if (buyTrades.length > 0) {
      // 평균 매입가 계산
      const avgBuyPrice =
        buyTrades.reduce((sum, t) => sum + t.price * t.quantity, 0) / buyTrades.reduce((sum, t) => sum + t.quantity, 0);

      const pnl = (sellTrade.price - avgBuyPrice) * sellTrade.quantity;
      completedTrades.push({
        pnl,
        type: pnl > 0 ? "win" : "loss",
      });
      totalRealizedPnL += pnl;
    }
  }

  const winningTrades = completedTrades.filter((t) => t.type === "win");
  const losingTrades = completedTrades.filter((t) => t.type === "loss");

  const averageWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;

  const averageLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;

  const totalWinAmount = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLossAmount = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

  return {
    winRate: completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0,
    averageWin,
    averageLoss,
    profitFactor: totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? Infinity : 0,
    totalTrades: completedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl)) : 0,
  };
}

/**
 * 포트폴리오 전체 조회
 */
export async function getPortfolio(currentPrices: Record<string, number>): Promise<Portfolio> {
  try {
    const trades = await getTrades();
    const positions = calculatePositions(trades, currentPrices);

    const totalCost = positions.reduce((sum, p) => sum + p.totalCost, 0);
    const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const totalRealizedPnL = positions.reduce((sum, p) => sum + p.realizedPnL, 0);
    const totalPnL = totalUnrealizedPnL + totalRealizedPnL;

    return {
      positions,
      totalCost,
      totalValue,
      totalUnrealizedPnL,
      totalUnrealizedPnLPercent: totalCost > 0 ? (totalUnrealizedPnL / totalCost) * 100 : 0,
      totalRealizedPnL,
      totalPnL,
      totalPnLPercent: totalCost > 0 ? (totalPnL / totalCost) * 100 : 0,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error("Failed to get portfolio:", error);
    return {
      positions: [],
      totalCost: 0,
      totalValue: 0,
      totalUnrealizedPnL: 0,
      totalUnrealizedPnLPercent: 0,
      totalRealizedPnL: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      lastUpdated: Date.now(),
    };
  }
}

/**
 * 포트폴리오 초기화 (모든 거래 삭제)
 */
export async function clearPortfolio(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PORTFOLIO_KEY);
  } catch (error) {
    console.error("Failed to clear portfolio:", error);
    throw error;
  }
}
