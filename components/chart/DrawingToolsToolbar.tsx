import React from "react";
import { View, TouchableOpacity, Text, ScrollView } from "react-native";
import { useDrawingTools } from "@/lib/DrawingToolsContext";
import { DrawingToolType } from "@/shared/drawingTools";
import { useColors } from "@/hooks/use-colors";

const TOOLS: Array<{ id: DrawingToolType; label: string; icon: string }> = [
  { id: "trendline", label: "추세선", icon: "📈" },
  { id: "fibonacci", label: "피보나치", icon: "🔢" },
  { id: "horizontal", label: "수평선", icon: "━" },
  { id: "vertical", label: "수직선", icon: "┃" },
];

interface DrawingToolsToolbarProps {
  visible: boolean;
  onClose: () => void;
}

export function DrawingToolsToolbar({ visible, onClose }: DrawingToolsToolbarProps) {
  const { state, setCurrentTool, deleteAllObjects } = useDrawingTools();
  const colors = useColors();

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        zIndex: 100,
      }}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            onPress={() => setCurrentTool(tool.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginHorizontal: 4,
              borderRadius: 8,
              backgroundColor:
                state.currentTool === tool.id ? colors.primary : colors.background,
              borderWidth: 1,
              borderColor:
                state.currentTool === tool.id ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color:
                  state.currentTool === tool.id ? colors.background : colors.foreground,
                textAlign: "center",
              }}
            >
              {tool.icon} {tool.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* 도구 해제 버튼 */}
        <TouchableOpacity
          onPress={() => setCurrentTool("none")}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginHorizontal: 4,
            borderRadius: 8,
            backgroundColor: state.currentTool === "none" ? colors.error : colors.background,
            borderWidth: 1,
            borderColor: state.currentTool === "none" ? colors.error : colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: state.currentTool === "none" ? colors.background : colors.foreground,
            }}
          >
            ✕ 해제
          </Text>
        </TouchableOpacity>

        {/* 전체 삭제 버튼 */}
        <TouchableOpacity
          onPress={deleteAllObjects}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginHorizontal: 4,
            borderRadius: 8,
            backgroundColor: colors.warning,
            borderWidth: 1,
            borderColor: colors.warning,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.background,
            }}
          >
            🗑️ 모두 삭제
          </Text>
        </TouchableOpacity>

        {/* 닫기 버튼 */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginHorizontal: 4,
            borderRadius: 8,
            backgroundColor: colors.muted,
            borderWidth: 1,
            borderColor: colors.muted,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.background,
            }}
          >
            닫기
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 현재 도구 상태 표시 */}
      <View
        style={{
          marginTop: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          backgroundColor: colors.background,
          borderRadius: 4,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            color: colors.muted,
            textAlign: "center",
          }}
        >
          {state.currentTool === "none"
            ? "도구를 선택하세요"
            : `${TOOLS.find((t) => t.id === state.currentTool)?.label} 모드 - 차트를 터치하여 그리기`}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: colors.muted,
            textAlign: "center",
            marginTop: 2,
          }}
        >
          그린 도구: {state.drawnObjects.length}개
        </Text>
      </View>
    </View>
  );
}
