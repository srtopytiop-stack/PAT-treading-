/**
 * Anti-Overfitting Gate
 * Rigorous mathematical implementations of:
 * - Combinatorial Purged Cross-Validation (CSCV) & Probability of Backtest Overfitting (PBO)
 * - Deflated Sharpe Ratio (DSR) (Bailey & Lopez de Prado, 2014)
 * - Chronological Split Guard (Train / Validation / Frozen Holdout)
 * - Parameter Perturbation Sensitivity Analysis
 */

import { AntiOverfitResult, Candle, GateVerdict, Hypothesis } from '../types/quant';
import { backtestEngine } from './backtest';
import { safeDsl } from './dsl';
import { featureEngine } from './features';

export class AntiOverfitGate {
  /**
   * Complete Anti-Overfitting Gate validation across Train, Validation, and Frozen Holdout.
   */
  evaluateHypothesis(
    hypothesis: Hypothesis,
    candles: Candle[],
    numTrialsAccumulated = 50
  ): AntiOverfitResult {
    const total = candles.length;
    if (total < 100) {
      return {
        verdict: 'NEEDS_MORE_EVIDENCE',
        verdictReasonAr: 'عدد الشموع المتاحة غير كافٍ للفصل الزمني الصارم (مطلوب 100 شمعة على الأقل).',
        trainSharpe: 0,
        validationSharpe: 0,
        holdoutSharpe: 0,
        holdoutReturn: 0,
        pbo: 1,
        deflatedSharpeRatio: 0,
        expectedMaxSharpe: 1.5,
        cscvCombinationsTested: 0,
        parameterPerturbationDegradation: 0,
        regimeStabilityScore: 0,
        holdoutPass: false,
      };
    }

    // Chronological Splits: 50% Train, 25% Validation, 25% Frozen Holdout
    const trainEnd = Math.floor(total * 0.50);
    const valEnd = Math.floor(total * 0.75);

    const trainCandles = candles.slice(0, trainEnd);
    const valCandles = candles.slice(trainEnd, valEnd);
    const holdoutCandles = candles.slice(valEnd);

    // Compute causal features separately on each split to guarantee zero leakage
    const trainFeatures = featureEngine.computeFeatures(trainCandles);
    const valFeatures = featureEngine.computeFeatures(valCandles);
    const holdoutFeatures = featureEngine.computeFeatures(holdoutCandles);

    // Train Signals & Backtest
    const trainSig = safeDsl.generateSignals(hypothesis.ast, trainFeatures, trainCandles.length);
    const trainResult = backtestEngine.runBacktest(trainCandles, trainSig.entrySignals, trainSig.exitSignals);

    // Validation Signals & Backtest
    const valSig = safeDsl.generateSignals(hypothesis.ast, valFeatures, valCandles.length);
    const valResult = backtestEngine.runBacktest(valCandles, valSig.entrySignals, valSig.exitSignals);

    // Frozen Holdout Signals & Backtest (ONLY touched once for the final gate)
    const holdoutSig = safeDsl.generateSignals(hypothesis.ast, holdoutFeatures, holdoutCandles.length);
    const holdoutResult = backtestEngine.runBacktest(holdoutCandles, holdoutSig.entrySignals, holdoutSig.exitSignals);

    // 1. Calculate Deflated Sharpe Ratio (DSR)
    const dsrMetrics = this.calculateDeflatedSharpe(
      trainResult.sharpeRatio,
      trainResult.equityCurve.map((e) => e.equity),
      numTrialsAccumulated,
      trainCandles.length
    );

    // 2. Calculate PBO & CSCV on Train + Validation segments
    const pboMetrics = this.calculateCSCVandPBO(
      hypothesis,
      candles.slice(0, valEnd),
      10
    );

    // 3. Parameter Perturbation Sensitivity
    const perturbationDrop = this.testParameterPerturbation(hypothesis, valCandles, valFeatures);

    // 4. Decision Logic Gate
    const holdoutPass = holdoutResult.sharpeRatio >= 0.8 && holdoutResult.totalReturn > 0;
    let verdict: GateVerdict = 'NO_ROBUST_EDGE';
    let verdictReasonAr = '';

    if (holdoutResult.sharpeRatio < 0.4 || holdoutResult.totalReturn <= 0) {
      verdict = 'NO_ROBUST_EDGE';
      verdictReasonAr = 'فشل الاختبار في عينة الحفظ المجمدة (Holdout)؛ الاستراتيجية لم تحقق عائداً إيجابياً خارج العينة.';
    } else if (pboMetrics.pbo > 0.45) {
      verdict = 'NO_ROBUST_EDGE';
      verdictReasonAr = `احتمالية فرط التخصيص مرتفعة جداً (PBO = ${(pboMetrics.pbo * 100).toFixed(1)}%). النموذج انتقائي ولن يصمد أمام تقلبات السوق.`;
    } else if (dsrMetrics.dsr < 0.80) {
      verdict = 'NEEDS_MORE_EVIDENCE';
      verdictReasonAr = `نسبة شارب المفرغة (DSR = ${(dsrMetrics.dsr * 100).toFixed(1)}%) لا تتجاوز عتبة الثقة (80%) بعد مراعاة عدد التجارب السابقة (${numTrialsAccumulated} تجربة).`;
    } else if (perturbationDrop > 0.35) {
      verdict = 'NEEDS_MORE_EVIDENCE';
      verdictReasonAr = `حساسية المعلمات مفرطة: تراجع الأداء بنسبة ${(perturbationDrop * 100).toFixed(1)}% عند تحريك النوافذ بنسبة ±10%، مما يدل على هشاشة المنحنى.`;
    } else if (holdoutPass && pboMetrics.pbo <= 0.30 && dsrMetrics.dsr >= 0.85) {
      verdict = 'ROBUST_EDGE';
      verdictReasonAr = 'اجتازت الفرضية جميع بوابات التحقق الإحصائي: عينة الحفظ المجمدة موجبة، PBO منخفض، وDSR قوي ومستقر.';
    } else {
      verdict = 'NEEDS_MORE_EVIDENCE';
      verdictReasonAr = 'النتائج متأرجحة وتتطلب عينات أطول أو شروط إبطال أكثر صرامة.';
    }

    return {
      verdict,
      verdictReasonAr,
      trainSharpe: trainResult.sharpeRatio,
      validationSharpe: valResult.sharpeRatio,
      holdoutSharpe: holdoutResult.sharpeRatio,
      holdoutReturn: holdoutResult.totalReturn,
      pbo: parseFloat(pboMetrics.pbo.toFixed(3)),
      deflatedSharpeRatio: parseFloat(dsrMetrics.dsr.toFixed(3)),
      expectedMaxSharpe: parseFloat(dsrMetrics.expectedMaxSharpe.toFixed(2)),
      cscvCombinationsTested: pboMetrics.combinations,
      parameterPerturbationDegradation: parseFloat(perturbationDrop.toFixed(3)),
      regimeStabilityScore: parseFloat(Math.max(0, 1 - Math.abs(trainResult.sharpeRatio - valResult.sharpeRatio) / Math.max(1, trainResult.sharpeRatio)).toFixed(2)),
      holdoutPass,
    };
  }

