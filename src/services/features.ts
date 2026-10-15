/**
 * Causal Feature Registry & Computation Engine
 * Enforces strict point-in-time causality:
 * - NO bfill
 * - NO centered rolling windows
 * - NO future lookahead
 * - Minimum lag guarantees: candle t close is only accessible after candle t closes
 */

import { Candle, FeatureDefinition } from '../types/quant';

export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  returns_1: {
    id: 'returns_1',
    name: 'Log Returns (1-period)',
    nameAr: 'العائد اللوغاريتمي (فترة واحدة)',
    descriptionAr: 'التغير النسبي في سعر الإغلاق مقارنة بالشمعة السابقة لمنع التشوهات غير الخطية.',
    category: 'momentum',
    lookback: 2,
    pointInTimeLag: 1,
    formulaAr: 'ln(Close_t / Close_{t-1})',
  },
  returns_5: {
    id: 'returns_5',
    name: 'Log Returns (5-period)',
    nameAr: 'العائد التراكمي (5 فترات)',
    descriptionAr: 'قوة الاتجاه على المدى القصير لخمس فترات سابقة متتالية.',
    category: 'momentum',
    lookback: 6,
    pointInTimeLag: 1,
    formulaAr: 'ln(Close_t / Close_{t-5})',
  },
  rsi_14: {
    id: 'rsi_14',
    name: 'RSI (14-period)',
    nameAr: 'مؤشر القوة النسبية RSI(14)',
    descriptionAr: 'قياس سرعة وتغير حركات الأسعار المتجهة، محصور بين 0 و100.',
    category: 'momentum',
    lookback: 15,
    pointInTimeLag: 1,
    formulaAr: '100 - (100 / (1 + RS)) عبر تجانس ويلدر',
  },
  macd_hist: {
    id: 'macd_hist',
    name: 'MACD Histogram (12, 26, 9)',
    nameAr: 'مدرج تباعد/تقارب المتوسطات MACD',
    descriptionAr: 'الفرق بين خط الماكد وخط الإشارة لتحديد تسارع الزخم وعزم المشترين.',
    category: 'momentum',
    lookback: 35,
    pointInTimeLag: 1,
    formulaAr: 'MACD_Line(12,26) - Signal_Line(9)',
  },
  sma_ratio_20_50: {
    id: 'sma_ratio_20_50',
    name: 'SMA Ratio (20/50)',
    nameAr: 'نسبة المتوسط المتحرك SMA 20/50',
    descriptionAr: 'نسبة المتوسط البسيط لـ 20 شمعة على 50 شمعة لرصد تقاطعات الاتجاه المتوسط.',
    category: 'momentum',
    lookback: 50,
    pointInTimeLag: 1,
    formulaAr: 'SMA(Close, 20) / SMA(Close, 50)',
  },
  donchian_breakout_20: {
    id: 'donchian_breakout_20',
    name: 'Donchian Breakout (20)',
    nameAr: 'مؤشر اختراق قناة دونشيان (20)',
    descriptionAr: 'موقع السعر الحالي داخل نطاق أعلى قمة وأدنى قاع لـ 20 فترة سابقة.',
    category: 'momentum',
    lookback: 20,
    pointInTimeLag: 1,
    formulaAr: '(Close_t - Low_{min,20}) / (High_{max,20} - Low_{min,20})',
  },
  realized_vol_20: {
    id: 'realized_vol_20',
    name: 'Realized Volatility (20)',
    nameAr: 'التقلب المحقق (20 فترة)',
    descriptionAr: 'الانحراف المعياري للعائدات اللوغاريتمية لـ 20 فترة سابقة مقاسًا سنويًا.',
    category: 'volatility',
    lookback: 20,
    pointInTimeLag: 1,
    formulaAr: 'std(returns_1, 20) * sqrt(365 * 24)',
  },
  garman_klass_vol: {
    id: 'garman_klass_vol',
    name: 'Garman-Klass Volatility',
    nameAr: 'تقلب جارمان-كلاس الفائق',
    descriptionAr: 'مقدّر تقلب متقدم يستغل الافتتاح والأعلى والأدنى والإغلاق لتقليل الخطأ بنسبة 70% مقارنة بالإغلاق فقط.',
    category: 'volatility',
    lookback: 1,
    pointInTimeLag: 1,
    formulaAr: '0.5 * (ln(H/L))^2 - (2*ln(2) - 1) * (ln(C/O))^2',
    sourcePaper: 'Garman & Klass (1980)',
  },
  parkinson_vol: {
    id: 'parkinson_vol',
    name: 'Parkinson Volatility',
    nameAr: 'تقلب باركنسون القائم على النطاق',
    descriptionAr: 'مقدّر كفاءة التقلب بناءً على أقصى نطاق سعري بين القمة والقاع.',
    category: 'volatility',
    lookback: 1,
    pointInTimeLag: 1,
    formulaAr: '(ln(High / Low))^2 / (4 * ln(2))',
    sourcePaper: 'Parkinson (1980)',
  },
  natr_14: {
    id: 'natr_14',
    name: 'Normalized ATR (14)',
    nameAr: 'متوسط المدى الحقيقي المنظم NATR(14)',
    descriptionAr: 'المدى الحقيقي مقسومًا على سعر الإغلاق لتطبيع المقارنة بين الأسعار المختلفة.',
    category: 'volatility',
    lookback: 15,
    pointInTimeLag: 1,
    formulaAr: 'ATR(14) / Close_t',
  },
  volume_zscore_20: {
    id: 'volume_zscore_20',
    name: 'Volume Z-Score (20)',
    nameAr: 'الانحراف المعياري للحجم (Z-Score)',
    descriptionAr: 'مقدار شذوذ حجم التداول الحالي عن متوسط حجم العشرين فترة السابقة.',
    category: 'volume',
    lookback: 20,
    pointInTimeLag: 1,
    formulaAr: '(Volume_t - Mean(Volume, 20)) / Std(Volume, 20)',
  },
  amihud_illiquidity_20: {
    id: 'amihud_illiquidity_20',
    name: 'Amihud Illiquidity (20)',
    nameAr: 'مقياس أميهود لضعف السيولة',
    descriptionAr: 'نسبة الأثر السعري المطلق لكل دولار يتم تداوله لرصد هشاشة دفتر الأوامر.',
    category: 'liquidity',
    lookback: 20,
    pointInTimeLag: 1,
    formulaAr: 'Mean(|return_t| / (Volume_t * Close_t), 20) * 1e6',
    sourcePaper: 'Amihud (2002)',
  },
  order_flow_imbalance_proxy: {
    id: 'order_flow_imbalance_proxy',
    name: 'Order Flow Imbalance Proxy',
    nameAr: 'مؤشر عدم توازن تدفق الأوامر (OFI)',
    descriptionAr: 'تقدير حجم الشراء وضغط البيع من موقع إغلاق الشمعة نسبة إلى نطاقها الكامل.',
    category: 'liquidity',
    lookback: 5,
    pointInTimeLag: 1,
    formulaAr: 'SMA( ((Close - Low) - (High - Close)) / (High - Low + 1e-8) * Volume, 5 )',
  },
  regime_vol_ratio: {
    id: 'regime_vol_ratio',
    name: 'Short/Long Volatility Ratio',
    nameAr: 'نسبة التقلب القصير/الطويل',
    descriptionAr: 'نسبة تقلب 5 فترات إلى تقلب 30 فترة لتحديد تحول النظام السريع.',
    category: 'regime',
    lookback: 30,
    pointInTimeLag: 1,
    formulaAr: 'std(returns_1, 5) / (std(returns_1, 30) + 1e-8)',
  },
};

