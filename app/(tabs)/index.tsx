import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useWatchlist } from "@/hooks/useWatchlist";
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { watchlist } = useWatchlist();

  const {
    data: indices,
    isLoading: indicesLoading,
    refetch: refetchIndices,
  } = trpc.stock.indices.useQuery(undefined, { staleTime: 60_000 });

  const {
    data: watchlistQuotes,
    isLoading: quotesLoading,
    refetch: refetchQuotes,
  } = trpc.stock.quotes.useQuery(
    { symbols: watchlist.map((w) => w.symbol) },
    { enabled: watchlist.length > 0, staleTime: 30_000 }
  );

  const isRefreshing = indicesLoading || quotesLoading;

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchIndices(), refetchQuotes()]);
  }, [refetchIndices, refetchQuotes]);

  const renderIndex = ({ item }: { item: any }) => {
    const isUp = item.changePercent >= 0;
    const color = isUp ? colors.bullish : colors.bearish;
    return (
      <View style={[styles.indexCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.indexName, { color: colors.muted }]}>{item.name}</Text>
        <Text style={[styles.indexPrice, { color: colors.foreground }]}>
          {item.price.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
        </Text>
        <Text style={[styles.indexChange, { color }]}>
          {isUp ? "+" : ""}{item.changePercent.toFixed(2)}%
        </Text>
      </View>
    );
  };

  const renderWatchlistItem = ({ item }: { item: any }) => {
    const isUp = item.changePercent >= 0;
    const color = isUp ? colors.bullish : colors.bearish;
    const sign = isUp ? "+" : "";
    const priceStr =
      item.currency === "KRW"
        ? `₩${item.price.toLocaleString("ko-KR")}`
        : `$${item.price.toFixed(2)}`;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chart/${item.symbol}` as any)}
        style={[styles.stockCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View style={styles.stockLeft}>
          <Text style={[styles.stockSymbol, { color: colors.foreground }]}>{item.symbol}</Text>
          <Text style={[styles.stockName, { color: colors.muted }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.stockRight}>
          <Text style={[styles.stockPrice, { color: colors.foreground }]}>{priceStr}</Text>
          <View style={[styles.changeBadge, { backgroundColor: color + "22" }]}>
            <Text style={[styles.changeText, { color }]}>
              {sign}{item.changePercent.toFixed(2)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <FlatList
        data={watchlistQuotes ?? []}
        keyExtractor={(item) => item.symbol}
        renderItem={renderWatchlistItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* App Header */}
            <View style={[styles.appHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.appTitle, { color: colors.foreground }]}>ChartLens</Text>
              <TouchableOpacity
                onPress={() => router.push("/search" as any)}
                style={[styles.searchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.searchBtnText, { color: colors.muted }]}>
                  🔍 종목 검색...
                </Text>
              </TouchableOpacity>
            </View>

            {/* Market Indices */}
            <View style={styles.indicesSection}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>시장 지수</Text>
              {indicesLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
              ) : (
                <FlatList
                  data={indices ?? []}
                  keyExtractor={(item) => item.symbol}
                  renderItem={renderIndex}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.indicesList}
                />
              )}
            </View>

            {/* Watchlist Header */}
            <View style={styles.watchlistHeader}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>관심종목</Text>
              <TouchableOpacity onPress={() => router.push("/search" as any)}>
                <Text style={[styles.addBtn, { color: colors.primary }]}>+ 추가</Text>
              </TouchableOpacity>
            </View>

            {watchlist.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyIcon]}>📈</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  관심종목이 없습니다
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  검색에서 종목을 추가해보세요
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/search" as any)}
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.emptyBtnText}>종목 검색하기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          watchlist.length > 0 && quotesLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 32 },
  appHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  appTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  searchBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchBtnText: { fontSize: 14 },
  indicesSection: { paddingTop: 16, paddingBottom: 8 },
  indicesList: { paddingHorizontal: 16, gap: 8 },
  indexCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minWidth: 110,
    gap: 4,
  },
  indexName: { fontSize: 11, fontWeight: "600" },
  indexPrice: { fontSize: 15, fontWeight: "700" },
  indexChange: { fontSize: 12, fontWeight: "600" },
  watchlistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  addBtn: { fontSize: 14, fontWeight: "600" },
  stockCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  stockLeft: { flex: 1, gap: 3 },
  stockSymbol: { fontSize: 15, fontWeight: "700" },
  stockName: { fontSize: 12 },
  stockRight: { alignItems: "flex-end", gap: 4 },
  stockPrice: { fontSize: 16, fontWeight: "700" },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  changeText: { fontSize: 12, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
