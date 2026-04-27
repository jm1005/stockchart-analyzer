import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import CandlestickChart from '@/components/chart/CandlestickChart';

const { width } = Dimensions.get('window');

// --- 한국 주식 검색 보정을 위한 매핑 객체 ---
const symbolMap: Record<string, string> = {
  '삼성전자': '005930.KS',
  '005930': '005930.KS',
  'SK하이닉스': '000660.KS',
  '000660': '000660.KS',
  '카카오': '035720.KS',
  'NAVER': '035420.KS',
  '현대차': '005380.KS',
  '기아': '000270.KS',
  'LG에너지솔루션': '373220.KS',
};

// --- 1. 실제 오픈 API (Yahoo Finance) 데이터 호출 ---
const fetchStockData = async (symbol: string) => {
  try {
    // 매핑된 심볼이 있으면 변환, 없으면 입력된 값 그대로 사용
    const querySymbol = symbolMap[symbol] || symbol;

    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${querySymbol}?interval=1d&range=1y`);
    if (!response.ok) throw new Error('데이터를 불러오지 못했습니다.');
    
    const json = await response.json();
    const result = json.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    return timestamps.map((ts: number, index: number) => ({
      timestamp: ts * 1000,
      open: quotes.open[index],
      high: quotes.high[index],
      low: quotes.low[index],
      close: quotes.close[index],
      volume: quotes.volume[index],
    })).filter((d: any) => d.open !== null && d.close !== null);
  } catch (error) {
    console.error("API Fetch Error:", error);
    return null;
  }
};

// --- 2. 스크린샷 완벽 재현: 반원형 게이지 차트 컴포넌트 ---
const GaugeChart = ({ score }: { score: number }) => {
  const r = 110;
  const cx = width / 2 - 40; 
  const cy = 130;
  const strokeWidth = 16;
  
  const angle = (score / 100) * 180 - 180;
  const needleRad = (angle * Math.PI) / 180;
  const nx = cx + (r - 25) * Math.cos(needleRad);
  const ny = cy + (r - 25) * Math.sin(needleRad);

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={width - 80} height="150" viewBox={`0 0 ${width - 80} 150`}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#3b82f6" />
            <Stop offset="50%" stopColor="#f59e0b" />
            <Stop offset="100%" stopColor="#ef4444" />
          </LinearGradient>
        </Defs>
        <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} strokeLinecap="round" />
        <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="url(#grad)" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${Math.PI * r} ${Math.PI * r}`} strokeDashoffset={0} />
        
        <Line x1={cx - r} y1={cy} x2={cx - r + 8} y2={cy} stroke="#fff" strokeWidth="2" />
        <Line x1={cx} y1={cy - r} x2={cx} y2={cy - r + 8} stroke="#fff" strokeWidth="2" />
        <Line x1={cx + r} y1={cy} x2={cx + r - 8} y2={cy} stroke="#fff" strokeWidth="2" />

        <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
        <Circle cx={nx} cy={ny} r="4" fill="#0ea5e9" />
        <Circle cx={cx} cy={cy} r="8" fill="#1e293b" />
      </Svg>

      <View style={styles.gaugeScoreBox}>
        <Text style={styles.gaugeScoreText}>{score}</Text>
        <View style={styles.gaugeBadge}>
          <Text style={styles.gaugeBadgeText}>강력 매수</Text>
        </View>
      </View>
    </View>
  );
};