export class FeatureEngine {
  /**
   * Computes all registered causal features for a sequence of candles.
   * STRICT CAUSALITY GUARANTEE: features[i] uses ONLY candles[0..i].
   */
  computeFeatures(candles: Candle[]): Record<string, number[]> {
    const n = candles.length;
    const result: Record<string, number[]> = {};

    // Initialize arrays with NaN
    for (const key of Object.keys(FEATURE_REGISTRY)) {
      result[key] = new Array(n).fill(NaN);
    }

    if (n < 2) return result;

    // 1. Log returns
    const logReturns = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const prev = candles[i - 1].close;
      const cur = candles[i].close;
      logReturns[i] = prev > 0 && cur > 0 ? Math.log(cur / prev) : 0;
      result.returns_1[i] = logReturns[i];

      if (i >= 5 && candles[i - 5].close > 0) {
        result.returns_5[i] = Math.log(cur / candles[i - 5].close);
      }
    }

    // 2. Garman-Klass and Parkinson Volatility
    for (let i = 0; i < n; i++) {
      const c = candles[i];
      if (c.low > 0 && c.high >= c.low && c.open > 0 && c.close > 0) {
        const logHL = Math.log(c.high / c.low);
        const logCO = Math.log(c.close / c.open);
        const gk = 0.5 * logHL * logHL - (2 * Math.LN2 - 1) * logCO * logCO;
        result.garman_klass_vol[i] = Math.max(0, gk);

        const park = (logHL * logHL) / (4 * Math.LN2);
        result.parkinson_vol[i] = Math.max(0, park);
      }
    }

    // 3. True Range and NATR
    const tr = new Array(n).fill(0);
    tr[0] = candles[0].high - candles[0].low;
    for (let i = 1; i < n; i++) {
      const c = candles[i];
      const p = candles[i - 1];
      tr[i] = Math.max(
        c.high - c.low,
        Math.abs(c.high - p.close),
        Math.abs(c.low - p.close)
      );
    }

    let atr14 = 0;
    for (let i = 0; i < n; i++) {
      if (i < 14) {
        atr14 += tr[i] / 14;
      } else {
        atr14 = (atr14 * 13 + tr[i]) / 14;
        if (candles[i].close > 0) {
          result.natr_14[i] = atr14 / candles[i].close;
        }
      }
    }

