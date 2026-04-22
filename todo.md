# ChartLens - TODO

## Phase 1: 기반 설정
- [x] 앱 로고 생성 (주식/차트 테마)
- [x] 테마 색상 설정 (다크 모드 우선, 트레이딩 앱 스타일)
- [x] 탭 네비게이션 구성 (홈, 검색, 관심종목)
- [x] 아이콘 매핑 추가

## Phase 2: 데이터 레이어
- [x] Yahoo Finance API 서버 프록시 구현
- [x] 주식 검색 API 연동 (한국/미국)
- [x] OHLCV 히스토리 데이터 조회
- [x] 실시간 현재가 조회
- [x] TanStack Query 훅 구성

## Phase 3: 차트 UI
- [x] 캔들스틱 차트 컴포넌트 (SVG 기반 커스텀)
- [x] 기간 선택 탭 (1D/1W/1M/3M/6M/1Y)
- [x] 터치 인터랙션 (크로스헤어, OHLCV 표시)
- [x] 볼륨 바 차트 (하단)
- [ ] 차트 핀치 줌/스크롤

## Phase 4: 지지/저항선
- [x] 로컬 극값(피크/밸리) 감지
- [x] 수평 지지/저항선 오버레이
- [x] 레벨 강도 표시 (터치 횟수 기반)
- [x] 지지/저항 레이블

## Phase 5: 패턴 인식
- [x] 헤드앤숄더 (Head & Shoulders)
- [x] 역헤드앤숄더 (Inverse H&S)
- [x] 쌍봉 (Double Top)
- [x] 쌍바닥 (Double Bottom)
- [x] 컵앤핸들 (Cup & Handle)
- [x] 데드캣 바운스 (Dead Cat Bounce)
- [x] 삼각수렴 (Triangle - 상승/하락)
- [x] 패턴 오버레이 시각화 (차트 상단 마커)
- [x] 패턴 설명 카드 (신뢰도, 예상 방향, 목표가)

## Phase 6: 기술적 지표
- [x] 이동평균선 MA (5/20/60일)
- [x] RSI (14일) 서브차트
- [x] MACD (12/26/9) 서브차트
- [x] 볼린저밴드 (20일, 2σ)
- [x] 지표 토글 UI

## Phase 7: 홈 & 검색
- [x] 홈 화면 - 관심종목 카드 리스트
- [x] 시장 지수 요약 (코스피/코스닥/나스닥/S&P500/DOW)
- [x] 검색 화면 - 실시간 검색
- [x] 최근 검색 기록
- [x] 관심종목 추가/삭제

## Phase 8: 분석 화면
- [x] 종합 분석 요약 카드 (매수/매도/중립 신호)
- [x] 감지 패턴 목록
- [x] 지지/저항 레벨 표
- [x] 기술적 지표 신호 (매수/매도/중립)
- [x] 신호 강도 표시

## Phase 9: 완성도
- [x] 다크/라이트 모드 지원
- [x] 에러 처리 및 빈 상태 UI
- [x] 햅틱 피드백
- [x] 앱 아이콘 및 스플래시 스크린
- [ ] 로딩 스켈레톤 UI
- [ ] 재무제표 탭 (향후)
- [ ] 뉴스 피드 (향후)
- [ ] 알림 기능 (향후)

## Phase 10: 차트 줌 인/아웃 기능 (v1.0.0 기반 UX/UI 고정)
- [x] 줌 레벨 상태 관리 (1x ~ 5x)
- [x] 캔들스틱 차트에 줌 적용
- [x] 동적 캔들 개수 조정
- [x] 스크롤 컨트롤 (◀/▶ 버튼)
- [x] 줌 UI 컨트롤 (+ / - 버튼)
- [x] 리셋 버튼 추가
- [x] 스크롤 인디케이터 표시

## Phase 11: 핀치 제스처 줌 기능 (모바일 사용성 개선)
- [x] PinchGestureHandler 통합
- [x] 핀치 시작/이동/종료 이벤트 처리
- [x] 핀치 거리 계산 및 줌 레벨 업데이트
- [x] 더블탭 줌 리셋 기능
- [x] 버튼 기반 줌과 핀치 제스처 동시 지원
- [x] 핀치 제스처 테스트 (13개 테스트 추가)


## Phase 19: v1.0.6 차트 렌더링 버그 수정 및 핀치 줌 완전 재설계
- [x] CandlestickChartOptimized 새로운 컴포넌트 작성
- [x] 동적 캔들 너비 계산 (화면 너비 / 표시 캔들 수)
- [x] 어닝(E) 아이콘을 X축 하단에 고정 레이아웃
- [x] PinchGestureHandler 기반 핀치 줌 (1x ~ 5x)
- [x] PanGestureHandler 기반 패닝 (좌우 스크롤)
- [x] Y축 동적 스케일 (화면 범위 최고/최저가 기반)
- [x] Reanimated Shared Value로 60fps 최적화
- [x] 관성 스크롤 및 바운더리 처리
- [x] 차트 페이지 통합 (CandlestickChartOptimized 적용)
- [x] 47개 테스트 모두 통과


