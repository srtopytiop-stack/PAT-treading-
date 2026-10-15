"""
Simulation Backtest Engine
Spot Long / Cash only. Strictly separates signal time (t close) from execution time (t+1 open).
"""

import math
from dataclasses import dataclass, field
from typing import List
from pat_trading.market.binance import Candle
from pat_trading.config import TRADING_ENABLED, LIVE_TRADING_ENABLED, DEFAULT_COMMISSION_BPS, DEFAULT_SLIPPAGE_BPS

if TRADING_ENABLED or LIVE_TRADING_ENABLED:
    raise RuntimeError("SECURITY VIOLATION: Backtesting must remain strictly simulated.")


@dataclass
class BacktestResult:
    total_candles: int
    initial_capital: float
    ending_capital: float
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    trade_count: int
    win_rate: float
    equity_curve: List[float] = field(default_factory=list)


class BacktestEngine:
    def run_backtest(
        self,
        candles: List[Candle],
        entry_signals: List[bool],
        exit_signals: List[bool],
        initial_capital: float = 10000.0,
        commission_bps: float = DEFAULT_COMMISSION_BPS,
        slippage_bps: float = DEFAULT_SLIPPAGE_BPS,
    ) -> BacktestResult:
        n = len(candles)
        if n < 2:
            return BacktestResult(
                total_candles=n,
                initial_capital=initial_capital,
                ending_capital=initial_capital,
                total_return=0.0,
                sharpe_ratio=0.0,
                max_drawdown=0.0,
                trade_count=0,
                win_rate=0.0,
                equity_curve=[initial_capital] * n,
            )

        cost_rate = (commission_bps + slippage_bps) / 10000.0

        capital = initial_capital
        position = 0
        entry_price = 0.0
        peak = capital
        max_dd = 0.0

        trades_pnl = []
        equity_curve = [capital]

        for i in range(1, n):
            prev_sig_idx = i - 1
            cur = candles[i]
            exec_price = cur.open

            # Exit if in position and signal occurred at previous candle close
            if position == 1 and exit_signals[prev_sig_idx]:
                eff_exit = exec_price * (1.0 - cost_rate)
                pnl = capital * ((eff_exit - entry_price) / entry_price)
                capital += pnl
                trades_pnl.append(pnl)
                position = 0

            # Entry if cash and signal occurred at previous candle close
            if position == 0 and entry_signals[prev_sig_idx]:
                position = 1
                entry_price = exec_price * (1.0 + cost_rate)

            # Mark to market at candle close
            cur_eq = capital
            if position == 1 and entry_price > 0:
                cur_eq = capital * (cur.close / entry_price)

            if cur_eq > peak:
                peak = cur_eq
            dd = (peak - cur_eq) / peak if peak > 0 else 0.0
            if dd > max_dd:
                max_dd = dd

            equity_curve.append(cur_eq)

        # Force close at end
        if position == 1 and entry_price > 0:
            eff_exit = candles[-1].close * (1.0 - cost_rate)
            pnl = capital * ((eff_exit - entry_price) / entry_price)
            capital += pnl
            trades_pnl.append(pnl)

        # Calculate returns and Sharpe
        step_returns = []
        for j in range(1, len(equity_curve)):
            prev_e = equity_curve[j - 1]
            cur_e = equity_curve[j]
            step_returns.append((cur_e - prev_e) / prev_e if prev_e > 0 else 0.0)

        ret_mean = sum(step_returns) / len(step_returns) if step_returns else 0.0
        ret_var = sum((r - ret_mean) ** 2 for r in step_returns) / max(1, len(step_returns) - 1)
        ret_std = math.sqrt(ret_var)
        periods_per_year = 365 * 24
        sharpe = (ret_mean / ret_std) * math.sqrt(periods_per_year) if ret_std > 0 else 0.0

        wins = [p for p in trades_pnl if p > 0]
        win_rate = len(wins) / len(trades_pnl) if trades_pnl else 0.0
        tot_return = (capital - initial_capital) / initial_capital

        return BacktestResult(
            total_candles=n,
            initial_capital=initial_capital,
            ending_capital=capital,
            total_return=tot_return,
            sharpe_ratio=sharpe,
            max_drawdown=max_dd,
            trade_count=len(trades_pnl),
            win_rate=win_rate,
            equity_curve=equity_curve,
        )
