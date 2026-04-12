import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Yahoo Finance API helper
async function fetchYahooFinance(url: string) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status}`);
  return res.json();
}

// Map period to Yahoo Finance interval/range
function getPeriodParams(period: string): { interval: string; range: string } {
  const map: Record<string, { interval: string; range: string }> = {
    "1D": { interval: "5m", range: "1d" },
    "1W": { interval: "30m", range: "5d" },
    "1M": { interval: "1d", range: "1mo" },
    "3M": { interval: "1d", range: "3mo" },
    "6M": { interval: "1d", range: "6mo" },
    "1Y": { interval: "1wk", range: "1y" },
    "5Y": { interval: "1mo", range: "5y" },
  };
  return map[period] ?? { interval: "1d", range: "3mo" };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  stock: router({
    // Search stocks by query (Korean or US)
    search: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(input.query)}&newsCount=0&quotesCount=10&enableFuzzyQuery=false&enableNavLinks=false`;
        try {
          const data = await fetchYahooFinance(url);
          const quotes = (data?.quotes ?? []) as Array<{
            symbol: string;
            shortname?: string;
            longname?: string;
            exchange?: string;
            quoteType?: string;
          }>;
          return quotes
            .filter((q) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
            .map((q) => ({
              symbol: q.symbol,
              name: q.shortname ?? q.longname ?? q.symbol,
              exchange: q.exchange ?? "",
            }));
        } catch {
          return [];
        }
      }),

    // Get OHLCV chart data
    chart: publicProcedure
      .input(
        z.object({
          symbol: z.string(),
          period: z.enum(["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"]).default("3M"),
        })
      )
      .query(async ({ input }) => {
        const { interval, range } = getPeriodParams(input.period);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(input.symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
        const data = await fetchYahooFinance(url);

        const result = data?.chart?.result?.[0];
        if (!result) throw new Error("No chart data available");

        const timestamps: number[] = result.timestamp ?? [];
        const quote = result.indicators?.quote?.[0] ?? {};
        const opens: number[] = quote.open ?? [];
        const highs: number[] = quote.high ?? [];
        const lows: number[] = quote.low ?? [];
        const closes: number[] = quote.close ?? [];
        const volumes: number[] = quote.volume ?? [];

        const candles = timestamps
          .map((ts, i) => ({
            timestamp: ts * 1000,
            open: opens[i],
            high: highs[i],
            low: lows[i],
            close: closes[i],
            volume: volumes[i],
          }))
          .filter(
            (c) =>
              c.open != null &&
              c.high != null &&
              c.low != null &&
              c.close != null
          );

        const meta = result.meta ?? {};
        return {
          symbol: input.symbol,
          currency: meta.currency ?? "USD",
          regularMarketPrice: meta.regularMarketPrice ?? 0,
          previousClose: meta.chartPreviousClose ?? meta.previousClose ?? 0,
          candles,
        };
      }),

    // Get quote summary (current price, market cap, etc.)
    quote: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(input.symbol)}?interval=1d&range=1d`;
        const data = await fetchYahooFinance(url);
        const meta = data?.chart?.result?.[0]?.meta ?? {};
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
        const currentPrice = meta.regularMarketPrice ?? 0;
        const change = currentPrice - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        return {
          symbol: input.symbol,
          name: meta.longName ?? meta.shortName ?? input.symbol,
          price: currentPrice,
          previousClose: prevClose,
          change,
          changePercent,
          currency: meta.currency ?? "USD",
          exchange: meta.exchangeName ?? "",
          marketState: meta.marketState ?? "CLOSED",
        };
      }),

    // Get multiple quotes at once (for watchlist)
    quotes: publicProcedure
      .input(z.object({ symbols: z.array(z.string()).max(20) }))
      .query(async ({ input }) => {
        const results = await Promise.allSettled(
          input.symbols.map(async (symbol) => {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
            const data = await fetchYahooFinance(url);
            const meta = data?.chart?.result?.[0]?.meta ?? {};
            const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
            const currentPrice = meta.regularMarketPrice ?? 0;
            const change = currentPrice - prevClose;
            const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
            return {
              symbol,
              name: meta.longName ?? meta.shortName ?? symbol,
              price: currentPrice,
              previousClose: prevClose,
              change,
              changePercent,
              currency: meta.currency ?? "USD",
            };
          })
        );
        return results
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<any>).value);
      }),

    // Get market indices
    indices: publicProcedure.query(async () => {
      const symbols = ["^KS11", "^KQ11", "^IXIC", "^GSPC", "^DJI"];
      const names: Record<string, string> = {
        "^KS11": "KOSPI",
        "^KQ11": "KOSDAQ",
        "^IXIC": "NASDAQ",
        "^GSPC": "S&P 500",
        "^DJI": "DOW",
      };
      const results = await Promise.allSettled(
        symbols.map(async (symbol) => {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
          const data = await fetchYahooFinance(url);
          const meta = data?.chart?.result?.[0]?.meta ?? {};
          const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
          const currentPrice = meta.regularMarketPrice ?? 0;
          const change = currentPrice - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
          return {
            symbol,
            name: names[symbol] ?? symbol,
            price: currentPrice,
            change,
            changePercent,
          };
        })
      );
      return results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<any>).value);
    }),
  }),
});

export type AppRouter = typeof appRouter;
