import { useState, useCallback, useEffect } from "react";
import type { Trade, Position, Portfolio, PortfolioStats } from "@/shared/portfolioTypes";
import {
  getTrades,
  addTrade,
  deleteTrade,
  updateTrade,
  getPortfolio,
  calculatePortfolioStats,
  clearPortfolio,
} from "@/lib/portfolioStorage";

interface UsePortfolioReturn {
  portfolio: Portfolio | null;
  trades: Trade[];
  stats: PortfolioStats | null;
  loading: boolean;
  error: string | null;
  addTrade: (trade: Omit<Trade, "id">) => Promise<void>;
  deleteTrade: (tradeId: string) => Promise<void>;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => Promise<void>;
  refreshPortfolio: (currentPrices: Record<string, number>) => Promise<void>;
  clearAll: () => Promise<void>;
}

/**
 * 포트폴리오 관리 훅
 */
export function usePortfolio(currentPrices: Record<string, number> = {}): UsePortfolioReturn {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 포트폴리오 새로고침
  const refreshPortfolio = useCallback(
    async (prices: Record<string, number> = currentPrices) => {
      try {
        setLoading(true);
        setError(null);

        const [portfolioData, tradesData] = await Promise.all([getPortfolio(prices), getTrades()]);

        setPortfolio(portfolioData);
        setTrades(tradesData);
        setStats(calculatePortfolioStats(tradesData));
      } catch (err) {
        const message = err instanceof Error ? err.message : "포트폴리오 로드 실패";
        setError(message);
        console.error("Failed to refresh portfolio:", err);
      } finally {
        setLoading(false);
      }
    },
    [currentPrices]
  );

  // 거래 추가
  const handleAddTrade = useCallback(
    async (trade: Omit<Trade, "id">) => {
      try {
        setError(null);
        await addTrade(trade);
        await refreshPortfolio();
      } catch (err) {
        const message = err instanceof Error ? err.message : "거래 추가 실패";
        setError(message);
        console.error("Failed to add trade:", err);
      }
    },
    [refreshPortfolio]
  );

  // 거래 삭제
  const handleDeleteTrade = useCallback(
    async (tradeId: string) => {
      try {
        setError(null);
        await deleteTrade(tradeId);
        await refreshPortfolio();
      } catch (err) {
        const message = err instanceof Error ? err.message : "거래 삭제 실패";
        setError(message);
        console.error("Failed to delete trade:", err);
      }
    },
    [refreshPortfolio]
  );

  // 거래 수정
  const handleUpdateTrade = useCallback(
    async (tradeId: string, updates: Partial<Trade>) => {
      try {
        setError(null);
        await updateTrade(tradeId, updates);
        await refreshPortfolio();
      } catch (err) {
        const message = err instanceof Error ? err.message : "거래 수정 실패";
        setError(message);
        console.error("Failed to update trade:", err);
      }
    },
    [refreshPortfolio]
  );

  // 전체 초기화
  const handleClearAll = useCallback(async () => {
    try {
      setError(null);
      await clearPortfolio();
      setPortfolio(null);
      setTrades([]);
      setStats(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "초기화 실패";
      setError(message);
      console.error("Failed to clear portfolio:", err);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    refreshPortfolio();
  }, []);

  return {
    portfolio,
    trades,
    stats,
    loading,
    error,
    addTrade: handleAddTrade,
    deleteTrade: handleDeleteTrade,
    updateTrade: handleUpdateTrade,
    refreshPortfolio,
    clearAll: handleClearAll,
  };
}
