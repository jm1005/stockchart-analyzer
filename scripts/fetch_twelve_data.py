#!/usr/bin/env python3
"""
Twelve Data API 클라이언트

한국(KST)과 미국(EST) 주식의 실시간 시세 및 과거 데이터를 조회합니다.
- 다중 종목 지원
- 시간대 통일 (ISO 8601)
- 데이터 샘플링 최적화
- 환경변수 기반 보안

사용법:
    python fetch_twelve_data.py --symbols AAPL,005930 --interval 1day --output data.json
    python fetch_twelve_data.py --symbols AAPL --interval 1h --limit 100
"""

import os
import json
import logging
from typing import TypedDict, Optional, List, Dict, Any
from datetime import datetime, timedelta
import pytz
import requests
import pandas as pd
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class CandleData(TypedDict):
    """캔들 데이터 타입 (React Native 호환)"""
    date: str  # ISO 8601 형식
    open: float
    high: float
    low: float
    close: float
    volume: int


class TwelveDataClient:
    """Twelve Data API 클라이언트"""

    BASE_URL = "https://api.twelvedata.com"
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # 초

    # 시간대 정의
    TIMEZONES = {
        "KST": pytz.timezone("Asia/Seoul"),  # 한국
        "EST": pytz.timezone("US/Eastern"),  # 미국
    }

    def __init__(self, api_key: Optional[str] = None):
        """
        Args:
            api_key: Twelve Data API 키 (없으면 환경변수에서 로드)
        """
        self.api_key = api_key or os.getenv("TWELVE_DATA_API_KEY")
        if not self.api_key:
            raise ValueError(
                "TWELVE_DATA_API_KEY 환경변수가 설정되지 않았습니다. "
                ".env 파일에 설정하거나 api_key 파라미터로 전달하세요."
            )
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"apikey {self.api_key}"})

    def _get_market_timezone(self, symbol: str) -> str:
        """
        종목 코드로부터 시장 시간대 판단

        Args:
            symbol: 종목 코드 (예: AAPL, 005930.KS)

        Returns:
            시간대 (KST 또는 EST)
        """
        # 한국 주식 판단 (.KS, .KQ 또는 6자리 숫자)
        if symbol.endswith((".KS", ".KQ")) or (
            len(symbol) == 6 and symbol.isdigit()
        ):
            return "KST"
        return "EST"

    def fetch_time_series(
        self,
        symbols: List[str],
        interval: str = "1day",
        limit: int = 100,
        retries: int = MAX_RETRIES,
    ) -> Optional[Dict[str, List[CandleData]]]:
        """
        다중 종목의 시계열 데이터 조회

        Args:
            symbols: 종목 코드 리스트 (예: ['AAPL', '005930.KS'])
            interval: 시간 간격 (1min, 5min, 15min, 30min, 1h, 1day, 1week, 1month)
            limit: 조회 데이터 개수 (최대 5000)
            retries: 재시도 횟수

        Returns:
            {종목: [캔들 데이터]} 딕셔너리 또는 None
        """
        results = {}

        for symbol in symbols:
            logger.info(f"Fetching {symbol}...")
            data = self._fetch_single_symbol(symbol, interval, limit, retries)

            if data:
                results[symbol] = data
            else:
                logger.warning(f"Failed to fetch {symbol}")

        return results if results else None

    def _fetch_single_symbol(
        self,
        symbol: str,
        interval: str,
        limit: int,
        retries: int,
    ) -> Optional[List[CandleData]]:
        """
        단일 종목 데이터 조회

        Args:
            symbol: 종목 코드
            interval: 시간 간격
            limit: 조회 개수
            retries: 재시도 횟수

        Returns:
            캔들 데이터 리스트 또는 None
        """
        params = {
            "symbol": symbol,
            "interval": interval,
            "order": "ASC",
            "limit": min(limit, 5000),  # API 최대값
            "format": "JSON",
        }

        for attempt in range(retries):
            try:
                logger.info(
                    f"Fetching {symbol} ({interval})... "
                    f"(Attempt {attempt + 1}/{retries})"
                )
                response = self.session.get(
                    f"{self.BASE_URL}/time_series",
                    params=params,
                    timeout=10,
                )
                response.raise_for_status()

                data = response.json()

                # API 에러 확인
                if data.get("status") == "error":
                    logger.error(f"API Error: {data.get('message')}")
                    return None

                if "values" not in data:
                    logger.error("No values in response")
                    return None

                # 데이터 정규화
                candles = self._normalize_data(data["values"], symbol)
                logger.info(f"Successfully fetched {len(candles)} candles for {symbol}")
                return candles

            except requests.exceptions.Timeout:
                logger.error(f"Request timeout (Attempt {attempt + 1}/{retries})")
                if attempt < retries - 1:
                    import time
                    time.sleep(self.RETRY_DELAY)
                    continue
                return None

            except requests.exceptions.RequestException as e:
                logger.error(f"Network error: {e} (Attempt {attempt + 1}/{retries})")
                if attempt < retries - 1:
                    import time
                    time.sleep(self.RETRY_DELAY)
                    continue
                return None

            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                return None

        return None

    def _normalize_data(
        self,
        values: List[Dict[str, str]],
        symbol: str,
    ) -> List[CandleData]:
        """
        API 응답을 정규화하고 시간대 통일

        Args:
            values: API 응답의 values 배열
            symbol: 종목 코드

        Returns:
            정규화된 캔들 데이터 리스트
        """
        market_tz = self._get_market_timezone(symbol)
        tz = self.TIMEZONES[market_tz]

        candles: List[CandleData] = []

        for item in values:
            try:
                # 시간대 변환
                dt_str = item.get("datetime", "")
                if not dt_str:
                    continue

                # 시간 파싱 (Twelve Data는 시장 시간대로 제공)
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))

                # 시장 시간대로 변환
                if dt.tzinfo is None:
                    dt = tz.localize(dt)
                else:
                    dt = dt.astimezone(tz)

                # ISO 8601 형식으로 변환
                iso_date = dt.isoformat()

                candle: CandleData = {
                    "date": iso_date,
                    "open": float(item.get("open", 0)),
                    "high": float(item.get("high", 0)),
                    "low": float(item.get("low", 0)),
                    "close": float(item.get("close", 0)),
                    "volume": int(item.get("volume", 0)),
                }
                candles.append(candle)

            except (ValueError, KeyError, TypeError) as e:
                logger.warning(f"Skipping record: {e}")
                continue

        return candles

    @staticmethod
    def sample_data(
        candles: List[CandleData],
        target_points: int = 500,
    ) -> List[CandleData]:
        """
        데이터 샘플링으로 포인트 개수 최적화

        차트 렌더링 성능을 위해 데이터가 많을 경우 적절히 샘플링합니다.
        - 원본 데이터 < target_points: 그대로 반환
        - 원본 데이터 >= target_points: 균등 샘플링

        Args:
            candles: 캔들 데이터 리스트
            target_points: 목표 포인트 개수 (기본값: 500)

        Returns:
            샘플링된 캔들 데이터 리스트
        """
        if len(candles) <= target_points:
            logger.info(f"Data size ({len(candles)}) is within target ({target_points})")
            return candles

        # 균등 샘플링
        step = len(candles) // target_points
        sampled = candles[::step]

        # 마지막 데이터 포함 보장
        if sampled[-1] != candles[-1]:
            sampled.append(candles[-1])

        logger.info(
            f"Sampled data from {len(candles)} to {len(sampled)} points "
            f"(step: {step})"
        )
        return sampled


