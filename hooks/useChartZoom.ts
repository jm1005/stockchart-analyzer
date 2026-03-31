import { useState, useCallback, useRef, useEffect } from "react";

interface ZoomState {
  scale: number;
  offsetX: number;
  maxOffsetX: number;
}

export function useChartZoom(totalCandles: number, chartWidth: number) {
  const [zoom, setZoom] = useState<ZoomState>({
    scale: 1,
    offsetX: 0,
    maxOffsetX: 0,
  });

  const lastTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const doubleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최대 오프셋 계산 (줌 레벨에 따라)
  const maxCandlesVisible = Math.max(10, Math.floor(60 / zoom.scale));
  const maxOffset = Math.max(0, totalCandles - maxCandlesVisible);

  // 줌 레벨 변경 (1x ~ 5x)
  const handleZoomChange = useCallback((newScale: number) => {
    const clampedScale = Math.max(1, Math.min(5, newScale));
    setZoom((prev) => {
      const newMaxOffset = Math.max(0, totalCandles - Math.max(10, Math.floor(60 / clampedScale)));
      const newOffset = Math.min(prev.offsetX, newMaxOffset);
      return {
        scale: clampedScale,
        offsetX: newOffset,
        maxOffsetX: newMaxOffset,
      };
    });
  }, [totalCandles]);

  // 패닝 (좌우 스크롤)
  const handlePan = useCallback((deltaX: number) => {
    setZoom((prev) => {
      let newOffsetX = prev.offsetX - deltaX / chartWidth * (totalCandles - 1);
      newOffsetX = Math.max(0, Math.min(prev.maxOffsetX, newOffsetX));
      return { ...prev, offsetX: newOffsetX };
    });
  }, [chartWidth, totalCandles]);

  // 더블탭으로 줌 리셋
  const handleDoubleTap = useCallback(() => {
    setZoom({ scale: 1, offsetX: 0, maxOffsetX: 0 });
  }, []);

  // 터치 이벤트 감지 (더블탭)
  const handleTouchEvent = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      const lastTouch = lastTouchRef.current;

      if (
        lastTouch &&
        now - lastTouch.time < 300 &&
        Math.abs(x - lastTouch.x) < 50 &&
        Math.abs(y - lastTouch.y) < 50
      ) {
        // 더블탭 감지
        if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
        handleDoubleTap();
        lastTouchRef.current = null;
      } else {
        lastTouchRef.current = { x, y, time: now };
        if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
        doubleTapTimeoutRef.current = setTimeout(() => {
          lastTouchRef.current = null;
        }, 300);
      }
    },
    [handleDoubleTap]
  );

  useEffect(() => {
    return () => {
      if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
    };
  }, []);

  return {
    zoom,
    handleZoomChange,
    handlePan,
    handleDoubleTap,
    handleTouchEvent,
    maxCandlesVisible,
  };
}
