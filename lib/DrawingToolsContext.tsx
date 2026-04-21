import React, { createContext, useContext, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DrawingState,
  DrawingToolsContextType,
  DrawingToolType,
  Point,
  DrawingObject,
  TrendLine,
  FibonacciRetracement,
  HorizontalLine,
  VerticalLine,
  DRAWING_COLORS,
  DEFAULT_STROKE_WIDTH,
  FIBONACCI_LEVELS,
  calculateFibonacciPrice,
  generateId,
} from "@/shared/drawingTools";

const DrawingToolsContext = createContext<DrawingToolsContextType | undefined>(undefined);

export function DrawingToolsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DrawingState>({
    isDrawing: false,
    currentTool: "none",
    drawnObjects: [],
    currentStartPoint: null,
    selectedObjectId: null,
  });

  const setCurrentTool = useCallback((tool: DrawingToolType) => {
    setState((prev) => ({
      ...prev,
      currentTool: tool,
      isDrawing: false,
      currentStartPoint: null,
    }));
  }, []);

  const startDrawing = useCallback((point: Point) => {
    if (state.currentTool === "none") return;

    setState((prev) => ({
      ...prev,
      isDrawing: true,
      currentStartPoint: point,
    }));
  }, [state.currentTool]);

  const endDrawing = useCallback(
    (point: Point) => {
      if (!state.isDrawing || !state.currentStartPoint || state.currentTool === "none") {
        return;
      }

      let newObject: DrawingObject | null = null;

      switch (state.currentTool) {
        case "trendline":
          newObject = {
            id: generateId(),
            type: "trendline",
            startPoint: state.currentStartPoint,
            endPoint: point,
            color: DRAWING_COLORS.trendline,
            strokeWidth: DEFAULT_STROKE_WIDTH,
            createdAt: Date.now(),
          } as TrendLine;
          break;

        case "fibonacci":
          // 높은 점과 낮은 점 구분
          const highPoint = state.currentStartPoint.price! >= point.price! 
            ? state.currentStartPoint 
            : point;
          const lowPoint = state.currentStartPoint.price! >= point.price! 
            ? point 
            : state.currentStartPoint;

          newObject = {
            id: generateId(),
            type: "fibonacci",
            highPoint,
            lowPoint,
            color: DRAWING_COLORS.fibonacci,
            strokeWidth: DEFAULT_STROKE_WIDTH,
            levels: FIBONACCI_LEVELS,
            createdAt: Date.now(),
          } as FibonacciRetracement;
          break;

        case "horizontal":
          newObject = {
            id: generateId(),
            type: "horizontal",
            price: point.price || 0,
            color: DRAWING_COLORS.horizontal,
            strokeWidth: DEFAULT_STROKE_WIDTH,
            createdAt: Date.now(),
          } as HorizontalLine;
          break;

        case "vertical":
          newObject = {
            id: generateId(),
            type: "vertical",
            timestamp: point.timestamp || Date.now(),
            color: DRAWING_COLORS.vertical,
            strokeWidth: DEFAULT_STROKE_WIDTH,
            createdAt: Date.now(),
          } as VerticalLine;
          break;
      }

      if (newObject) {
        setState((prev) => ({
          ...prev,
          drawnObjects: [...prev.drawnObjects, newObject!],
          isDrawing: false,
          currentStartPoint: null,
        }));
      }
    },
    [state.isDrawing, state.currentStartPoint, state.currentTool]
  );

  const cancelDrawing = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDrawing: false,
      currentStartPoint: null,
    }));
  }, []);

  const deleteObject = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      drawnObjects: prev.drawnObjects.filter((obj) => obj.id !== id),
      selectedObjectId: prev.selectedObjectId === id ? null : prev.selectedObjectId,
    }));
  }, []);

  const deleteAllObjects = useCallback(() => {
    setState((prev) => ({
      ...prev,
      drawnObjects: [],
      selectedObjectId: null,
    }));
  }, []);

  const selectObject = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedObjectId: id,
    }));
  }, []);

  const saveDrawings = useCallback(async (symbol: string) => {
    try {
      const key = `drawings_${symbol}`;
      await AsyncStorage.setItem(key, JSON.stringify(state.drawnObjects));
    } catch (error) {
      console.error("Failed to save drawings:", error);
    }
  }, [state.drawnObjects]);

  const loadDrawings = useCallback(async (symbol: string) => {
    try {
      const key = `drawings_${symbol}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const objects = JSON.parse(data) as DrawingObject[];
        setState((prev) => ({
          ...prev,
          drawnObjects: objects,
        }));
      }
    } catch (error) {
      console.error("Failed to load drawings:", error);
    }
  }, []);

  const clearDrawings = useCallback(() => {
    setState((prev) => ({
      ...prev,
      drawnObjects: [],
      selectedObjectId: null,
    }));
  }, []);

  const value: DrawingToolsContextType = {
    state,
    setCurrentTool,
    startDrawing,
    endDrawing,
    cancelDrawing,
    deleteObject,
    deleteAllObjects,
    selectObject,
    saveDrawings,
    loadDrawings,
    clearDrawings,
  };

  return (
    <DrawingToolsContext.Provider value={value}>
      {children}
    </DrawingToolsContext.Provider>
  );
}

export function useDrawingTools(): DrawingToolsContextType {
  const context = useContext(DrawingToolsContext);
  if (!context) {
    throw new Error("useDrawingTools must be used within DrawingToolsProvider");
  }
  return context;
}
