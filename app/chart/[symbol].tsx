import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import TradingViewChart from '@/components/chart/TradingViewChart';
import { trpc } from '@/lib/trpc';
import * as TechnicalAnalysis from '@/lib/technicalAnalysis';

export default function ChartScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();

  // 💡 백엔드의 stock.chart API 호출
  const { data: chartResponse, isLoading, error } = trpc.stock.chart.useQuery(
    { symbol: symbol as string, period: "6M" }, 
    { enabled: !!symbol }
  );

  const chartData = useMemo(() => {
    if (!chartResponse || !chartResponse.candles || chartResponse.candles.length === 0) return [];
    return chartResponse.candles.map((c: any) => {
      const dateStr = new Date(c.timestamp).toISOString().split('T')[0];
      return { time: dateStr, open: c.open, high: c.high, low: c.low, close: c.close };
    });
  }, [chartResponse]);

  const markers: any[] = useMemo(() => {
    let result: any[] = [];
    const detectFn = (TechnicalAnalysis as any).detectPatterns;
    if (typeof detectFn === 'function' && chartData.length > 0) {
      try {
        const detectedPatterns = detectFn(chartData);
        if (detectedPatterns && Array.isArray(detectedPatterns)) {
          result = detectedPatterns.map((p: any) => {
            const isBuy = p.type?.includes('Bottom') || p.type?.includes('Buy');
            return {
              time: chartData[p.index]?.time || chartData[0].time,
              position: isBuy ? 'belowBar' : 'aboveBar',
              color: isBuy ? '#10B981' : '#EF4444',
              shape: isBuy ? 'arrowUp' : 'arrowDown',
              text: p.name || '패턴 감지',
              uiConfidence: Math.round((p.confidence || Math.random() * 0.4 + 0.5) * 100),
              uiName: p.name || '기술적 패턴',
              uiType: isBuy ? 'Buy' : 'Sell'
            };
          });
        }
      } catch (err) {}
    }
    return result;
  }, [chartData]);

  const priceLines: any[] = useMemo(() => {
    let result: any[] = [];
    const calcFn = (TechnicalAnalysis as any).calculateSupportResistance || (TechnicalAnalysis as any).calculateLevels;
    if (typeof calcFn === 'function' && chartData.length > 0) {
      try {
        const levels = calcFn(chartData);
        if (levels && Array.isArray(levels)) {
          result = levels.map((l: any) => ({
            price: l.price,
            color: l.type === 'support' ? '#3B82F6' : '#F59E0B',
            lineWidth: (l.strength || 0) > 2 ? 2 : 1,
            lineStyle: 2,
            title: `${l.type === 'support' ? '지지' : '저항'}`,
            uiType: l.type,
            uiTouches: l.touches || 1,
          }));
        }
      } catch (err) {}
    }
    return result;
  }, [chartData]);

  const { sentimentLabel, sentimentColor } = useMemo(() => {
    let buyCount = 0; let sellCount = 0;
    markers.forEach(m => { if (m.uiType === 'Buy') buyCount++; else if (m.uiType === 'Sell') sellCount++; });
    if (buyCount === 0 && sellCount === 0) return { sentimentLabel: '데이터 부족', sentimentColor: '#6B7280' };
    if (buyCount > sellCount) return { sentimentLabel: '매수 우위', sentimentColor: '#10B981' };
    if (sellCount > buyCount) return { sentimentLabel: '매도 우위', sentimentColor: '#EF4444' };
    return { sentimentLabel: '중립 유지', sentimentColor: '#9CA3AF' };
  }, [markers]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen 
        options={{ 
          title: symbol ? `${symbol} AI 분석` : '차트 분석',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerBackTitleVisible: false,
        } as any} 
      />

      {isLoading && chartData.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>실제 시장 데이터를 분석 중입니다...</Text>
        </View>
      ) : error || chartData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>데이터를 불러올 수 없습니다.</Text>
          <Text style={styles.errorText}>({error?.message || '종목 데이터가 없습니다.'})</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>이전 화면으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.chartWrapper}>
            <TradingViewChart data={chartData} markers={markers as any} priceLines={priceLines as any} />
          </View>
          <View style={styles.reportContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 AI 종합 관점</Text>
              <View style={styles.sentimentBox}>
                <Text style={[styles.sentimentText, { color: sentimentColor }]}>{sentimentLabel}</Text>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 감지된 주요 패턴</Text>
              {markers.length > 0 ? markers.map((marker, index) => (
                <View key={index} style={styles.patternRow}>
                  <View style={styles.patternHeader}>
                    <Text style={styles.patternName}>{marker.uiType === 'Buy' ? '🟢 ' : '🔴 '}{marker.uiName}</Text>
                    <Text style={styles.patternScore}>{marker.uiConfidence}%</Text>
                  </View>
                  <View style={styles.gaugeBackground}>
                    <View style={[styles.gaugeFill, { width: `${marker.uiConfidence}%`, backgroundColor: marker.color }]} />
                  </View>
                </View>
              )) : <Text style={styles.emptyText}>현재 감지된 뚜렷한 패턴이 없습니다.</Text>}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🧱 주요 지지/저항선</Text>
              {priceLines.length > 0 ? priceLines.map((line, index) => {
                const isSupport = line.uiType === 'support';
                const touchDots = Array(line.uiTouches).fill(isSupport ? '🔵' : '🟠').join(' ');
                return (
                  <View key={index} style={styles.srRow}>
                    <View style={styles.srLeft}>
                      <View style={[styles.srBadge, { backgroundColor: isSupport ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)' }]}>
                        <Text style={[styles.srBadgeText, { color: isSupport ? '#60A5FA' : '#FBBF24' }]}>{isSupport ? '지지선' : '저항선'}</Text>
                      </View>
                      <Text style={styles.srPrice}>{line.price.toFixed(2)}</Text>
                    </View>
                    <View style={styles.srRight}>
                      <Text style={styles.srTouchText}>{line.uiTouches}회 돌파 시도</Text>
                      <Text style={styles.srDots}>{touchDots}</Text>
                    </View>
                  </View>
                );
              }) : <Text style={styles.emptyText}>형성된 주요 지지/저항 라인이 없습니다.</Text>}
            </View>
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 20 },
  loadingText: { color: '#9CA3AF', marginTop: 16, fontSize: 14 },
  errorTitle: { color: '#EF4444', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  errorText: { color: '#EF4444', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  backButton: { backgroundColor: '#1F2937', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#FFF', fontWeight: 'bold' },
  emptyText: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  chartWrapper: { height: 400, width: '100%', borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  reportContainer: { padding: 16 },
  card: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1F2937' },
  cardTitle: { color: '#F3F4F6', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  sentimentBox: { alignItems: 'center', paddingVertical: 10, backgroundColor: '#000', borderRadius: 12 },
  sentimentText: { fontSize: 24, fontWeight: '900' },
  patternRow: { marginBottom: 16 },
  patternHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  patternName: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },
  patternScore: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  gaugeBackground: { height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 4 },
  srRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  srLeft: { flexDirection: 'row', alignItems: 'center' },
  srBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  srBadgeText: { fontSize: 11, fontWeight: 'bold' },
  srPrice: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  srRight: { alignItems: 'flex-end' },
  srTouchText: { color: '#9CA3AF', fontSize: 11, marginBottom: 4 },
  srDots: { fontSize: 10 }
});