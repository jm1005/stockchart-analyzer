# 분석 탭 (Analysis Screen) - 구현 가이드

## 📋 개요

ChartLens 앱의 분석 탭에 **AI 종합 투자 심리 게이지** 컴포넌트를 통합했습니다. 이 가이드는 구현된 컴포넌트의 구조, 사용법, 성능 최적화 방법을 설명합니다.

---

## 🏗️ 컴포넌트 구조

### 1. SentimentGaugeCard (AI 종합 투자 심리 게이지)

**위치**: `components/analysis/SentimentGaugeCard.tsx`

**기능**:
- SVG 반원 게이지 (180도)
- 5개 섹션으로 시각적 구분
- 그라데이션 색상 (매수 → 중립 → 매도)
- 물리 연산 기반 바늘 애니메이션 (withSpring)
- 실시간 업데이트 인디케이터 (LIVE 뱃지)
- 투자 등급 캡슐 (Chip)

**Props**:
```typescript
interface SentimentGaugeCardProps {
  score: number;              // 0-100
  isLive?: boolean;           // 기본값: true
  onScoreChange?: (score: number) => void;
}
```

**사용 예제**:
```tsx
<SentimentGaugeCard
  score={75}
  isLive={true}
  onScoreChange={(score) => console.log(score)}
/>
```

### 2. AnalysisScreenContent (분석 화면 통합 레이아웃)

**위치**: `components/analysis/AnalysisScreenContent.tsx`

**기능**:
- SentimentGaugeCard 상단 배치
- 감지된 패턴 리스트 (FlatList)
- 지지/저항 레벨 리스트 (FlatList)
- 성능 최적화 (Memoization)
- ScrollView 기반 레이아웃

**Props**:
```typescript
interface AnalysisScreenContentProps {
  // 게이지 데이터
  sentimentScore: number;
  isLiveUpdate?: boolean;

  // 패턴 데이터
  patterns: Array<{
    id: string;
    name: string;
    confidence: number;
    description: string;
  }>;
  patternsLoading?: boolean;

  // 지지/저항 데이터
  supportResistanceLevels: Array<{
    id: string;
    type: "support" | "resistance";
    price: number;
    strength: number; // 0-1
  }>;
  srLoading?: boolean;

  currency?: string;
  onSentimentChange?: (score: number) => void;
}
```

**사용 예제**:
```tsx
<AnalysisScreenContent
  sentimentScore={75}
  isLiveUpdate={true}
  patterns={[
    {
      id: "pattern-1",
      name: "Cup & Handle",
      confidence: 0.85,
      description: "강한 상승 신호"
    }
  ]}
  supportResistanceLevels={[
    {
      id: "sr-1",
      type: "support",
      price: 100.50,
      strength: 0.9
    }
  ]}
  currency="USD"
/>
```

### 3. AnalysisScreen (분석 탭 화면)

**위치**: `app/(tabs)/analysis.tsx`

**기능**:
- 차트 데이터 조회 (TRPC)
- 기술적 지표 계산
- 패턴 감지
- 지지/저항 레벨 계산
- 종합 신호 계산
- 점수 변환 (신호 → 0-100점)

---

## 🎨 UI 디자인 스펙

### 게이지 카드 레이아웃

```
┌─────────────────────────────────┐
│ AI 종합 분석 점수    🟢 LIVE    │  ← 헤더
├─────────────────────────────────┤
│                                 │
│         SVG 반원 게이지          │  ← 게이지 (280x160px)
│         바늘 애니메이션          │
│                                 │
│            점수: 75             │
│                                 │
├─────────────────────────────────┤
│         강력 매수 캡슐           │  ← 투자 등급
├─────────────────────────────────┤
│  🔵 강력 매수  ⚫ 중립  🔴 강력 매도  │  ← 범례
└─────────────────────────────────┘
```

### 색상 팔레트

| 범주 | 색상 | 의미 |
|------|------|------|
| 강력 매수 | #0EA5E9 (하늘색) | 80-100점 |
| 매수 | #3B82F6 (파랑) | 60-79점 |
| 중립 | #9CA3AF (회색) | 40-59점 |
| 매도 | #F59E0B (주황) | 20-39점 |
| 강력 매도 | #EF4444 (빨강) | 0-19점 |

### 카드 스타일

- **배경색**: #1E1E1E (다크 모드)
- **테두리**: 1px, 색상: colors.border
- **모서리**: borderRadius: 20
- **패딩**: 16px (상하좌우)
- **마진**: 16px (좌우), 12px (상하)

---

## ⚙️ 게이지 애니메이션 스펙

### 바늘 물리 연산

```typescript
withSpring(score, {
  damping: 8,           // 감쇠 계수 (낮을수록 진동)
  mass: 1,              // 질량
  overshootClamping: false,  // 오버슈트 허용
})
```

### 각도 변환

```
점수 (0-100) → 각도 (-90 ~ 90도)
- 0점: -90도 (좌측 끝, 강력 매도)
- 50점: 0도 (중앙, 중립)
- 100점: 90도 (우측 끝, 강력 매수)
```

### 렌더링 최적화

