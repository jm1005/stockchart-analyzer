# StockChart Analyzer - Design Plan

## App Concept
주식 차트 분석 보조 앱. 캔들스틱 차트, 지지/저항선 자동 감지, 패턴 인식, 기술적 지표를 통해 차트를 잘 모르는 사람도 한눈에 파악할 수 있도록 돕는다.

---

## Color Palette (Dark-first, Trading App Style)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| background | #F8F9FA | #0D1117 | 메인 배경 |
| surface | #FFFFFF | #161B22 | 카드/패널 |
| foreground | #1A1A2E | #E6EDF3 | 주 텍스트 |
| muted | #6E7681 | #8B949E | 보조 텍스트 |
| primary | #2563EB | #3B82F6 | 강조/버튼 |
| border | #D0D7DE | #30363D | 구분선 |
| bullish | #16A34A | #22C55E | 상승 캔들 |
| bearish | #DC2626 | #EF4444 | 하락 캔들 |
| support | #F59E0B | #FBBF24 | 지지선 |
| resistance | #8B5CF6 | #A78BFA | 저항선 |
| pattern | #06B6D4 | #22D3EE | 패턴 표시 |

---

## Screen List

### 1. Home (홈) - `app/(tabs)/index.tsx`
- 즐겨찾기 종목 리스트 (FlatList)
- 각 종목 카드: 종목명, 현재가, 등락률, 미니 스파크라인
- 검색 바 (상단)
- 시장 요약 (코스피/코스닥/나스닥 지수)

### 2. Search (검색) - `app/(tabs)/search.tsx`
- 종목 검색 (한국: 종목코드/이름, 미국: 티커/이름)
- 검색 결과 리스트
- 최근 검색 기록

### 3. Chart Detail (차트 상세) - `app/chart/[symbol].tsx`
- 캔들스틱 차트 (메인, 전체 화면)
- 기간 선택 탭: 1일/1주/1개월/3개월/6개월/1년
- 지지선/저항선 수평 라인 오버레이
- 패턴 인식 결과 배지/오버레이
- 기술적 지표 토글 패널 (MA5/20/60, RSI, MACD, 볼린저밴드)
- OHLCV 정보 표시 (터치 시)
- 패턴 설명 카드 (하단 슬라이드업)

### 4. Analysis (분석) - `app/(tabs)/analysis.tsx`
- 현재 차트의 종합 분석 요약
- 감지된 패턴 목록
- 지지/저항 레벨 목록
- 기술적 지표 신호 (매수/매도/중립)

### 5. Watchlist (관심종목) - `app/(tabs)/watchlist.tsx`
- 관심종목 추가/삭제
- 정렬 (등락률, 거래량, 이름)
- 그룹 관리

---

## Key User Flows

### Flow 1: 종목 검색 → 차트 분석
1. 홈 화면 검색 바 탭
2. 종목명 또는 코드 입력 (예: "삼성전자" 또는 "005930")
3. 검색 결과에서 종목 선택
4. 차트 상세 화면으로 이동
5. 캔들스틱 차트 + 지지/저항선 자동 표시
6. 패턴 감지 배지 확인
7. 하단 분석 카드 탭 → 상세 설명

### Flow 2: 관심종목 추가
1. 차트 상세 화면에서 ★ 버튼 탭
2. 관심종목 탭에서 확인
3. 홈 화면 카드에 표시

### Flow 3: 기술적 지표 토글
1. 차트 화면에서 "지표" 버튼 탭
2. 하단 시트에서 원하는 지표 선택
3. 차트에 오버레이로 표시

---

## Chart Detail Layout (Portrait 9:16)

```
┌─────────────────────────────┐
│ [←] 삼성전자 005930   [★] [⋯] │  ← Header (56pt)
│ ₩71,200  +1.2% (+₩840      │  ← Price Info (48pt)
├─────────────────────────────┤
│ [1D][1W][1M][3M][6M][1Y]   │  ← Period Tabs (36pt)
├─────────────────────────────┤
│                             │
│   CANDLESTICK CHART         │  ← Chart Area (300pt)
│   + Support/Resistance Lines│
│   + Pattern Overlays        │
│                             │
├─────────────────────────────┤
│ [MA][RSI][MACD][BB] 지표토글 │  ← Indicator Toggle (40pt)
├─────────────────────────────┤
│   Sub-indicator Panel       │  ← RSI/MACD (120pt)
│   (RSI or MACD)             │
├─────────────────────────────┤
│ 📊 감지된 패턴: 쌍바닥 형성 중 │  ← Pattern Card (auto)
│ 🎯 지지: 70,000 / 저항: 73,000│
└─────────────────────────────┘
```

---

## Technical Architecture

- **차트 렌더링**: react-native-svg (커스텀 캔들스틱) + react-native-wagmi-charts
- **데이터 소스**: Yahoo Finance API (yfinance 방식, 서버 프록시)
- **상태 관리**: TanStack Query (서버 데이터) + AsyncStorage (즐겨찾기)
- **애니메이션**: react-native-reanimated 4.x
- **지지/저항선**: 피벗 포인트 알고리즘 + 로컬 극값 감지
- **패턴 인식**: 커스텀 알고리즘 (피크/밸리 기반)
