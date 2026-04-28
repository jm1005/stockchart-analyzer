import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';

export default function HomeScreen() {
  const router = useRouter();
  const [isLiveBlinking, setIsLiveBlinking] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setIsLiveBlinking((prev) => !prev), 1000);
    return () => clearInterval(interval);
  }, []);

  // 💡 백엔드의 stock.indices API 호출
  const { data: apiIndices, isLoading, error } = trpc.stock.indices.useQuery(undefined, { 
    refetchInterval: 5000, 
    refetchOnWindowFocus: true,
  });

  const isInitialLoading = isLoading && !apiIndices;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>시장 동향</Text>
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, { opacity: isLiveBlinking ? 1 : 0.3 }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.indicesContainer}>
          {isInitialLoading ? (
            <ActivityIndicator size="small" color="#3B82F6" style={{ margin: 20 }} />
          ) : error || !apiIndices || apiIndices.length === 0 ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ 실시간 시장 데이터를 불러올 수 없습니다.</Text>
              <Text style={styles.errorSubText}>{error?.message || '백엔드 서버 연동 상태를 확인해주세요.'}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indicesScroll}>
              {apiIndices.map((item: any, index: number) => {
                const isUp = item.change >= 0;
                const color = isUp ? '#EF4444' : '#3B82F6';
                const sign = isUp ? '+' : '';

                return (
                  <View key={item.symbol || index} style={styles.indexCard}>
                    <Text style={styles.indexName}>{item.name}</Text>
                    <Text style={styles.indexValue}>
                      {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.changeRow}>
                      <IconSymbol name={isUp ? 'arrowtriangle.up.fill' : 'arrowtriangle.down.fill'} size={10} color={color} />
                      <Text style={[styles.indexChange, { color }]}>
                        {' '}{sign}{item.changePercent.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        <TouchableOpacity style={styles.searchBanner} activeOpacity={0.8} onPress={() => router.push('/search')}>
          <View style={styles.searchBannerLeft}>
            <IconSymbol name="magnifyingglass.circle.fill" size={32} color="#3B82F6" />
            <View style={styles.searchBannerTextContainer}>
              <Text style={styles.searchBannerTitle}>AI 차트 분석해보기</Text>
              <Text style={styles.searchBannerSub}>원하는 종목의 패턴을 찾아보세요</Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={20} color="#6B7280" />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 오늘의 인기 종목 (바로가기)</Text>
          <TouchableOpacity style={styles.stockListItem} onPress={() => router.push('/chart/NVDA')}>
            <View style={styles.stockListLeft}>
              <Text style={styles.stockIcon}>🟩</Text>
              <View>
                <Text style={styles.stockName}>엔비디아</Text>
                <Text style={styles.stockTicker}>NVDA</Text>
              </View>
            </View>
            <View style={styles.stockListRight}>
              <IconSymbol name="chevron.right" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.stockListItem} onPress={() => router.push('/chart/005930.KS')}>
            <View style={styles.stockListLeft}>
              <Text style={styles.stockIcon}>🟦</Text>
              <View>
                <Text style={styles.stockName}>삼성전자</Text>
                <Text style={styles.stockTicker}>005930.KS</Text>
              </View>
            </View>
            <View style={styles.stockListRight}>
              <IconSymbol name="chevron.right" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 4 },
  liveText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold' },
  indicesContainer: { marginBottom: 20 },
  indicesScroll: { paddingHorizontal: 16 },
  indexCard: { backgroundColor: '#111827', padding: 16, borderRadius: 16, marginHorizontal: 4, minWidth: 140, borderWidth: 1, borderColor: '#1F2937' },
  indexName: { color: '#9CA3AF', fontSize: 13, marginBottom: 8 },
  indexValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  changeRow: { flexDirection: 'row', alignItems: 'center' },
  indexChange: { fontSize: 13, fontWeight: '600' },
  errorBox: { marginHorizontal: 20, padding: 16, backgroundColor: '#1E1B16', borderRadius: 12, borderWidth: 1, borderColor: '#452E00', alignItems: 'center' },
  errorText: { color: '#FBBF24', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  errorSubText: { color: '#9CA3AF', fontSize: 11 },
  searchBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E1B4B', marginHorizontal: 20, padding: 20, borderRadius: 20, marginBottom: 30 },
  searchBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  searchBannerTextContainer: { marginLeft: 12 },
  searchBannerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  searchBannerSub: { color: '#A5B4FC', fontSize: 13 },
  section: { paddingHorizontal: 20 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  stockListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  stockListLeft: { flexDirection: 'row', alignItems: 'center' },
  stockIcon: { fontSize: 24, marginRight: 12 },
  stockName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  stockTicker: { color: '#9CA3AF', fontSize: 13 },
  stockListRight: { alignItems: 'flex-end', justifyContent: 'center' },
});
