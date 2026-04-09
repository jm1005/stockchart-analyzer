#!/usr/bin/env python3
"""
Alpha Vantage API 데이터 수집 스크립트

TIME_SERIES_DAILY_ADJUSTED를 사용하여 일봉 OHLCV 데이터를 수집하고,
기술적 지표(MA, RSI)를 계산한 후 React Native 호환 JSON으로 변환합니다.

사용법:
    python fetch_alpha_vantage.py --symbol AAPL --api-key YOUR_API_KEY
    python fetch_alpha_vantage.py --symbol 005930.KS --api-key YOUR_API_KEY
"""

import json
import time
import logging
from typing import TypedDict, Optional, List, Dict, Any
from datetime import datetime
import requests
import pandas as pd
import numpy as np
from pathlib import Path

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class OHLCVData(TypedDict):
    """OHLCV 데이터 타입"""
    date: str
    open: float
    high: float
    low: float
    close: float
    adjusted_close: float
    volume: int


class TechnicalIndicators(TypedDict):
    """기술적 지표 타입"""
    ma5: Optional[float]
    ma20: Optional[float]
    ma60: Optional[float]
    rsi14: Optional[float]


class CandleData(TypedDict):
    """캔들 데이터 타입 (React Native 호환)"""
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    indicators: TechnicalIndicators


class AlphaVantageClient:
    """Alpha Vantage API 클라이언트"""

    BASE_URL = "https://www.alphavantage.co/query"
    MAX_RETRIES = 3
    RETRY_DELAY = 5  # 초

    def __init__(self, api_key: str):
        """
        Args:
            api_key: Alpha Vantage API 키
        """
        self.api_key = api_key
        self.session = requests.Session()

    def fetch_daily_adjusted(
        self,
        symbol: str,
        retries: int = MAX_RETRIES,
    ) -> Optional[Dict[str, Any]]:
        """
        TIME_SERIES_DAILY_ADJUSTED 데이터 수집

        Args:
            symbol: 종목 코드 (예: 'AAPL', '005930.KS')
            retries: 재시도 횟수

        Returns:
            API 응답 JSON 또는 None (실패 시)
        """
        params = {
            "function": "TIME_SERIES_DAILY_ADJUSTED",
            "symbol": symbol,
            "apikey": self.api_key,
            "outputsize": "full",  # 전체 데이터 수집
        }

        for attempt in range(retries):
            try:
                logger.info(f"Fetching {symbol}... (Attempt {attempt + 1}/{retries})")
                response = self.session.get(self.BASE_URL, params=params, timeout=10)
                response.raise_for_status()

                data = response.json()

                # API 에러 확인
                if "Error Message" in data:
                    logger.error(f"API Error: {data['Error Message']}")
                    return None

                if "Note" in data:
                    logger.warning(f"API Rate Limit: {data['Note']}")
                    if attempt < retries - 1:
                        logger.info(f"Retrying in {self.RETRY_DELAY} seconds...")
                        time.sleep(self.RETRY_DELAY)
                        continue
                    return None

                if "Time Series (Daily)" not in data:
                    logger.error("No time series data in response")
                    return None

                logger.info(f"Successfully fetched {symbol}")
                return data

            except requests.exceptions.Timeout:
                logger.error(f"Request timeout (Attempt {attempt + 1}/{retries})")
                if attempt < retries - 1:
                    time.sleep(self.RETRY_DELAY)
                    continue
                return None

            except requests.exceptions.RequestException as e:
                logger.error(f"Network error: {e} (Attempt {attempt + 1}/{retries})")
                if attempt < retries - 1:
                    time.sleep(self.RETRY_DELAY)
                    continue
                return None

            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                return None

        return None


def parse_api_response(data: Dict[str, Any]) -> pd.DataFrame:
    """
    API 응답을 Pandas DataFrame으로 변환

    Args:
        data: Alpha Vantage API 응답

    Returns:
        정규화된 DataFrame
    """
    time_series = data.get("Time Series (Daily)", {})

    records: List[OHLCVData] = []
    for date_str, values in time_series.items():
        try:
            record: OHLCVData = {
                "date": date_str,
                "open": float(values.get("1. open", 0)),
                "high": float(values.get("2. high", 0)),
                "low": float(values.get("3. low", 0)),
                "close": float(values.get("4. close", 0)),
                "adjusted_close": float(values.get("5. adjusted close", 0)),
                "volume": int(values.get("6. volume", 0)),
            }
            records.append(record)
        except (ValueError, KeyError) as e:
            logger.warning(f"Skipping record for {date_str}: {e}")
            continue

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    logger.info(f"Parsed {len(df)} records")
    return df


