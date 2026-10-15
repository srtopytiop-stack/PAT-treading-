"""
Pytest Fixtures and Mock Data for PAT Trading Integration Tests
Provides mock Binance public data ensuring zero network calls and full reproducibility.
"""

import sys
import os
import pytest
from typing import List, Dict, Any

# Ensure src is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from pat_trading.market.binance import BinanceService
from pat_trading.features.engine import FeatureEngine
from pat_trading.hypotheses.search import HypothesisLab


@pytest.fixture
def mock_binance_exchange_info() -> Dict[str, Any]:
    return {
        "timezone": "UTC",
        "serverTime": 1700000000000,
        "symbols": [
            {
                "symbol": "BTCUSDT",
                "status": "TRADING",
                "baseAsset": "BTC",
                "quoteAsset": "USDT",
                "isSpotTradingAllowed": True,
            },
            {
                "symbol": "ETHUSDT",
                "status": "TRADING",
                "baseAsset": "ETH",
                "quoteAsset": "USDT",
                "isSpotTradingAllowed": True,
            },
            {
                "symbol": "SOLUSDT",
                "status": "TRADING",
                "baseAsset": "SOL",
                "quoteAsset": "USDT",
                "isSpotTradingAllowed": True,
            },
            {
                "symbol": "INACTIVEUSDT",
                "status": "BREAK",
                "baseAsset": "INACTIVE",
                "quoteAsset": "USDT",
                "isSpotTradingAllowed": False,
            },
        ],
    }


@pytest.fixture
def mock_raw_klines() -> List[List[Any]]:
    """
    Deterministic 150 hourly candles for testing without internet
    Format: [openTime, open, high, low, close, volume, closeTime, quoteVol, trades]
    """
    base_time = 1700000000000
    hour_ms = 3600000
    candles = []
    price = 60000.0

    for i in range(150):
        ot = base_time + i * hour_ms
        ct = ot + hour_ms - 1
        delta = ((i % 7) - 3) * 50.0 + ((i % 13) - 6) * 20.0
        c_open = price
        c_close = price + delta
        c_high = max(c_open, c_close) + 40.0
        c_low = min(c_open, c_close) - 35.0
        vol = 100.0 + (i % 5) * 20.0
        qvol = vol * ((c_open + c_close) / 2)
        trades = 500 + i * 2

        candles.append([
            ot,
            f"{c_open:.2f}",
            f"{c_high:.2f}",
            f"{c_low:.2f}",
            f"{c_close:.2f}",
            f"{vol:.2f}",
            ct,
            f"{qvol:.2f}",
            trades,
            "0",
            "0",
            "0",
        ])
        price = c_close

    return candles


@pytest.fixture
def mock_klines_with_integrity_issues(mock_raw_klines) -> List[List[Any]]:
    """
    Inserts a duplicate candle and a 2-hour gap for integrity testing
    """
    corrupted = list(mock_raw_klines[:10])
    # Duplicate candle at index 10
    corrupted.append(mock_raw_klines[9])
    # Gap: skip 2 hours
    hour_ms = 3600000
    resume_time = int(mock_raw_klines[9][0]) + 3 * hour_ms
    resumed_candle = list(mock_raw_klines[10])
    resumed_candle[0] = resume_time
    resumed_candle[6] = resume_time + hour_ms - 1
    corrupted.append(resumed_candle)
    corrupted.extend(mock_raw_klines[11:60])
    return corrupted


@pytest.fixture
def mock_binance_service(monkeypatch, mock_raw_klines, mock_binance_exchange_info):
    """
    Configures a BinanceService whose network requests are strictly mocked.
    """
    service = BinanceService()

    def mock_fetch(url: str):
        if "exchangeInfo" in url:
            return mock_binance_exchange_info
        elif "klines" in url:
            return mock_raw_klines
        raise ValueError(f"Unexpected network URL in mock: {url}")

    monkeypatch.setattr(service, "_fetch_json", mock_fetch)
    return service
