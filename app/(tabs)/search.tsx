import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Keyboard, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';

// 💡 에러 해결: 분리했던 한국어 검색 매핑 및 기능을 파일 내부로 쏙 다시 가져왔습니다! (import 삭제됨)
const KOREAN_STOCK_MAP: Record<string, string> = {
  '애플': 'AAPL', '테슬라': 'TSLA', '엔비디아': 'NVDA', '마이크로소프트': 'MSFT', '마소': 'MSFT',
  '구글': 'GOOGL', '알파벳': 'GOOGL', '아마존': 'AMZN', '메타': 'META', '페이스북': 'META', '넷플릭스': 'NFLX',
  '삼성전자': '005930.KS', '삼전': '005930.KS', 'sk하이닉스': '000660.KS', '하이닉스': '000660.KS',
  '현대차': '005380.KS', '기아': '000270.KS', '네이버': '035420.KS', '카카오': '035720.KS',
  '에코프로': '086520.KQ', '에코프로비엠': '247540.KQ',
};

function preprocessSearchQuery(query: string): string {
  if (!query) return '';
  const normalizedQuery = query.replace(/\s+/g, '').toLowerCase();
  if (KOREAN_STOCK_MAP[normalizedQuery]) {
    return KOREAN_STOCK_MAP[normalizedQuery];
  }
  return query.trim().toUpperCase();
}

export default function SearchScreen() {
  const router = useRouter();
  
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  
  // 💡 백엔드의 stock.search API 호출
  const { data: searchResults, isLoading, error } = trpc.stock.search.useQuery(
    { query: activeQuery }, 
    { enabled: !!activeQuery } 
  );

  const onSubmitSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    
    Keyboard.dismiss();
    const processedQuery = preprocessSearchQuery(trimmed);
    setActiveQuery(processedQuery);
  };

  const handleSelectStock = (symbol: string) => {
    router.push(`/chart/${symbol}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1F2937' }}>
        <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>검색</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#374151' }}>
          <IconSymbol name="magnifyingglass" size={20} color="#9CA3AF" />
          <TextInput
            style={{ flex: 1, color: '#FFF', marginLeft: 8, height: 40 }}
            placeholder="종목명 또는 티커 검색 (ex: 애플, 삼전)"
            placeholderTextColor="#6B7280"
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={onSubmitSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')}>
              <IconSymbol name="xmark.circle.fill" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activeQuery.length > 0 ? (
        <View style={{ flex: 1 }}>
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ color: '#9CA3AF', marginTop: 12 }}>시장 데이터를 검색 중입니다...</Text>
            </View>
          ) : error || !searchResults || searchResults.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
              <Text style={{ color: '#EF4444', textAlign: 'center', marginBottom: 16 }}>
                검색 결과를 불러올 수 없거나 존재하지 않습니다.
              </Text>
              <TouchableOpacity 
                style={{ backgroundColor: '#1F2937', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                onPress={() => handleSelectStock(activeQuery)}
              >
                <Text style={{ color: '#60A5FA', fontWeight: 'bold' }}>
                  "{activeQuery}" 차트 바로 열기
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item: any, index) => item.symbol || String(index)}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937' }}
                  onPress={() => handleSelectStock(item.symbol || activeQuery)}
                >
                  <View>
                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>
                      {item.symbol}
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 4 }}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>{item.exchange || 'LIVE'}</Text>
                    <IconSymbol name="chevron.right" size={16} color="#4B5563" style={{ marginTop: 4 }} />
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
          <IconSymbol name="magnifyingglass" size={48} color="#374151" />
          <Text style={{ color: '#6B7280', marginTop: 16, textAlign: 'center', lineHeight: 20 }}>
            '애플', '삼성전자' 등 한국어로 검색하거나{'\n'}티커를 직접 입력해보세요.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
