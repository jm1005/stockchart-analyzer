import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useWatchlist } from "@/hooks/useWatchlist";
import { trpc } from "@/lib/trpc";

export default function WatchlistScreen() {
  const colors = useColors();
  const router = useRouter();
  const { watchlist, removeFromWatchlist } = useWatchlist();

  const { data: quotes, isLoading } = trpc.stock.quotes.useQuery(
    { symbols: watchlist.map((w) => w.symbol) },
    { enabled: watchlist.length > 0, staleTime: 30_000 }
  );

  const handleRemove = useCallback(
    (symbol: string) => {
      Alert.alert("관심종목 삭제", `${symbol}을(를) 관심종목에서 삭제하시겠습니까?`, [
        { text: "취소", style: "cancel" },
        { text: "삭제", style: "destructive", onPress: () => removeFromWatchlist(symbol) },
      ]);
    },
    [removeFromWatchlist]
  );

  const renderItem = ({ item }: { item: any }) => {
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
        onLongPress={() => handleRemove(item.symbol)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={[styles.symbol, { color: colors.foreground }]}>{item.symbol}</Text>
          <Text style={[styles.name, { color: colors.muted }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.price, { color: colors.foreground }]}>{priceStr}</Text>
          <View style={[styles.changeBadge, { backgroundColor: color + "22" }]}>
            <Text style={[styles.change, { color }]}>
              {sign}{item.changePercent.toFixed(2)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>관심종목</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>길게 눌러 삭제</Text>
      </View>

      {isLoading && watchlist.length > 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : watchlist.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            관심종목이 없습니다
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            검색에서 종목을 추가하거나{"\n"}차트 화면의 ☆ 버튼을 누르세요
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/search" as any)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addBtnText}>종목 검색하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={quotes ?? []}
          keyExtractor={(item) => item.symbol}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  title: { fontSize: 26, fontWeight: "800" },
  hint: { fontSize: 12 },
  list: { padding: 16, gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardLeft: { flex: 1, gap: 3 },
  symbol: { fontSize: 15, fontWeight: "700" },
  name: { fontSize: 12 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  price: { fontSize: 16, fontWeight: "700" },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  change: { fontSize: 12, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  addBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
