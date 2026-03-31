import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback } from "react";
import type { SearchResult } from "@/shared/stockTypes";

const RECENT_KEY = "chartlens_recent_searches";
const MAX_RECENT = 10;

export function useRecentSearches() {
  const [recent, setRecent] = useState<SearchResult[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((data) => {
      if (data) {
        try {
          setRecent(JSON.parse(data));
        } catch {}
      }
    });
  }, []);

  const addRecent = useCallback(
    async (item: SearchResult) => {
      const filtered = recent.filter((r) => r.symbol !== item.symbol);
      const updated = [item, ...filtered].slice(0, MAX_RECENT);
      setRecent(updated);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    },
    [recent]
  );

  const clearRecent = useCallback(async () => {
    setRecent([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  }, []);

  return { recent, addRecent, clearRecent };
}
