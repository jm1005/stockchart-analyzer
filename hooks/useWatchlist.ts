import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback } from "react";
import type { WatchlistItem } from "@/shared/stockTypes";

const WATCHLIST_KEY = "chartlens_watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WATCHLIST_KEY).then((data) => {
      if (data) {
        try {
          setWatchlist(JSON.parse(data));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (items: WatchlistItem[]) => {
    setWatchlist(items);
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
  }, []);

  const addToWatchlist = useCallback(
    async (symbol: string, name: string) => {
      const exists = watchlist.some((w) => w.symbol === symbol);
      if (exists) return;
      const newItem: WatchlistItem = { symbol, name, addedAt: Date.now() };
      await save([...watchlist, newItem]);
    },
    [watchlist, save]
  );

  const removeFromWatchlist = useCallback(
    async (symbol: string) => {
      await save(watchlist.filter((w) => w.symbol !== symbol));
    },
    [watchlist, save]
  );

  const isInWatchlist = useCallback(
    (symbol: string) => watchlist.some((w) => w.symbol === symbol),
    [watchlist]
  );

  return { watchlist, loaded, addToWatchlist, removeFromWatchlist, isInWatchlist };
}