def fetch_and_process(
    symbols: List[str],
    interval: str = "1day",
    limit: int = 100,
    sample_target: int = 500,
    output_file: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Optional[Dict[str, List[CandleData]]]:
    """
    전체 데이터 수집 및 처리 파이프라인

    Args:
        symbols: 종목 코드 리스트
        interval: 시간 간격
        limit: 조회 개수
        sample_target: 샘플링 목표 포인트
        output_file: 출력 파일 경로 (선택사항)
        api_key: API 키 (선택사항)

    Returns:
        {종목: [캔들 데이터]} 딕셔너리 또는 None
    """
    try:
        # 1. API 클라이언트 초기화
        client = TwelveDataClient(api_key)

        # 2. 데이터 수집
        raw_data = client.fetch_time_series(symbols, interval, limit)

        if not raw_data:
            logger.error("Failed to fetch data")
            return None

        # 3. 데이터 샘플링
        processed_data = {}
        for symbol, candles in raw_data.items():
            sampled = TwelveDataClient.sample_data(candles, sample_target)
            processed_data[symbol] = sampled

        # 4. 파일로 저장 (선택사항)
        if output_file:
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(processed_data, f, ensure_ascii=False, indent=2)

            logger.info(f"Saved data to {output_file}")

        return processed_data

    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return None


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Twelve Data API 클라이언트")
    parser.add_argument(
        "--symbols",
        required=True,
        help="종목 코드 (쉼표 구분, 예: AAPL,005930.KS)",
    )
    parser.add_argument(
        "--interval",
        default="1day",
        help="시간 간격 (기본값: 1day)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="조회 개수 (기본값: 100, 최대: 5000)",
    )
    parser.add_argument(
        "--sample",
        type=int,
        default=500,
        help="샘플링 목표 포인트 (기본값: 500)",
    )
    parser.add_argument(
        "--output",
        default="data.json",
        help="출력 파일 경로 (기본값: data.json)",
    )
    parser.add_argument(
        "--api-key",
        help="API 키 (없으면 TWELVE_DATA_API_KEY 환경변수 사용)",
    )

    args = parser.parse_args()

    # 종목 코드 파싱
    symbols = [s.strip() for s in args.symbols.split(",")]

    # 데이터 수집 및 처리
    result = fetch_and_process(
        symbols=symbols,
        interval=args.interval,
        limit=args.limit,
        sample_target=args.sample,
        output_file=args.output,
        api_key=args.api_key,
    )

    if result:
        logger.info(f"✓ Successfully processed {len(result)} symbols")
        # 각 종목의 첫 3개 데이터 출력
        for symbol, candles in result.items():
            logger.info(f"{symbol}: {len(candles)} candles")
            print(json.dumps(candles[:3], ensure_ascii=False, indent=2))
    else:
        logger.error("✗ Failed to process data")
        exit(1)
