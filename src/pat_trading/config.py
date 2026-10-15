"""
Strict Safety Configuration
TRADING_ENABLED and LIVE_TRADING_ENABLED are immutable constants fixed to False.
"""

TRADING_ENABLED: bool = False
LIVE_TRADING_ENABLED: bool = False

if TRADING_ENABLED or LIVE_TRADING_ENABLED:
    raise RuntimeError("SECURITY VIOLATION: Trading must remain permanently disabled in PAT Trading.")

DEFAULT_SYMBOL: str = "BTCUSDT"
DEFAULT_TIMEFRAME: str = "1h"
DEFAULT_COMMISSION_BPS: float = 10.0  # 0.1% spot fee
DEFAULT_SLIPPAGE_BPS: float = 5.0     # 0.05% estimated slippage
MIN_CANDLES_REQUIRED: int = 100
ESTIMATED_SPACE_SIZE: int = 31_800_000