def calculate_moving_average(
    df: pd.DataFrame,
    column: str = "close",
    period: int = 20,
) -> pd.Series:
    """
    이동평균선 계산

    Args:
        df: DataFrame
        column: 대상 컬럼
        period: 기간

    Returns:
        이동평균선 Series (초기 NaN 포함)
    """
    return df[column].rolling(window=period, min_periods=1).mean()


def calculate_rsi(
    df: pd.DataFrame,
    column: str = "close",
    period: int = 14,
) -> pd.Series:
    """
    RSI(Relative Strength Index) 계산

    Args:
        df: DataFrame
        column: 대상 컬럼
        period: 기간

    Returns:
        RSI Series (초기 NaN 포함)
    """
    delta = df[column].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period, min_periods=1).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period, min_periods=1).mean()

    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))

    return rsi


def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    기술적 지표 추가 (MA5, MA20, MA60, RSI14)

    NaN 처리 방식:
    - min_periods=1을 사용하여 초기 데이터부터 부분 계산
    - 예: MA5는 첫 번째 데이터부터 계산 가능 (1개 데이터 기준)
    - 정확한 지표는 충분한 데이터 이후부터 신뢰 가능

    Args:
        df: DataFrame

    Returns:
        지표가 추가된 DataFrame
    """
    df = df.copy()

    # 이동평균선
    df["ma5"] = calculate_moving_average(df, period=5)
    df["ma20"] = calculate_moving_average(df, period=20)
    df["ma60"] = calculate_moving_average(df, period=60)

    # RSI
    df["rsi14"] = calculate_rsi(df, period=14)

    return df


def to_react_native_format(df: pd.DataFrame) -> List[CandleData]:
    """
    React Native 호환 JSON 포맷으로 변환

    Args:
        df: 기술적 지표가 포함된 DataFrame

    Returns:
        CandleData 리스트
    """
    candles: List[CandleData] = []

    for _, row in df.iterrows():
        candle: CandleData = {
            "date": row["date"].strftime("%Y-%m-%d"),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": int(row["volume"]),
            "indicators": {
                "ma5": float(row["ma5"]) if pd.notna(row["ma5"]) else None,
                "ma20": float(row["ma20"]) if pd.notna(row["ma20"]) else None,
                "ma60": float(row["ma60"]) if pd.notna(row["ma60"]) else None,
                "rsi14": float(row["rsi14"]) if pd.notna(row["rsi14"]) else None,
            },
        }
        candles.append(candle)

    return candles


def fetch_and_process(
    symbol: str,
    api_key: str,
    output_file: Optional[str] = None,
) -> Optional[List[CandleData]]:
    """
    전체 데이터 수집 및 처리 파이프라인

    Args:
        symbol: 종목 코드
        api_key: Alpha Vantage API 키
        output_file: 출력 파일 경로 (선택사항)

    Returns:
        CandleData 리스트 또는 None (실패 시)
    """
    try:
        # 1. API 데이터 수집
        client = AlphaVantageClient(api_key)
        raw_data = client.fetch_daily_adjusted(symbol)

        if raw_data is None:
            logger.error(f"Failed to fetch data for {symbol}")
            return None

        # 2. DataFrame으로 파싱
        df = parse_api_response(raw_data)

        if df.empty:
            logger.error("No data to process")
            return None

        logger.info(f"Data range: {df['date'].min()} to {df['date'].max()}")

        # 3. 기술적 지표 추가
        df = add_technical_indicators(df)

        # 4. React Native 포맷으로 변환
        candles = to_react_native_format(df)

        # 5. 파일로 저장 (선택사항)
        if output_file:
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(candles, f, ensure_ascii=False, indent=2)

            logger.info(f"Saved {len(candles)} candles to {output_file}")

        return candles

    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return None


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Alpha Vantage 데이터 수집 스크립트")
    parser.add_argument("--symbol", required=True, help="종목 코드 (예: AAPL, 005930.KS)")
    parser.add_argument("--api-key", required=True, help="Alpha Vantage API 키")
    parser.add_argument(
        "--output",
        default="data.json",
        help="출력 파일 경로 (기본값: data.json)",
    )

    args = parser.parse_args()

    candles = fetch_and_process(
        symbol=args.symbol,
        api_key=args.api_key,
        output_file=args.output,
    )

    if candles:
        logger.info(f"✓ Successfully processed {len(candles)} candles")
        print(json.dumps(candles[:5], ensure_ascii=False, indent=2))  # 처음 5개 출력
    else:
        logger.error("✗ Failed to process data")
        exit(1)
