"""
Binance Public Spot Market Data Service
Public endpoints only; strict data integrity audit; zero private API credentials.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
import urllib.request
import urllib.error
from typing import List, Dict, Any, Tuple

from pat_trading.config import TRADING_ENABLED, LIVE_TRADING_ENABLED, MIN_CANDLES_REQUIRED

if TRADING_ENABLED or LIVE_TRADING_ENABLED:
    raise RuntimeError("SECURITY VIOLATION: Trading must remain permanently disabled.")


@dataclass(frozen=True)
class RawCandle:
    open_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    close_time: int
    quote_volume: float
    trades: int


@dataclass
class Candle:
    open_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    close_time: int
    quote_volume: float
    trades: int
    timestamp_utc: str
    is_complete: bool


@dataclass
class DataIntegrityReport:
    symbol: str
    timeframe: str
    total_candles: int
    start_time_utc: str
    end_time_utc: str
    missing_candles_count: int
    duplicate_count: int
    non_monotonic_count: int
    gap_ranges: List[Dict[str, Any]] = field(default_factory=list)
    is_clean: bool = True
    warnings: List[str] = field(default_factory=list)


class BinanceService:
    BASE_URL = "https://api.binance.com"

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url

    def _fetch_json(self, url: str) -> Any:
        req = urllib.request.Request(url, headers={"User-Agent": "PAT-Trading-Lab/2.4"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def get_exchange_universe(self, quote_asset: str = "USDT") -> List[Dict[str, Any]]:
        url = f"{self.base_url}/api/v3/exchangeInfo"
        data = self._fetch_json(url)
        symbols = []
        for s in data.get("symbols", []):
            if (
                s.get("status") == "TRADING"
                and s.get("isSpotTradingAllowed", False)
                and s.get("quoteAsset") == quote_asset
            ):
                symbols.append({
                    "symbol": s.get("symbol"),
                    "baseAsset": s.get("baseAsset"),
                    "quoteAsset": s.get("quoteAsset"),
                    "status": s.get("status"),
                })
        return symbols

    def get_klines(
        self, symbol: str = "BTCUSDT", interval: str = "1h", limit: int = 350
    ) -> Tuple[List[Candle], DataIntegrityReport]:
        url = f"{self.base_url}/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
        raw_data = self._fetch_json(url)
        raw_candles = []
        for k in raw_data:
            raw_candles.append(RawCandle(
                open_time=int(k[0]),
                open=float(k[1]),
                high=float(k[2]),
                low=float(k[3]),
                close=float(k[4]),
                volume=float(k[5]),
                close_time=int(k[6]),
                quote_volume=float(k[7]),
                trades=int(k[8]),
            ))

        return self.normalize_and_validate(raw_candles, symbol, interval)

    def normalize_and_validate(
        self, raw: List[RawCandle], symbol: str, interval: str
    ) -> Tuple[List[Candle], DataIntegrityReport]:
        interval_ms = self._interval_to_ms(interval)
        candles: List[Candle] = []
        warnings: List[str] = []
        gap_ranges: List[Dict[str, Any]] = []

        duplicate_count = 0
        non_monotonic_count = 0
        missing_count = 0

        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        for i, cur in enumerate(raw):
            candle = Candle(
                open_time=cur.open_time,
                open=cur.open,
                high=cur.high,
                low=cur.low,
                close=cur.close,
                volume=cur.volume,
                close_time=cur.close_time,
                quote_volume=cur.quote_volume,
                trades=cur.trades,
                timestamp_utc=datetime.fromtimestamp(cur.open_time / 1000, tz=timezone.utc).isoformat(),
                is_complete=cur.close_time < now_ms,
            )

            if i > 0:
                prev = raw[i - 1]
                if cur.open_time <= prev.open_time:
                    if cur.open_time == prev.open_time:
                        duplicate_count += 1
                    else:
                        non_monotonic_count += 1
                    continue

                diff = cur.open_time - (prev.open_time + interval_ms)
                if diff >= interval_ms:
                    missed = int(diff // interval_ms)
                    missing_count += missed
                    gap_ranges.append({
                        "from": datetime.fromtimestamp(prev.open_time / 1000, tz=timezone.utc).isoformat(),
                        "to": datetime.fromtimestamp(cur.open_time / 1000, tz=timezone.utc).isoformat(),
                        "missing": missed,
                    })

            candles.append(candle)

        if len(candles) < MIN_CANDLES_REQUIRED:
            warnings.append(f"عدد الشموع ({len(candles)}) أقل من الحد الأدنى ({MIN_CANDLES_REQUIRED})")

        if missing_count > 0:
            warnings.append(f"تم رصد فجوات زمنية: فقدان {missing_count} شمعة.")

        if duplicate_count > 0:
            warnings.append(f"تم استبعاد {duplicate_count} شمعة مكررة.")

        is_clean = (missing_count == 0 and duplicate_count == 0 and non_monotonic_count == 0)

        report = DataIntegrityReport(
            symbol=symbol,
            timeframe=interval,
            total_candles=len(candles),
            start_time_utc=candles[0].timestamp_utc if candles else "N/A",
            end_time_utc=candles[-1].timestamp_utc if candles else "N/A",
            missing_candles_count=missing_count,
            duplicate_count=duplicate_count,
            non_monotonic_count=non_monotonic_count,
            gap_ranges=gap_ranges,
            is_clean=is_clean,
            warnings=warnings,
        )

        return candles, report

    def _interval_to_ms(self, interval: str) -> int:
        mapping = {
            "15m": 15 * 60 * 1000,
            "1h": 60 * 60 * 1000,
            "4h": 4 * 60 * 60 * 1000,
            "1d": 24 * 60 * 60 * 1000,
        }
        return mapping.get(interval, 60 * 60 * 1000)
