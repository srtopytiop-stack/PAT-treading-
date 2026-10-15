"""
Causal Point-in-Time Feature Engine
Strictly no lookahead bias, no bfill, no centered rolling windows.
"""

import math
from typing import List, Dict
from pat_trading.market.binance import Candle


class FeatureEngine:
    def compute_features(self, candles: List[Candle]) -> Dict[str, List[float]]:
        n = len(candles)
        features: Dict[str, List[float]] = {
            "returns_1": [float("nan")] * n,
            "returns_5": [float("nan")] * n,
            "rsi_14": [float("nan")] * n,
            "macd_hist": [float("nan")] * n,
            "sma_ratio_20_50": [float("nan")] * n,
            "donchian_breakout_20": [float("nan")] * n,
            "garman_klass_vol": [float("nan")] * n,
            "parkinson_vol": [float("nan")] * n,
            "amihud_illiquidity_20": [float("nan")] * n,
            "volume_zscore_20": [float("nan")] * n,
            "order_flow_imbalance_proxy": [float("nan")] * n,
        }

        if n < 2:
            return features

        log_returns = [0.0] * n
        for i in range(1, n):
            prev = candles[i - 1].close
            cur = candles[i].close
            r = math.log(cur / prev) if prev > 0 and cur > 0 else 0.0
            log_returns[i] = r
            features["returns_1"][i] = r

            if i >= 5 and candles[i - 5].close > 0:
                features["returns_5"][i] = math.log(cur / candles[i - 5].close)

        # Volatility: Garman-Klass and Parkinson
        for i in range(n):
            c = candles[i]
            if c.low > 0 and c.high >= c.low and c.open > 0 and c.close > 0:
                log_hl = math.log(c.high / c.low)
                log_co = math.log(c.close / c.open)
                gk = 0.5 * (log_hl ** 2) - (2 * math.log(2) - 1) * (log_co ** 2)
                features["garman_klass_vol"][i] = max(0.0, gk)
                park = (log_hl ** 2) / (4 * math.log(2))
                features["parkinson_vol"][i] = max(0.0, park)

        # RSI 14 (Wilder's)
        avg_gain = 0.0
        avg_loss = 0.0
        for i in range(1, n):
            diff = candles[i].close - candles[i - 1].close
            gain = diff if diff > 0 else 0.0
            loss = -diff if diff < 0 else 0.0

            if i <= 14:
                avg_gain += gain / 14
                avg_loss += loss / 14
                if i == 14:
                    rs = 100.0 if avg_loss == 0 else avg_gain / avg_loss
                    features["rsi_14"][i] = 100.0 - (100.0 / (1.0 + rs))
            else:
                avg_gain = (avg_gain * 13 + gain) / 14
                avg_loss = (avg_loss * 13 + loss) / 14
                rs = 100.0 if avg_loss == 0 else avg_gain / avg_loss
                features["rsi_14"][i] = 100.0 - (100.0 / (1.0 + rs))

        # SMA 20 / 50 and Donchian 20
        sum20 = 0.0
        sum50 = 0.0
        for i in range(n):
            sum20 += candles[i].close
            sum50 += candles[i].close
            if i >= 20:
                sum20 -= candles[i - 20].close
            if i >= 50:
                sum50 -= candles[i - 50].close

            if i >= 49:
                sma20 = sum20 / 20
                sma50 = sum50 / 50
                features["sma_ratio_20_50"][i] = sma20 / sma50 if sma50 > 0 else 1.0

            if i >= 19:
                highs = [candles[j].high for j in range(i - 19, i + 1)]
                lows = [candles[j].low for j in range(i - 19, i + 1)]
                max_h = max(highs)
                min_l = min(lows)
                span = max_h - min_l
                features["donchian_breakout_20"][i] = (candles[i].close - min_l) / span if span > 0 else 0.5

        # MACD (12, 26, 9)
        k12 = 2 / 13
        k26 = 2 / 27
        k9 = 2 / 10
        ema12 = candles[0].close
        ema26 = candles[0].close
        signal = 0.0
        signal_init = False

        for i in range(n):
            p = candles[i].close
            ema12 = p * k12 + ema12 * (1 - k12)
            ema26 = p * k26 + ema26 * (1 - k26)
            macd = ema12 - ema26

            if i >= 25:
                if not signal_init:
                    signal = macd
                    signal_init = True
                else:
                    signal = macd * k9 + signal * (1 - k9)
                features["macd_hist"][i] = macd - signal

        # Volume Z-score & Amihud illiquidity
        for i in range(19, n):
            window_v = [candles[j].volume for j in range(i - 19, i + 1)]
            v_mean = sum(window_v) / 20
            v_var = sum((v - v_mean) ** 2 for v in window_v) / 19
            v_std = math.sqrt(v_var)
            features["volume_zscore_20"][i] = (candles[i].volume - v_mean) / v_std if v_std > 0 else 0.0

            amihud_sum = 0.0
            for j in range(i - 19, i + 1):
                dvol = candles[j].volume * candles[j].close
                if dvol > 0:
                    amihud_sum += abs(log_returns[j]) / dvol
            features["amihud_illiquidity_20"][i] = (amihud_sum / 20) * 1e6

        return features