- **Memoization**: `React.memo` 사용
- **조건부 렌더링**: 점수 변경 시에만 리렌더링
- **분리된 애니메이션**: 게이지 애니메이션이 하단 리스트 렌더링 방해 안 함

---

## 📊 데이터 흐름

```
차트 데이터 (TRPC)
    ↓
기술적 지표 계산 (calculateAllIndicators)
    ↓
패턴 감지 (detectPatterns)
    ↓
지지/저항 감지 (detectSupportResistance)
    ↓
종합 신호 계산 (getOverallSignal)
    ↓
신호 → 점수 변환 (0-100)
    ↓
SentimentGaugeCard 업데이트
```

### 신호 → 점수 변환 로직

```typescript
if (overallSignal.signal === 'buy') {
  baseScore = 70 + Math.random() * 30;  // 70-100점
} else if (overallSignal.signal === 'sell') {
  baseScore = Math.random() * 30;       // 0-30점
} else {
  baseScore = 35 + Math.random() * 30;  // 35-65점
}
```

---

## 🚀 성능 최적화

### 1. Memoization

모든 컴포넌트에 `React.memo` 적용:

```typescript
export const SentimentGaugeCard = React.memo(
  function SentimentGaugeCard(props) { ... },
  (prevProps, nextProps) => {
    return prevProps.score === nextProps.score && 
           prevProps.isLive === nextProps.isLive;
  }
);
```

### 2. FlatList 사용

패턴 리스트와 지지/저항 리스트에 `FlatList` 사용:

```typescript
<FlatList
  data={patterns}
  renderItem={renderPatternItem}
  keyExtractor={patternKeyExtractor}
  scrollEnabled={false}
  nestedScrollEnabled={false}
/>
```

### 3. useMemo 활용

계산 비용이 큰 작업은 `useMemo`로 캐싱:

```typescript
const calculatedSentimentScore = useMemo(() => {
  // 복잡한 계산
}, [dependencies]);
```

### 4. 콜백 최적화

이벤트 핸들러는 `useCallback`으로 메모이제이션:

```typescript
const handleSentimentChange = useCallback((score: number) => {
  setSentimentScore(score);
}, []);
```

---

## 📱 반응형 디자인

### 화면 크기별 조정

| 화면 크기 | 게이지 크기 | 카드 너비 |
|----------|-----------|---------|
| 모바일 (375px) | 280x160px | 343px |
| 태블릿 (768px) | 280x160px | 736px |
| 데스크톱 (1024px) | 280x160px | 992px |

---

## 🔧 커스터마이징

### 게이지 크기 조정

`SentimentGaugeCard.tsx`에서:

```typescript
const GAUGE_SIZE = 280;        // 게이지 크기
const GAUGE_RADIUS = 120;      // 반경
```

### 색상 변경

`INVESTMENT_GRADES` 배열 수정:

```typescript
const INVESTMENT_GRADES: InvestmentGrade[] = [
  {
    label: "강력 매수",
    color: "#10B981",           // 변경 가능
    backgroundColor: "#10B98122",
    scoreRange: [80, 100],
  },
  // ...
];
```

### 애니메이션 조정

`withSpring` 파라미터 수정:

```typescript
withSpring(score, {
  damping: 8,      // 낮을수록 더 진동
  mass: 1,         // 높을수록 더 무거움
})
```

---

## 🧪 테스트

### 단위 테스트 (예시)

```typescript
describe('SentimentGaugeCard', () => {
  it('should render gauge with score', () => {
    const { getByText } = render(
      <SentimentGaugeCard score={75} />
    );
    expect(getByText('75')).toBeTruthy();
  });

  it('should show correct investment grade', () => {
    const { getByText } = render(
      <SentimentGaugeCard score={85} />
    );
    expect(getByText('강력 매수')).toBeTruthy();
  });
});
```

### 통합 테스트

```typescript
describe('AnalysisScreen', () => {
  it('should display sentiment gauge and patterns', () => {
    const { getByText } = render(<AnalysisScreen />);
    expect(getByText('AI 종합 분석 점수')).toBeTruthy();
    expect(getByText('감지된 패턴')).toBeTruthy();
  });
});
```

---

## 📝 주의사항

### 성능

1. **과도한 리렌더링 방지**: Memoization 필수
2. **애니메이션 프레임**: 60fps 유지
3. **메모리 누수**: useEffect 정리 함수 필수

### 접근성

1. **색상 대비**: WCAG AA 표준 준수
2. **터치 영역**: 최소 44x44px
3. **텍스트 크기**: 최소 12pt

### 호환성

1. **React Native**: 0.81+
2. **Reanimated**: v4+
3. **react-native-svg**: 15.0+

---

## 🔗 관련 파일

- `components/analysis/SentimentGaugeCard.tsx` - 게이지 컴포넌트
- `components/analysis/AnalysisScreenContent.tsx` - 레이아웃 통합
- `app/(tabs)/analysis.tsx` - 분석 탭 화면
- `lib/technicalAnalysis.ts` - 기술적 분석 함수

---

## 📚 참고 자료

- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [react-native-svg](https://github.com/react-native-svg/react-native-svg)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

**마지막 업데이트**: 2026년 4월 22일
**버전**: 1.0.0
