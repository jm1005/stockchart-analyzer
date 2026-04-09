import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getPatternEducation, getRiskLevelColor } from "@/lib/patternEducation";
import type { PatternType } from "@/shared/stockTypes";

interface PatternTooltipProps {
  patternType: PatternType;
  showIcon?: boolean;
}

/**
 * 패턴 교육 툴팁 컴포넌트
 * 패턴 카드에서 정보 아이콘을 누르면 교육 콘텐츠를 표시합니다.
 */
export function PatternTooltip({ patternType, showIcon = true }: PatternTooltipProps) {
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);
  const education = getPatternEducation(patternType);

  if (!education) return null;

  const riskColor = getRiskLevelColor(education.riskLevel);
  const riskLabel = {
    low: "낮음",
    medium: "중간",
    high: "높음",
  }[education.riskLevel];

  return (
    <>
      {showIcon && (
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[styles.infoIcon, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.infoIconText, { color: colors.primary }]}>?</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.background + "CC" }]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {education.title}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.closeButton, { color: colors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 요약 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>핵심 요약</Text>
              <Text style={[styles.sectionContent, { color: colors.muted }]}>
                {education.summary}
              </Text>
            </View>

            {/* 심리적 설명 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                시장 심리
              </Text>
              <Text style={[styles.sectionContent, { color: colors.muted }]}>
                {education.psychology}
              </Text>
            </View>

            {/* 거래 팁 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                💡 거래 팁
              </Text>
              <Text style={[styles.sectionContent, { color: colors.muted }]}>
                {education.tradingTip}
              </Text>
            </View>

            {/* 통계 정보 */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>위험도</Text>
                <Text style={[styles.statValue, { color: riskColor }]}>{riskLabel}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>성공률</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {education.successRate}%
                </Text>
              </View>
            </View>

            {/* 닫기 버튼 */}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={[styles.closeButtonFull, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.closeButtonText, { color: colors.background }]}>
                닫기
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  infoIconText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  closeButton: {
    fontSize: 20,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 12,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  closeButtonFull: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