// --- 메인 스크린 ---
export default function ChartDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('MA20');
  
  const rawSymbol = params.symbol;
  const targetSymbol = typeof rawSymbol === 'string' 
    ? rawSymbol 
    : (Array.isArray(rawSymbol) ? rawSymbol[0] : '005930.KS');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchStockData(targetSymbol);
      if (data) setChartData(data);
      setLoading(false);
    };
    loadData();
  }, [targetSymbol]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>데이터 로딩 중...</Text>
      </View>
    );
  }

  // 💡 토스 스타일 가격 표시를 위한 계산
  const currentCandle = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const previousCandle = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const isUp = currentCandle && previousCandle ? currentCandle.close >= previousCandle.close : true;
  const changeColor = isUp ? '#ef4444' : '#3b82f6'; // 상승 빨강, 하락 파랑
  const changeSign = isUp ? '+' : '';
  const priceChange = currentCandle && previousCandle ? (currentCandle.close - previousCandle.close).toFixed(2) : '0.00';
  const changePercent = currentCandle && previousCandle ? (((currentCandle.close / previousCandle.close) - 1) * 100).toFixed(2) : '0.00';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>{targetSymbol}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 💡 가격 정보 영역 (토스 감성) */}
        {currentCandle && (
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {currentCandle.close.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Text>
            <View style={styles.changeRow}>
              <Ionicons name={isUp ? "caret-up" : "caret-down"} size={18} color={changeColor} />
              <Text style={[styles.changeText, { color: changeColor }]}>
                {changeSign}{priceChange} ({changeSign}{changePercent}%)
              </Text>
            </View>
          </View>
        )}

        {/* 💡 핀치 줌 차트 영역 */}
        {chartData.length > 0 && (
          <View style={styles.chartWrapper}>
            <CandlestickChart candles={chartData} />
          </View>
        )}

        {/* 1. AI 종합 분석 점수 (게이지) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>AI 종합 분석 점수</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          
          <GaugeChart score={88} />
          
          <Text style={styles.gaugeSubText}>매수 신호 강화, 2개 패턴 감지</Text>
        </View>

        {/* 2. 보조지표 탭 */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            <View style={styles.tabPrefix}>
              <Text style={styles.tabPrefixText}>MAS</Text>
            </View>
            {['MA20', 'MA60', 'BB', 'RSI', 'MACD'].map((tab) => (
              <TouchableOpacity 
                key={tab} 
                onPress={() => setActiveTab(tab)}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 3. 지지/저항 레벨 */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="target" size={18} color="#ef4444" />
            <Text style={styles.sectionTitle}>지지/저항 레벨</Text>
          </View>
          
          <View style={styles.levelRow}>
            <View style={styles.levelLeft}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>지지</Text>
              </View>
              <Text style={styles.levelPrice}>₩167,900</Text>
            </View>
            
            <View style={styles.levelRight}>
              <View style={styles.dots}>
                <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                <View style={[styles.dot, { backgroundColor: '#e2e8f0' }]} />
              </View>
              <Text style={styles.touchText}>3회 접촉</Text>
            </View>
          </View>
        </View>

        {/* 4. 감지된 패턴 */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="bar-chart" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>감지된 패턴</Text>
          </View>

          <View style={styles.patternList}>
            <View style={[styles.patternItem, { borderLeftColor: '#10b981' }]}>
              <View style={styles.patternHeader}>
                <Text style={styles.patternName}>쌍바닥</Text>
                <View style={[styles.trendBadge, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="caret-up" size={10} color="#10b981" />
                  <Text style={[styles.trendText, { color: '#10b981' }]}>상승</Text>
                </View>
              </View>
              <View style={styles.patternBody}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '71%', backgroundColor: '#10b981' }]} />
                </View>
                <Text style={styles.confidenceText}>신뢰도 71%</Text>
                <Ionicons name="caret-down" size={14} color="#cbd5e1" />
              </View>
            </View>

            <View style={[styles.patternItem, { borderLeftColor: '#10b981' }]}>
              <View style={styles.patternHeader}>
                <Text style={styles.patternName}>컵앤핸들</Text>
                <View style={[styles.trendBadge, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="caret-up" size={10} color="#10b981" />
                  <Text style={[styles.trendText, { color: '#10b981' }]}>상승</Text>
                </View>
              </View>
              <View style={styles.patternBody}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '65%', backgroundColor: '#10b981' }]} />
                </View>
                <Text style={styles.confidenceText}>신뢰도 65%</Text>
                <Ionicons name="caret-down" size={14} color="#cbd5e1" />
              </View>
            </View>

            <View style={[styles.patternItem, { borderLeftColor: '#ef4444' }]}>
              <View style={styles.patternHeader}>
                <Text style={styles.patternName}>데드캣 바운스</Text>
                <View style={[styles.trendBadge, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="caret-down" size={10} color="#ef4444" />
                  <Text style={[styles.trendText, { color: '#ef4444' }]}>하락</Text>
                </View>
              </View>
              <View style={styles.patternBody}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '55%', backgroundColor: '#ef4444' }]} />
                </View>
                <Text style={styles.confidenceText}>신뢰도 55%</Text>
                <Ionicons name="caret-down" size={14} color="#cbd5e1" />
              </View>
            </View>
          </View>
        </View>

        {/* 5. 종합 분석 */}
        <View style={[styles.card, { marginBottom: 40 }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="analytics" size={18} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>종합 분석</Text>
          </View>
          
          <View style={styles.summaryBox}>
            <View style={styles.summaryHeader}>
              <View style={styles.summarySignalDot} />
              <Text style={styles.summarySignalText}>매수 신호</Text>
            </View>
            <Text style={styles.summaryStrength}>신호 강도: 3/5</Text>
            
            <View style={styles.summaryList}>
              {['MACD 골든크로스', '단기 이평선 > 중기 이평선', '쌍바닥(Double Bottom)', '컵앤핸들(Cup & Handle)', '데드캣 바운스'].map((item, idx) => (
                <View key={idx} style={styles.summaryListItem}>
                  <Text style={styles.summaryBullet}>•</Text>
                  <Text style={styles.summaryItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- 완벽 재현을 위한 스타일 시트 ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontWeight: 'bold' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  
  priceContainer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16, alignItems: 'flex-start' },
  currentPrice: { fontSize: 34, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  changeText: { fontSize: 16, fontWeight: '700', marginLeft: 4 },

  chartWrapper: { backgroundColor: '#fff', paddingVertical: 10, marginBottom: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: 'bold', color: '#10b981' },
  
  gaugeContainer: { alignItems: 'center', marginVertical: 10, height: 160 },
  gaugeScoreBox: { position: 'absolute', bottom: 10, alignItems: 'center' },
  gaugeScoreText: { fontSize: 42, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  gaugeBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 4, borderWidth: 1, borderColor: '#a7f3d0' },
  gaugeBadgeText: { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
  gaugeSubText: { textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },

  tabsContainer: { backgroundColor: '#fff', paddingVertical: 12, marginHorizontal: 16, borderRadius: 12, marginBottom: 12 },
  tabsScroll: { alignItems: 'center', paddingHorizontal: 10 },
  tabPrefix: { paddingRight: 16, borderRightWidth: 1, borderRightColor: '#e2e8f0', marginRight: 8 },
  tabPrefixText: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8' },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginHorizontal: 4 },
  tabBtnActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  tabTextActive: { color: '#3b82f6' },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginLeft: 6 },
  
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  levelLeft: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 12 },
  levelBadgeText: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold' },
  levelPrice: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  levelRight: { flexDirection: 'row', alignItems: 'center' },
  dots: { flexDirection: 'row', marginRight: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 1 },
  touchText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

  patternList: { gap: 12 },
  patternItem: { borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, padding: 16, borderLeftWidth: 4 },
  patternHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  patternName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  trendText: { fontSize: 11, fontWeight: 'bold', marginLeft: 2 },
  patternBody: { flexDirection: 'row', alignItems: 'center' },
  progressBarBg: { flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginRight: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  confidenceText: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginRight: 8 },

  summaryBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 16, padding: 20 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  summarySignalDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', marginRight: 8 },
  summarySignalText: { fontSize: 18, fontWeight: 'bold', color: '#10b981' },
  summaryStrength: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 16 },
  summaryList: { gap: 8 },
  summaryListItem: { flexDirection: 'row', alignItems: 'center' },
  summaryBullet: { color: '#94a3b8', marginRight: 8, fontSize: 16 },
  summaryItemText: { fontSize: 14, color: '#475569', fontWeight: '500' }
});