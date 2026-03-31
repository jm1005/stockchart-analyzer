import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import axios from "axios";

const YAHOO_FINANCE_API = "https://query2.finance.yahoo.com";

interface FinancialData {
  pe?: number;
  pb?: number;
  dividendYield?: number;
  revenue?: number;
  operatingIncome?: number;
  netIncome?: number;
  eps?: number;
  bookValue?: number;
  roe?: number;
  roa?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  profitMargin?: number;
  operatingMargin?: number;
}

export const financialsRouter = router({
  get: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }): Promise<FinancialData> => {
      try {
        // Yahoo Finance quoteSummary API
        const response = await axios.get(
          `${YAHOO_FINANCE_API}/v10/finance/quoteSummary/${input.symbol}`,
          {
            params: {
              modules: [
                "summaryDetail",
                "financialData",
                "defaultKeyStatistics",
                "incomeStatementHistory",
              ].join(","),
            },
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            timeout: 10000,
          }
        );

        const result = response.data.quoteSummary.result[0];
        const summary = result.summaryDetail || {};
        const financial = result.financialData || {};
        const keyStats = result.defaultKeyStatistics || {};

        return {
          pe: summary.trailingPE?.raw ?? financial.trailingPE?.raw,
          pb: keyStats.priceToBook?.raw,
          dividendYield: summary.dividendYield?.raw,
          revenue: financial.totalRevenue?.raw,
          operatingIncome: financial.operatingCashflow?.raw,
          netIncome: financial.netIncome?.raw,
          eps: keyStats.trailingEps?.raw,
          bookValue: keyStats.bookValue?.raw,
          roe: financial.returnOnEquity?.raw,
          roa: financial.returnOnAssets?.raw,
          debtToEquity: keyStats.debtToEquity?.raw,
          currentRatio: financial.currentRatio?.raw,
          quickRatio: financial.quickRatio?.raw,
          profitMargin: financial.profitMargins?.raw,
          operatingMargin: financial.operatingMargins?.raw,
        };
      } catch (error) {
        console.error("Failed to fetch financials:", error);
        return {};
      }
    }),
});
