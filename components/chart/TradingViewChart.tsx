import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface CandlestickData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarkerData {
  time: string | number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'circle' | 'arrowUp' | 'arrowDown' | 'text';
  text: string;
}

export interface PriceLineData {
  price: number;
  color: string;
  lineWidth: number;
  lineStyle: number;
  title: string;
}

interface TradingViewChartProps {
  data: CandlestickData[];
  markers?: MarkerData[];
  priceLines?: PriceLineData[];
  isLoading?: boolean;
}

export default function TradingViewChart({ data, markers, priceLines, isLoading }: TradingViewChartProps) {
  const webViewRef = useRef<WebView>(null);
  // 💡 [핵심 해결 1] WebView가 완전히 켜졌는지 확인하는 상태값 추가
  const [isReady, setIsReady] = useState(false);

  const chartHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body { margin: 0; padding: 0; background-color: #000000; overflow: hidden; }
        #chart-container { width: 100vw; height: 100vh; }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>
    </head>
    <body>
      <div id="chart-container"></div>
      <script>
        const chartContainer = document.getElementById('chart-container');
        
        const chart = LightweightCharts.createChart(chartContainer, {
          layout: {
            background: { type: 'solid', color: '#000000' },
            textColor: '#D1D5DB',
            fontSize: 10,
          },
          grid: {
            vertLines: { color: '#111827' },
            horzLines: { color: '#111827' },
          },
          crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: { labelBackgroundColor: '#3B82F6' },
            horzLine: { labelBackgroundColor: '#3B82F6' },
          },
          rightPriceScale: {
            borderColor: '#1F2937',
            autoScale: true,
          },
          timeScale: {
            borderColor: '#1F2937',
            timeVisible: true,
          },
        });

        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#EF4444',
          downColor: '#3B82F6',
          borderVisible: false,
          wickUpColor: '#EF4444',
          wickDownColor: '#3B82F6',
        });

        let currentPriceLines = [];

        // 💡 [핵심 해결 2] 따옴표 에러를 막기 위해 글로벌 변수로 데이터를 받아서 처리
        window.updateChartFromGlobal = () => {
          try {
            if (window.__CHART_DATA__) {
              candlestickSeries.setData(window.__CHART_DATA__);
            }
            
            if (window.__CHART_MARKERS__) {
              candlestickSeries.setMarkers(window.__CHART_MARKERS__);
            }

            if (window.__CHART_LINES__) {
              currentPriceLines.forEach(l => candlestickSeries.removePriceLine(l));
              currentPriceLines = [];

              window.__CHART_LINES__.forEach(lineCfg => {
                const line = candlestickSeries.createPriceLine({
                    price: lineCfg.price,
                    color: lineCfg.color || '#4B5563',
                    lineWidth: lineCfg.lineWidth || 1,
                    lineStyle: lineCfg.lineStyle || 0,
                    axisLabelVisible: true,
                    title: lineCfg.title || '',
                });
                currentPriceLines.push(line);
              });
            }

            chart.timeScale().fitContent();
          } catch (e) {
            console.error("Chart Update Error:", e);
          }
        };

        window.addEventListener('resize', () => {
          chart.resize(window.innerWidth, window.innerHeight);
        });
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    // 💡 차트를 그리는 스크립트 로딩이 끝난 상태(isReady === true)일 때만 데이터 주입!
    if (isReady && webViewRef.current && data?.length > 0) {
      const dataStr = JSON.stringify(data);
      const markersStr = JSON.stringify(markers || []);
      const linesStr = JSON.stringify(priceLines || []);
      
      // 따옴표 충돌이 나지 않도록 데이터를 JSON 객체 그대로 변수에 할당합니다.
      const script = `
        window.__CHART_DATA__ = ${dataStr};
        window.__CHART_MARKERS__ = ${markersStr};
        window.__CHART_LINES__ = ${linesStr};
        if (window.updateChartFromGlobal) {
          window.updateChartFromGlobal();
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [data, markers, priceLines, isReady]); // isReady가 변경될 때도 트리거되게 설정

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: chartHtml }} // 💡 baseUrl 완전히 제거 (안드로이드 이슈 원천 차단)
        onLoadEnd={() => setIsReady(true)} // 💡 HTML이 완전히 켜지면 isReady를 true로 변경
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
      
      {/* WebView가 준비되기 전이거나 데이터를 불러오는 중일 때 보여줄 로딩 화면 */}
      {(!isReady || isLoading) && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // 차트 배경색과 맞춰서 부드럽게 넘어가게 함
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});