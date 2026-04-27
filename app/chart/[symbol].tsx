import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

// (참고) 질문자님의 실제 환경에 맞게 경로를 조정해주세요.
import { AdvancedCandlestickChart } from '@/components/chart/AdvancedCandlestickChart';
import { useColors } from '@/hooks/use-colors';

const { width } = Dimensions.get('window');

// --- 1. 실제 오픈 API (Yahoo Finance) 데이터 호출 ---
const fetchStockData = async (symbol: string) => {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=6mo`);
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
  
  // 점수(0~100)를 각도(-180~0)로 변환
  const angle = (score / 100) * 180 - 180;
  const needleRad = (angle * Math.PI) / 180;
  const nx = cx + (r - 25) * Math.cos(needleRad);
  const ny = cy + (r - 25) * Math.sin(needleRad);

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={width - 80} height="150" viewBox={`0 0 ${width - 80} 150`}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#3b82f6" />    {/* 파랑 */}
            <Stop offset="50%" stopColor="#f59e0b" />   {/* 노랑 */}
            <Stop offset="100%" stopColor="#ef4444" />  {/* 빨강 */}
          </LinearGradient>
        </Defs>
        {/* 배경 트랙 */}
        <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* 컬러 트랙 */}
        <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="url(#grad)" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${Math.PI * r} ${Math.PI * r}`} strokeDashoffset={0} />
        
        {/* 눈금선 */}
        <Line x1={cx - r} y1={cy} x2={cx - r + 8} y2={cy} stroke="#fff" strokeWidth="2" />
        <Line x1={cx} y1={cy - r} x2={cx} y2={cy - r + 8} stroke="#fff" strokeWidth="2" />
        <Line x1={cx + r} y1={cy} x2={cx + r - 8} y2={cy} stroke="#fff" strokeWidth="2" />

        {/* 바늘 */}
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
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const colors = useColors();

  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('MA20');
  
  const targetSymbol = Array.isArray(symbol) ? symbol[0] : (symbol || '005930.KS');

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

        {/* 차트 영역 (기존 컴포넌트 유지) */}
        {chartData.length > 0 && (
          <View style={styles.chartWrapper}>
            <AdvancedCandlestickChart candles={chartData} height={300} showVolume={true} />
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
            {/* 패턴 1: 쌍바닥 */}
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

            {/* 패턴 2: 컵앤핸들 */}
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

            {/* 패턴 3: 데드캣 바운스 */}
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
  container: { flex: 1, backgroundColor: '#f