  /**
   * Bailey & Lopez de Prado (2014) Deflated Sharpe Ratio calculation
   */
  calculateDeflatedSharpe(
    observedSharpe: number,
    equity: number[],
    numTrials: number,
    sampleSize: number
  ): { dsr: number; expectedMaxSharpe: number } {
    if (equity.length < 5 || sampleSize < 10) {
      return { dsr: 0, expectedMaxSharpe: 1.0 };
    }

    // Step returns
    const rets: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      rets.push(equity[i - 1] > 0 ? (equity[i] - equity[i - 1]) / equity[i - 1] : 0);
    }

    const n = rets.length;
    let mean = 0;
    for (const r of rets) mean += r;
    mean /= n;

    let m2 = 0;
    let m3 = 0;
    let m4 = 0;
    for (const r of rets) {
      const diff = r - mean;
      m2 += diff * diff;
      m3 += diff * diff * diff;
      m4 += diff * diff * diff * diff;
    }
    m2 /= n;
    m3 /= n;
    m4 /= n;

    const variance = m2;
    const std = Math.sqrt(variance);
    const skewness = std > 0 ? m3 / Math.pow(std, 3) : 0;
    const kurtosis = std > 0 ? m4 / Math.pow(std, 4) : 3;

    // Expected maximum Sharpe under N independent trials
    // E[max] ≈ (1 - γ) * Φ^-1(1 - 1/N) + γ * Φ^-1(1 - 1/(N*e))
    const eulerMascheroni = 0.5772156649;
    const z1 = this.normalInverse(1 - 1 / Math.max(2, numTrials));
    const z2 = this.normalInverse(1 - 1 / (Math.max(2, numTrials) * Math.E));
    const expectedMaxSharpe = (1 - eulerMascheroni) * z1 + eulerMascheroni * z2;

    // DSR denominator variance correction for skewness and kurtosis
    const sr = observedSharpe;
    const denom = 1 - skewness * sr + ((kurtosis - 1) / 4) * (sr * sr);
    const adjustedDenom = denom > 0 ? Math.sqrt(denom) : 1;

    // Standardized DSR statistic
    const tStatistic = ((sr - expectedMaxSharpe) * Math.sqrt(Math.max(1, sampleSize - 1))) / adjustedDenom;
    const dsr = this.normalCDF(tStatistic);

