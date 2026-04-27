import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  
  // 시장 지수 상태 관리
  const [indices, setIndices] = useState<any[]>([]);
  const [loadingIndices, setLoadingIndices] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 💡 실시간 시장 지수 데이터 호출 (401 에러 원천 차단 우회 패치)
  const fetchMarketIndices = async () => {
    setErrorMessage(null);
    try {
      // 조회할 지수 목록 설정
      const targetSymbols = [
        { id: '^KS11', name: 'KOSPI' },
        { id: '^KQ11', name: 'KOSDAQ' },
        { id: '^IXIC', name: 'NASDAQ' },
        { id: '^GSPC', name: 'S&P 500' }
      ];
      
      // 🚨 401 에러가 나는 quote API 대신 보안이 덜 엄격한 chart API(v8)를 병렬로 호출합니다.
      const fetchPromises = targetSymbols.map(async (sym) => {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym.id}?interval=1d&range=1d`);
        
        if (!response.ok) {
          throw new Error(`${sym.name} 지수 로드 실패`);
        }
        
        const json = await response.json();
        const meta = json.chart?.result?.[0]?.meta;
        
        if (!meta) throw new Error('메타 데이터가 없습니다.');

        // 💡 가격 및 등락률 직접 계산 (API에서 받은 현재가와 이전 종가 활용)
        const priceValue = meta.regularMarketPrice ?? 0;
        const prevClose = meta.previousClose ?? priceValue;
        const changeValue = priceValue - prevClose;
        const changePercentValue = prevClose > 0 ? (changeValue / prevClose) * 100 : 0;
        const isUp = changeValue >= 0;

        return {
          id: sym.id,
          name: sym.name,
          price: priceValue.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          }),
          change: `${isUp ? '+' : ''}${changePercentValue.toFixed(2)}%`,
          isUp
        };
      });

      // 4개의 지수를 동시에 병렬로 가져옵니다.
      const mappedIndices = await Promise.all(fetchPromises);
      setIndices(mappedIndices);
      
    } catch (error: any) {
      console.error('시장 지수 로딩 실패:', error);
      setErrorMessage(error.message || '데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setLoadingIndices(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketIndices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMarketIndices();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        
        {/* 헤더 섹션 */}
        <View style={styles.header}>
          <Text style={styles.logoText}>ChartLens</Text>
          <TouchableOpacity onPress={() => router.push('/search')}>
            <Ionicons name="notifications-outline" size={26} color="#1e293b" />
          </TouchableOpacity>
        </View>

        {/* 🔍 검색 바 (터치 시 이동) */}
        <TouchableOpacity 
          style={styles.searchButton}
          activeOpacity={0.7}
          onPress={() => router.push('/search')}
        >
          <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 12 }} />
          <Text style={styles.searchText}>종목명 또는 한글로 검색해보세요</Text>
        </TouchableOpacity>

        {/* 📊 시장 지수 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>시장 지수</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          
          {loadingIndices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingSubText}>라이브 시세 연결 중...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={24} color="#f43f5e" />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                <Text style={styles.retryText}>새로고침</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indicesScroll}>
              {indices.map((idx, i) => (
                <View key={i} style={styles.indexCard}>
                  <Text style={styles.indexName}>{idx.name}</Text>
                  <Text style={styles.indexPrice}>{idx.price}</Text>
                  <View style={[styles.changeBadge, { backgroundColor: idx.isUp ? '#fee2e2' : '#eff6ff' }]}>
                    <Text style={[styles.indexChange, { color: idx.isUp ? '#ef4444' : '#3b82f6' }]}>
                      {idx.change}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ⭐ 관심 종목 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>관심종목</Text>
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Text style={styles.actionText}>편집</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="star" size={32} color="#3b82f6" />
            </View>
            <Text style={styles.emptyTitle}>관심종목을 채워보세요</Text>
            <Text style={styles.emptySub}>분석하고 싶은 종목을 추가하고{'\n'}실시간 AI 분석을 받아보세요</Text>
            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => router.push('/search')}
            >
              <Text style={styles.addBtnText}>종목 추가하기</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    paddingBottom: 16 
  },
  logoText: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.8 },
  
  searchButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc', 
    marginHorizontal: 20, 
    paddingHorizontal: 18, 
    height: 56, 
    borderRadius: 18, 
    borderWidth: 1, 
    borderColor: '#f1f5f9', 
    marginBottom: 32 
  },
  searchText: { fontSize: 16, color: '#94a3b8', fontWeight: '500' },

  section: { marginBottom: 36 },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20, 
    marginBottom: 16 
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  actionText: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },

  liveBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ecfdf5', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10 
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: '800', color: '#10b981' },

  loadingContainer: { 
    height: 130, 
    marginHorizontal: 20, 
    backgroundColor: '#f8fafc', 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingSubText: { marginTop: 10, fontSize: 14, color: '#94a3b8', fontWeight: '600' },

  errorContainer: {
    height: 150,
    marginHorizontal: 20,
    backgroundColor: '#fff1f2',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#fecdd3'
  },
  errorText: { fontSize: 14, color: '#e11d48', marginTop: 10, textAlign: 'center', fontWeight: '600' },
  retryButton: { marginTop: 14, backgroundColor: '#e11d48', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  indicesScroll: { paddingLeft: 20, paddingRight: 10 },
  indexCard: { 
    backgroundColor: '#ffffff', 
    padding: 22, 
    borderRadius: 24, 
    marginRight: 14, 
    width: 155, 
    borderWidth: 1, 
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3
  },
  indexName: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 10 },
  indexPrice: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  changeBadge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8 
  },
  indexChange: { fontSize: 13, fontWeight: '800' },

  emptyCard: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 50, 
    marginHorizontal: 20, 
    backgroundColor: '#f8fafc', 
    borderRadius: 32, 
    borderWidth: 1.5, 
    borderColor: '#f1f5f9',
    borderStyle: 'dashed'
  },
  emptyIconCircle: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#eff6ff', 
    borderRadius: 26, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 24 
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  emptySub: { fontSize: 15, color: '#64748b', marginBottom: 32, textAlign: 'center', lineHeight: 22 },
  addBtn: { 
    backgroundColor: '#3b82f6', 
    paddingHorizontal: 32, 
    paddingVertical: 18, 
    borderRadius: 22,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6
  },
  addBtnText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' }
});