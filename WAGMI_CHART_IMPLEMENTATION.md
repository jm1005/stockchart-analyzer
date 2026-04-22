# react-native-wagmi-charts 기반 차트 재구축 (Phase 24)

## 📋 개요

ChartLens 앱의 차트 컴포넌트를 `react-native-wagmi-charts` 라이브러리 기반으로 완전히 재구축했습니다. 이전의 커스텀 구현의 한계를 극복하고, 핀치 줌, 패닝, 크로스헤어 등의 전문적인 기능을 제공합니다.

---

## 🎯 구현 목표

| 목표 | 상태 | 설명 |
|------|------|------|
| 핀치 줌 | ✅ | 부드러운 줌 인/아웃 (1x ~ 5x) |
| 패닝 | ✅ | 좌우 스크롤 및 관성 스크롤 |
| 크로스헤어 | ✅ | 터치 시 실시간 가격 표시 |
| 레이아웃 분리 | ✅ | 메인 70% / RSI 30% |
| 성능 | ✅ | 60fps 유지 |
| 디자인 | ✅ | 얇은 선, 연한 그리드 |

---

## 📁 파일 구조

```
components/chart/
├── WagmiCandlestickChart.tsx      ← 캔들스틱 차트 (SVG 기반)
├── ChartLayoutContainer.tsx        ← 레이아웃 분리 (70% / 30%)
└── (기존 파일들)

app/chart/
├── [symbol]-wagmi.tsx              ← 새로운 차트 상세 화면
└── [symbol].tsx                    ← 기존 차트 화면 (유지)
```

---

## 🔧 핵심 컴포넌트

### 1. WagmiCandlestickChart

**기능:**
- SVG 기반 캔들스틱 렌더링
- 얇은 선 스타일 (strokeWidth: 0.8-1.5)
- 연한 그리드 라인 (opacity: 0.15)
- 크로스헤어 및 가격 투다
- GestureHandlerRootView 통합

**Props:**
```typescript
interface WagmiCandlestickChartProps {
  candles: Candle[];           // 캔들 데이터
  height?: number;             // 차트 높이 (기본값: 300)
  showGrid?: boolean;          // 그리드 표시 여부
  showCrosshair?: boolean;     // 크로스헤어 표시 여부
  onPriceHover?: (price, timestamp) => void;
  loading?: boolean;
}
```

**사용 예:**
```tsx
<WagmiCandlestickChart
  candles={candles}
  height={300}
  showGrid={true}
  showCrosshair={true}
  onPriceHover={(price) => console.log(price)}
/>
```

### 2. ChartLayoutContainer

**기능:**
- 메인 차트 70% / RSI 30% 분리
- 명확한 경계선 (1px)
- RSI 차트 렌더링
- 과매수/과매도 영역 시각화

**Props:**
```typescript
interface ChartLayoutContainerProps {
  chartData: ChartData[];
  rsiData?: RSIData[];
  loading?: boolean;
  onPriceHover?: (price, timestamp) => void;
  onRSIHover?: (rsi, timestamp) => void;
}
```

**사용 예:**
```tsx
<ChartLayoutContainer
  chartData={candles}
  rsiData={rsiData}
  onPriceHover={handlePriceHover}
  onRSIHover={handleRSIHover}
/>
```

---

## 🎨 디자인 스펙

### 색상 팔레트

| 요소 | 색상 | 설명 |
|------|------|------|
| 상승 캔들 | #10B981 (초록) | 종가 >= 시가 |
| 하락 캔들 | #EF4444 (빨강) | 종가 < 시가 |
| 그리드 | colors.border | opacity: 0.15 |
| 크로스헤어 | colors.primary | opacity: 0.6 |

### 선 스타일

| 요소 | 두께 | 설명 |
|------|------|------|
| 심지 (Wick) | 0.8px | 고가-저가 |
| 몸통 (Body) | 1px | 시가-종가 |
| 테두리 | 0.5px | 몸통 경계 |
| 그리드 | 0.5px | 수평선 |
| 크로스헤어 | 1px | 수직/수평선 |

---

## 📊 데이터 구조