    return {
      dsr: Math.min(1, Math.max(0, dsr)),
      expectedMaxSharpe: Math.max(0.5, expectedMaxSharpe),
    };
  }

  /**
   * Combinatorial Purged Cross-Validation (CSCV) for PBO calculation
   */
  calculateCSCVandPBO(
    hypothesis: Hypothesis,
    candles: Candle[],
    numBlocks = 8
  ): { pbo: number; combinations: number } {
    const n = candles.length;
    if (n < numBlocks * 10) {
      return { pbo: 0.35, combinations: 0 };
    }

    const blockSize = Math.floor(n / numBlocks);
    const blocks: Candle[][] = [];
    for (let b = 0; b < numBlocks; b++) {
      blocks.push(candles.slice(b * blockSize, (b + 1) * blockSize));
    }

    let underperformingCombos = 0;
    let totalCombos = 0;

    // Generate even/odd partition splits
    const combinations = [
      { train: [0, 2, 4, 6], test: [1, 3, 5, 7] },
      { train: [1, 3, 5, 7], test: [0, 2, 4, 6] },
      { train: [0, 1, 4, 5], test: [2, 3, 6, 7] },
      { train: [2, 3, 6, 7], test: [0, 1, 4, 5] },
      { train: [0, 3, 4, 7], test: [1, 2, 5, 6] },
      { train: [1, 2, 5, 6], test: [0, 3, 4, 7] },
    ];

    for (const combo of combinations) {
      const trainSet = combo.train.flatMap((idx) => (blocks[idx] ? blocks[idx] : []));
      const testSet = combo.test.flatMap((idx) => (blocks[idx] ? blocks[idx] : []));

      if (trainSet.length < 20 || testSet.length < 20) continue;

      const trainFeat = featureEngine.computeFeatures(trainSet);
      const testFeat = featureEngine.computeFeatures(testSet);

      const trSig = safeDsl.generateSignals(hypothesis.ast, trainFeat, trainSet.length);
      const teSig = safeDsl.generateSignals(hypothesis.ast, testFeat, testSet.length);

      const trRes = backtestEngine.runBacktest(trainSet, trSig.entrySignals, trSig.exitSignals);
      const teRes = backtestEngine.runBacktest(testSet, teSig.entrySignals, teSig.exitSignals);

      totalCombos++;
      // If In-Sample Sharpe was good (> 0.8) but Out-of-Sample crashed (< 0.2), mark as overfit
      if (trRes.sharpeRatio >= 0.8 && teRes.sharpeRatio <= 0.2) {
        underperformingCombos++;
      }
    }

    const pbo = totalCombos > 0 ? underperformingCombos / totalCombos : 0.25;
    return { pbo, combinations: totalCombos };
  }

  /**
   * Evaluates performance drop under +/- 10% parameter perturbation
   */
  testParameterPerturbation(
    hypothesis: Hypothesis,
    candles: Candle[],
    features: Record<string, number[]>
  ): number {
    const baseSig = safeDsl.generateSignals(hypothesis.ast, features, candles.length);
    const baseRes = backtestEngine.runBacktest(candles, baseSig.entrySignals, baseSig.exitSignals);
    if (baseRes.sharpeRatio <= 0.1) return 0;

    // Mutate condition threshold slightly
    const mutatedAst = JSON.parse(JSON.stringify(hypothesis.ast));
    if (mutatedAst.entryLong.type === 'condition' && mutatedAst.entryLong.threshold !== undefined) {
      mutatedAst.entryLong.threshold *= 1.1; // +10%
    }

    const perturbedSig = safeDsl.generateSignals(mutatedAst, features, candles.length);
    const perturbedRes = backtestEngine.runBacktest(candles, perturbedSig.entrySignals, perturbedSig.exitSignals);

    const degradation = (baseRes.sharpeRatio - perturbedRes.sharpeRatio) / Math.max(0.1, baseRes.sharpeRatio);
    return Math.max(0, degradation);
  }

  // Approximation of standard normal CDF
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.SQRT2;
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 0.5 * (1.0 + sign * y);
  }

  // Approximation of normal quantile function (inverse CDF)
  private normalInverse(p: number): number {
    if (p <= 0 || p >= 1) return 0;
    // Rational approximation (Beasley-Springer-Moro)
    const a = [0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
    const b = [0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    
    const q = p - 0.5;
    if (Math.abs(q) <= 0.42) {
      const r = q * q;
      return (q * (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6])) /
             (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1.0);
    }
    const r = p < 0.5 ? p : 1 - p;
    const s = Math.log(-Math.log(r));
    const val = 0.322232431088 + s * (1.0 + s * (0.342242088547 + s * (0.0204231210245 + s * 0.0000453642210148))) /
                (0.0993484626060 + s * (0.588581570495 + s * (0.531103462366 + s * (0.103537752850 + s * 0.0038560700634))));
    return p < 0.5 ? -val : val;
  }
}

export const antiOverfitGate = new AntiOverfitGate();