    // 4. RSI (14) with Wilder's Smoothing
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i < n; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      if (i <= 14) {
        avgGain += gain / 14;
        avgLoss += loss / 14;
        if (i === 14) {
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          result.rsi_14[i] = 100 - 100 / (1 + rs);
        }
      } else {
        avgGain = (avgGain * 13 + gain) / 14;
        avgLoss = (avgLoss * 13 + loss) / 14;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.rsi_14[i] = 100 - 100 / (1 + rs);
      }
    }

    // 5. SMA 20, SMA 50, and Donchian 20
    let sum20 = 0;
    let sum50 = 0;
    for (let i = 0; i < n; i++) {
      sum20 += candles[i].close;
      sum50 += candles[i].close;
      if (i >= 20) sum20 -= candles[i - 20].close;
      if (i >= 50) sum50 -= candles[i - 50].close;

      if (i >= 49) {
        const sma20 = sum20 / 20;
        const sma50 = sum50 / 50;
        result.sma_ratio_20_50[i] = sma50 > 0 ? sma20 / sma50 : 1;
      }

      if (i >= 19) {
        let maxHigh = -Infinity;
        let minLow = Infinity;
        for (let j = i - 19; j <= i; j++) {
          if (candles[j].high > maxHigh) maxHigh = candles[j].high;
          if (candles[j].low < minLow) minLow = candles[j].low;
        }
        const span = maxHigh - minLow;
        result.donchian_breakout_20[i] = span > 0 ? (candles[i].close - minLow) / span : 0.5;
      }
    }

    // 6. MACD (12, 26, 9)
    const k12 = 2 / (12 + 1);
    const k26 = 2 / (26 + 1);
    const k9 = 2 / (9 + 1);
    let ema12 = candles[0].close;
    let ema26 = candles[0].close;
    let signal = 0;
    let signalInitialized = false;

    for (let i = 0; i < n; i++) {
      const price = candles[i].close;
      ema12 = price * k12 + ema12 * (1 - k12);
      ema26 = price * k26 + ema26 * (1 - k26);
      const macd = ema12 - ema26;

      if (i >= 25) {
        if (!signalInitialized) {
          signal = macd;
          signalInitialized = true;
        } else {
          signal = macd * k9 + signal * (1 - k9);
        }
        result.macd_hist[i] = macd - signal;
      }
    }

    // 7. Realized Volatility (20) & Regime Vol Ratio
    for (let i = 19; i < n; i++) {
      let mean20 = 0;
      for (let j = i - 19; j <= i; j++) mean20 += logReturns[j];
      mean20 /= 20;

      let var20 = 0;
      for (let j = i - 19; j <= i; j++) {
        const d = logReturns[j] - mean20;
        var20 += d * d;
      }
      var20 /= 19;
      const std20 = Math.sqrt(var20);
      result.realized_vol_20[i] = std20 * Math.sqrt(365 * 24);

      if (i >= 29) {
        let mean5 = 0;
        for (let j = i - 4; j <= i; j++) mean5 += logReturns[j];
        mean5 /= 5;
        let var5 = 0;
        for (let j = i - 4; j <= i; j++) {
          const d = logReturns[j] - mean5;
          var5 += d * d;
        }
        const std5 = Math.sqrt(var5 / 4);

        let mean30 = 0;
        for (let j = i - 29; j <= i; j++) mean30 += logReturns[j];
        mean30 /= 30;
        let var30 = 0;
        for (let j = i - 29; j <= i; j++) {
          const d = logReturns[j] - mean30;
          var30 += d * d;
        }
        const std30 = Math.sqrt(var30 / 29);
        result.regime_vol_ratio[i] = std30 > 0 ? std5 / std30 : 1;
      }
    }

    // 8. Volume Z-Score & Amihud Illiquidity & OFI Proxy
    for (let i = 19; i < n; i++) {
      let vMean = 0;
      let amihudSum = 0;
      for (let j = i - 19; j <= i; j++) {
        vMean += candles[j].volume;
        const dollarVol = candles[j].volume * candles[j].close;
        if (dollarVol > 0) {
          amihudSum += Math.abs(logReturns[j]) / dollarVol;
        }
      }
      vMean /= 20;

      let vVar = 0;
      for (let j = i - 19; j <= i; j++) {
        const d = candles[j].volume - vMean;
        vVar += d * d;
      }
      const vStd = Math.sqrt(vVar / 19);
      result.volume_zscore_20[i] = vStd > 0 ? (candles[i].volume - vMean) / vStd : 0;
      result.amihud_illiquidity_20[i] = (amihudSum / 20) * 1e6;
    }

    for (let i = 4; i < n; i++) {
      let ofiSum = 0;
      for (let j = i - 4; j <= i; j++) {
        const c = candles[j];
        const span = c.high - c.low;
        if (span > 0) {
          const buyPressure = c.close - c.low;
          const sellPressure = c.high - c.close;
          ofiSum += ((buyPressure - sellPressure) / span) * c.volume;
        }
      }
      result.order_flow_imbalance_proxy[i] = ofiSum / 5;
    }

    return result;
  }
}

export const featureEngine = new FeatureEngine();