#### Phase 20: 디자인 토늨매너 유지 + 구조 개선 (레이아웃 유연화, 제스처 레이어, 성능 최적화)
- [x] 레이아웃 유연화: 동적 캠들 롍이 계산 (화면 롍이 / 표시 개수)
- [x] 캠들 결쳐지는 간격 방지 (UI 레벨)
- [x] 제스처 레이어 분리: PinchGestureHandler/PanGestureHandler 전체 덤및
- [x] 다른 버튼과 터치 간섬 방지
- [x] 어닝 아이콘 최적화: 얖은 Event Lane 공간 확보 (20px)
- [x] Floating Tooltip 테마 일치 (다크/라이트 모드)
- [x] Reanimated Shared Value 적용
- [x] Memoization으로 UI 리렌더링 범위 제한 (ChartSvgRenderer, EventLaneRenderer)
- [x] 60fps 성능 유지 검증
- [x] 전체 통합 테스트 (47개 테스트 모두 통과)


## Phase 21: 차트 그리기 도구 (추세선, 피보나치, 수평선)
- [x] 그리기 도구 데이터 구조 정의 (drawingTools.ts: TrendLine, FibonacciRetracement, HorizontalLine, VerticalLine)
- [x] 그리기 상태 관리 (DrawingToolsContext.tsx: isDrawing, currentTool, drawnObjects)
- [x] 그리기 모드 선택 UI (DrawingToolsToolbar.tsx: 추세선, 피보나치, 수평선, 수직선, 해제, 모두 삭제)
- [x] 도구 모드 전환 기능 (setCurrentTool)
- [x] 추세선 그리기 (2점 터치로 직선 그리기)
- [x] 피보나치 되돌림 그리기 (2점 터치로 7개 레벨 표시)
- [x] 수평선 그리기 (1점 터치로 수평선)
- [x] 수직선 그리기 (타임스탬프 기반)
- [x] 그림 저장 (AsyncStorage: saveDrawings)
- [x] 그림 로드 (종목별 저장된 그림 불러오기: loadDrawings)
- [x] 그림 삭제 (개별/전체 삭제: deleteObject, deleteAllObjects)
- [x] 그리기 도구 렌더러 (DrawingToolsRenderer.tsx)
- [x] 그리기 도구 테스트 (14개 테스트 추가, 총 61개 테스트 통과)


## Phase 22: 차트 레이아웃 비율 및 Y축 오토 스케일링 (v1.0.7) ✅
- [x] 메인 차트 영역 70-75% 고정
- [x] RSI 보조 지표 영역 25-30% 고정
- [x] 구분선 최소화 (얇은 선만)
- [x] 불필요한 여백/패딩 제거 (PADDING 최소화)
- [x] Y축 오토 스케일링 (현재 화면 데이터 기준)
- [x] 데이터 상하 마진 최소화 (80-90% 높이 활용)
- [x] 어닝 아이콘 메인 차트 하단 가장자리 배치
- [x] 줌/스크롤 시 Y축 실시간 업데이트
- [x] 전체 테스트 및 검증 (61개 테스트 통과)
- [x] v1.0.7 체크포인트 준비

## Phase 23: 투자 심리 게이지 카드 정제 및 단순화 (v1.0.8) ✅
- [x] SentimentGaugeCard 컴포넌트 정제 (범례 제거)
- [x] 한 줄 요약 텍스트 추가
- [x] 카드 내부 리스트 제거 (지지/저항, 패턴)
- [x] AnalysisScreenContent 레이아웃 재구성
- [x] 게이지 카드 상단 배치, 리스트 중단 분리
- [x] 테스트 업데이트 (모든 테스트 통과)
- [x] 최종 검증 및 체크포인트 준비

## Phase 24: 크로스헤어 및 실시간 지표 표시 (v1.0.9)
- [ ] 터치 시 크로스헤어 표시 (수직선 + 수평선)
- [ ] 실시간 OHLCV 값 표시
- [ ] 실시간 MA 값 표시
- [ ] 실시간 RSI 값 표시
- [ ] 실시간 MACD 값 표시
- [ ] 실시간 볼린저밴드 값 표시
- [ ] Floating Tooltip 개선 (모든 지표 통합)
- [ ] 터치 해제 시 크로스헤어 숨김

## Phase 25: 성능 최적화 및 최종 검증 (v1.1.0)
- [ ] 60fps 성능 검증 (프로파일링)
- [ ] 메모리 누수 확인
- [ ] 배터리 소비 최적화
- [ ] 다양한 기기에서 테스트 (iPhone/Android)
- [ ] 다양한 해상도 테스트 (SE/Pro Max/Tablet)
- [ ] 네트워크 지연 시뮬레이션
- [ ] 오프라인 모드 테스트
- [ ] 최종 체크포인트 저장
