import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { usePortfolio } from "@/hooks/usePortfolio";
import type { Trade } from "@/shared/portfolioTypes";

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  statsContainer: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  positionsContainer: {
    marginBottom: 20,
  },
  positionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  positionCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  positionSymbol: {
    fontSize: 16,
    fontWeight: "600",
  },
  positionValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  positionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 12,
    opacity: 0.7,
  },
  tradesContainer: {
    marginBottom: 20,
  },
  tradesTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  tradeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tradeInfo: {
    flex: 1,
  },
  tradeSymbol: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  tradeDetails: {
    fontSize: 12,
    opacity: 0.7,
  },
  tradePrice: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
  },
  modal: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  typeSelector: {
    flexDirection: "row",
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default function PortfolioScreen() {
  const colors = useColors();
  const { portfolio, trades, stats, loading, error, addTrade, deleteTrade } = usePortfolio();
  const [modalVisible, setModalVisible] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [formData, setFormData] = useState({
    symbol: "",
    quantity: "",
    price: "",
    notes: "",
  });

  const handleAddTrade = async () => {
    if (!formData.symbol || !formData.quantity || !formData.price) {
      Alert.alert("오류", "모든 필드를 입력해주세요");
      return;
    }

    try {
      await addTrade({
        symbol: formData.symbol.toUpperCase(),
        type: tradeType,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        date: Date.now(),
        notes: formData.notes,
      });

      setFormData({ symbol: "", quantity: "", price: "", notes: "" });
      setModalVisible(false);
      Alert.alert("성공", "거래가 추가되었습니다");
    } catch (err) {
      Alert.alert("오류", err instanceof Error ? err.message : "거래 추가 실패");
    }
  };

  const handleDeleteTrade = (tradeId: string) => {
    Alert.alert("삭제 확인", "이 거래를 삭제하시겠습니까?", [
      { text: "취소", onPress: () => {} },
      {
        text: "삭제",
        onPress: async () => {
          try {
            await deleteTrade(tradeId);
            Alert.alert("성공", "거래가 삭제되었습니다");
          } catch (err) {
            Alert.alert("오류", err instanceof Error ? err.message : "거래 삭제 실패");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={{ color: colors.foreground }}>로딩 중...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={[styles.header, { marginTop: 16 }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>포트폴리오</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {trades.length}개 거래 • {portfolio?.positions.length || 0}개 포지션
          </Text>
        </View>

        {error && (
          <View style={[styles.statsContainer, { backgroundColor: colors.error, opacity: 0.2 }]}>
            <Text style={{ color: colors.error }}>{error}</Text>
          </View>
        )}

        {/* Portfolio Stats */}
        {portfolio && (
          <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>총 자산</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCurrency(portfolio.totalValue)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>총 손익</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: portfolio.totalPnL >= 0 ? colors.success : colors.error },
                ]}
              >
                {formatCurrency(portfolio.totalPnL)} ({formatPercent(portfolio.totalPnLPercent)})
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>미실현 손익</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: portfolio.totalUnrealizedPnL >= 0 ? colors.success : colors.error },
                ]}
              >
                {formatCurrency(portfolio.totalUnrealizedPnL)} ({formatPercent(portfolio.totalUnrealizedPnLPercent)})
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>실현 손익</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: portfolio.totalRealizedPnL >= 0 ? colors.success : colors.error },
                ]}
              >
                {formatCurrency(portfolio.totalRealizedPnL)}
              </Text>
            </View>
          </View>
        )}

        {/* Add Trade Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary || "#0a7ea4" }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ 거래 추가</Text>
        </TouchableOpacity>

        {/* Positions */}
        {portfolio && portfolio.positions.length > 0 && (
          <View style={styles.positionsContainer}>
            <Text style={[styles.positionsTitle, { color: colors.foreground }]}>포지션</Text>
            {portfolio.positions.map((position) => (
              <View key={position.symbol} style={[styles.positionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.positionHeader}>
                  <Text style={[styles.positionSymbol, { color: colors.foreground }]}>{position.symbol}</Text>
                  <Text
                    style={[
                      styles.positionValue,
                      { color: position.unrealizedPnL >= 0 ? colors.success : colors.error },
                    ]}
                  >
                    {formatCurrency(position.unrealizedPnL)}
                  </Text>
                </View>
                <View style={styles.positionDetails}>
                  <Text style={{ color: colors.muted }}>수량: {position.quantity}</Text>
                  <Text style={{ color: colors.muted }}>평균가: {formatCurrency(position.averagePrice)}</Text>
                  <Text style={{ color: colors.muted }}>현재가: {formatCurrency(position.currentPrice)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Trades */}
        {trades.length > 0 && (
          <View style={styles.tradesContainer}>
            <Text style={[styles.tradesTitle, { color: colors.foreground }]}>거래 기록</Text>
            <FlatList
              scrollEnabled={false}
              data={trades.sort((a, b) => b.date - a.date)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onLongPress={() => handleDeleteTrade(item.id)}
                  style={[styles.tradeItem, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.tradeInfo}>
                    <Text style={[styles.tradeSymbol, { color: colors.foreground }]}>
                      {item.type === "buy" ? "매수" : "매도"} {item.symbol}
                    </Text>
                    <Text style={[styles.tradeDetails, { color: colors.muted }]}>
                      {item.quantity}주 @ {formatCurrency(item.price)} • {new Date(item.date).toLocaleDateString("ko-KR")}
                    </Text>
                  </View>
                  <Text style={[styles.tradePrice, { color: colors.foreground }]}>{formatCurrency(item.quantity * item.price)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Empty State */}
        {trades.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>거래 기록이 없습니다</Text>
            <Text style={[styles.emptyText, { color: colors.muted, fontSize: 12 }]}>거래를 추가하여 포트폴리오를 시작하세요</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Trade Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modal, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>거래 추가</Text>

            {/* Trade Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: tradeType === "buy" ? colors.success : colors.border,
                  },
                ]}
                onPress={() => setTradeType("buy")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: tradeType === "buy" ? "#ffffff" : colors.foreground },
                  ]}
                >
                  매수
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: tradeType === "sell" ? colors.error : colors.border,
                  },
                ]}
                onPress={() => setTradeType("sell")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: tradeType === "sell" ? "#ffffff" : colors.foreground },
                  ]}
                >
                  매도
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Inputs */}
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="종목 코드 (예: AAPL)"
              placeholderTextColor={colors.muted}
              value={formData.symbol}
              onChangeText={(text) => setFormData({ ...formData, symbol: text })}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="수량"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="가격"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="메모 (선택사항)"
              placeholderTextColor={colors.muted}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary || "#0a7ea4" }]}
              onPress={handleAddTrade}
            >
              <Text style={styles.submitButtonText}>거래 추가</Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.border }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.submitButtonText, { color: colors.foreground }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
