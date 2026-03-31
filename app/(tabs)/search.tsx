import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { trpc } from "@/lib/trpc";
import type { SearchResult } from "@/shared/stockTypes";

// Popular Korean stocks for quick access
const POPULAR_KR = [
  { symbol: "005930.KS", name: "삼성전자", exchange: "KRX" },
  { symbol: "000660.KS", name: "SK하이닉스", exchange: "KRX" },
  { symbol: "035420.KS", name: "NAVER", exchange: "KRX" },
  { symbol: "035720.KS", name: "카카오", exchange: "KRX" },
  { symbol: "051910.KS", name: "LG화학", exchange: "KRX" },
  { symbol: "006400.KS", name: "삼성SDI", exchange: "KRX" },
  { symbol: "207940.KS", name: "삼성바이오로직스", exchange: "KRX" },
  { symbol: "005380.KS", name: "현대차", exchange: "KRX" },
];

const POPULAR_US = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet", exchange: "NASDAQ" },
];

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const { recent, addRecent, clearRecent } = useRecentSearches();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [marketTab, setMarketTab] = useState<"KR" | "US">("KR");

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text), 400);
  }, []);

  const { data: searchResults, isLoading: searching } = trpc.stock.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 1, staleTime: 30_000 }
  );

  const handleSelect = useCallback(
    async (item: SearchResult) => {
      await addRecent(item);
      router.push(`/chart/${item.symbol}` as any);
    },
    [addRecent, router]
  );

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => handleSelect(item)}
      style={[styles.resultItem, { borderBottomColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={styles.resultLeft}>
        <Text style={[styles.resultSymbol, { color: colors.foreground }]}>{item.symbol}</Text>
        <Text style={[styles.resultName, { color: colors.muted }]} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <View style={[styles.exchangeBadge, { backgroundColor: colors.surface }]}>
        <Text style={[styles.exchangeText, { color: colors.muted }]}>{item.exchange}</Text>
      </View>
    </TouchableOpacity>
  );

  const popularList = marketTab === "KR" ? POPULAR_KR : POPULAR_US;
  const showSearch = debouncedQuery.length >= 1;

  return (
    <ScreenContainer>
      {/* Search Header */}
      <View style={[styles.searchHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>검색</Text>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.searchIcon, { color: colors.muted }]}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder="종목명 또는 코드 입력 (예: 삼성전자, AAPL)"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setDebouncedQuery(""); }}>
              <Text style={[styles.clearBtn, { color: colors.muted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearch ? (
        /* Search Results */
        <FlatList
          data={searchResults ?? []}
          keyExtractor={(item) => item.symbol}
          renderItem={renderItem}
          ListHeaderComponent={
            searching ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : null
          }
          ListEmptyComponent={
            !searching ? (
              <View style={styles.emptySearch}>
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  검색 결과가 없습니다
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View>
              {/* Recent Searches */}
              {recent.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.muted }]}>최근 검색</Text>
                    <TouchableOpacity onPress={clearRecent}>
                      <Text style={[styles.clearAll, { color: colors.muted }]}>전체 삭제</Text>
                    </TouchableOpacity>
                  </View>
                  {recent.map((item) => (
                    <TouchableOpacity
                      key={item.symbol}
                      onPress={() => handleSelect(item)}
                      style={[styles.resultItem, { borderBottomColor: colors.border }]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.resultLeft}>
                        <Text style={[styles.resultSymbol, { color: colors.foreground }]}>
                          {item.symbol}
                        </Text>
                        <Text style={[styles.resultName, { color: colors.muted }]}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>최근</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Popular Stocks */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.muted }]}>인기 종목</Text>
                  <View style={styles.marketTabs}>
                    {(["KR", "US"] as const).map((tab) => (
                      <TouchableOpacity
                        key={tab}
                        onPress={() => setMarketTab(tab)}
                        style={[
                          styles.marketTab,
                          marketTab === tab && { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.marketTabText,
                            { color: marketTab === tab ? "#fff" : colors.muted },
                          ]}
                        >
                          {tab === "KR" ? "🇰🇷 한국" : "🇺🇸 미국"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {popularList.map((item) => (
                  <TouchableOpacity
                    key={item.symbol}
                    onPress={() => handleSelect(item)}
                    style={[styles.resultItem, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resultLeft}>
                      <Text style={[styles.resultSymbol, { color: colors.foreground }]}>
                        {item.symbol}
                      </Text>
                      <Text style={[styles.resultName, { color: colors.muted }]}>
                        {item.name}
                      </Text>
                    </View>
                    <View style={[styles.exchangeBadge, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.exchangeText, { color: colors.muted }]}>
                        {item.exchange}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  screenTitle: { fontSize: 26, fontWeight: "800" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  clearBtn: { fontSize: 14, padding: 2 },
  listContent: { paddingBottom: 32 },
  section: { paddingTop: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  clearAll: { fontSize: 12 },
  marketTabs: { flexDirection: "row", gap: 4 },
  marketTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marketTabText: { fontSize: 12, fontWeight: "600" },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  resultLeft: { flex: 1, gap: 2 },
  resultSymbol: { fontSize: 15, fontWeight: "700" },
  resultName: { fontSize: 12 },
  exchangeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exchangeText: { fontSize: 11, fontWeight: "500" },
  emptySearch: { alignItems: "center", paddingTop: 48 },
  emptyText: { fontSize: 15 },
});
