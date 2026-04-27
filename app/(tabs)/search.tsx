import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, FlatList, TouchableOpacity, 
  StyleSheet, SafeAreaView, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// 검색 화면 컴포넌트
export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 💡 스마트 검색 API 호출 함수
  const searchStocks = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchTerm)}&quotesCount=10&newsCount=0`
      );
      const data = await response.json();
      
      // 🚨 수정된 부분: API 응답에 quotes 배열이 정상적으로 있는지 먼저 확인하여 앱이 터지는 것을 방지합니다.
      if (data && Array.isArray(data.quotes)) {
        // 검색 결과 중 주식/ETF 등 거래 가능한 종목만 필터링
        const validQuotes = data.quotes.filter((q: any) => 
          q.isYahooFinance && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        );
        setResults(validQuotes);
      } else {
        // 결과가 없거나 잘못된 응답일 경우 빈 배열 처리
        setResults([]);
      }
    } catch (error) {
      console.error("검색 오류:", error);
      setResults([]); // 에러 발생 시에도 앱이 터지지 않도록 빈 배열 처리
    } finally {
      setLoading(false);
    }
  };

  // 타이핑 시 API 호출 지연(Debounce) 로직
  useEffect(() => {
    const timer = setTimeout(() => {
      searchStocks(query);
    }, 400); // 0.4초 동안 입력이 없으면 검색 실행
    return () => clearTimeout(timer);
  }, [query]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.resultItem} 
      onPress={() => router.push(`/chart/${item.symbol}`)}
    >
      <View style={styles.resultLeft}>
        <Text style={styles.symbolText}>{item.symbol}</Text>
        <Text style={styles.nameText} numberOfLines={1}>
          {item.shortname || item.longname || item.symbol}
        </Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.exchDisp || item.exchange}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 바 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="삼성, TSLA 등 종목명/코드 검색"
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoFocus
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* 검색 결과 리스트 */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.symbol}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      ) : query.length > 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>'{query}' 검색 결과가 없습니다.</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.guideText}>궁금한 주식이나 기업 이름을 검색해보세요.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { marginRight: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#0f172a' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  resultLeft: { flex: 1, paddingRight: 16 },
  symbolText: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  nameText: { fontSize: 13, color: '#64748b' },
  badge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#64748b', fontWeight: '500' },
  guideText: { fontSize: 15, color: '#94a3b8' }
});