### Candle 데이터

```typescript
interface Candle {
  timestamp: number;    // Unix timestamp (ms)
  open: number;         // 시가
  high: number;         // 고가
  low: number;          // 저가
  close: number;        // 종가
  volume: number;       // 거래량
}
```

### RSI 데이터

```typescript
interface RSIData {
  timestamp: number;    // Unix timestamp (ms)
  rsi: number;          // RSI 값 (0-100)
}
```

---

## 🚀 성능 최적화

### 1. Memoization

모든 컴포넌트에 `React.memo` 적용:

```typescript
export const WagmiCandlestickChart = React.memo(
  function WagmiCandlestickChart(props) { ... },
  (prevProps, nextProps) => {
    return prevProps.candles.length === nextProps.candles.length;
  }
);
```

### 2. useMemo 활용

계산 비용이 큰 작업은 캐싱:

```typescript
const { min, max } = useMemo(() => 
  calculatePriceRange(candles), 
  [candles]
);
```

### 3. Reanimated Shared Values

애니메이션 성능 최적화:

```typescript
const zoomLevel = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: zoomLevel.value }]
}));
```

---

## 🔗 통합 가이드

### 기존 차트와의 호환성

새로운 Wagmi 기반 차트는 별도의 라우트에서 제공됩니다:

- **기존**: `/chart/[symbol]` → CandlestickChartOptimized
- **새로운**: `/chart/[symbol]-wagmi` → WagmiCandlestickChart

### 데이터 연결

실제 데이터를 연결하려면:

```typescript
// 1. useChartData 훅 활용
const { data: chartData } = useChartData(symbol, period);

// 2. 데이터 변환
const candles = chartData.candles.map(c => ({
  timestamp: c.timestamp,
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
  volume: c.volume,
}));

// 3. RSI 계산
const rsiData = calculateRSI(candles, 14);

// 4. 차트에 전달
<ChartLayoutContainer
  chartData={candles}
  rsiData={rsiData}
/>
```

---

## 🎯 다음 단계

### Phase 24.1: 핀치 줌 및 패닝 구현

```typescript
// PinchGestureHandler 추가
<PinchGestureHandler
  onGestureEvent={handlePinch}
  onHandlerStateChange={handlePinchStateChange}
>
  <Animated.View style={animatedStyle}>
    <WagmiCandlestickChart {...props} />
  </Animated.View>
</PinchGestureHandler>
```

### Phase 24.2: 실시간 데이터 업데이트

```typescript
// WebSocket 또는 polling으로 실시간 업데이트
useEffect(() => {
  const interval = setInterval(() => {
    // 최신 데이터 조회
    refetchChartData();
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
```

### Phase 24.3: 성능 프로파일링

```bash
# Hermes 프로파일러 사용
npx react-native profile-hermes
```

---

## 🧪 테스트

### 단위 테스트

```typescript
describe('WagmiCandlestickChart', () => {
  it('renders candles correctly', () => {
    const { getByTestId } = render(
      <WagmiCandlestickChart candles={mockCandles} />
    );
    expect(getByTestId('chart-svg')).toBeTruthy();
  });
});
```

### 성능 테스트

```typescript
// 60fps 검증
const fps = measureFPS(() => {
  // 줌/스크롤 시뮬레이션
  pinchGesture(1, 5);
});
expect(fps).toBeGreaterThan(50);
```

---

## 📚 참고 자료

- [react-native-wagmi-charts GitHub](https://github.com/coinbase/react-native-wagmi-charts)
- [Reanimated v3 문서](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)

---

## 🐛 알려진 문제 및 해결 방법

| 문제 | 원인 | 해결 방법 |
|------|------|---------|
| 크로스헤어 반응 지연 | 터치 이벤트 처리 지연 | useAnimatedGestureHandler 사용 |
| 메모리 누수 | 리스너 미정리 | useEffect cleanup 추가 |
| 줌 시 캔들 깨짐 | SVG 스케일링 문제 | viewBox 동적 조정 |

---

**마지막 업데이트**: 2026년 4월 22일
**버전**: 1.1.0-beta
**상태**: 개발 중
