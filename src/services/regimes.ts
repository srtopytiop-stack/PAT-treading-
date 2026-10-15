/**
 * Market Regimes and Volatility Dependence Engine
 * - 3-State Regime Detector (Bull Trend, Bear Trend, Sideways Volatile)
 * - Recursive GARCH(1,1)-like conditional variance
 * - CUSUM Change Point Detection on standardized returns
 * - Rolling cross-asset correlation & systemic dependence
 */

import { Candle, MarketRegimeState, RegimeType } from '../types/quant';

export class RegimesEngine {
  /**
   * Classify market regime, compute GARCH volatility, and detect structural change points.
   */
  analyzeRegime(candles: Candle[]): MarketRegimeState {
    const n = candles.length;
    if (n < 20) {
      return {
        currentRegime: 'SIDEWAYS_VOLATILE',
        regimeProbabilities: { BULL_TREND: 0.33, BEAR_TREND: 0.33, SIDEWAYS_VOLATILE: 0.34 },
        garchAnnualizedVol: 0.45,
        changePointDetected: false,
        regimeHistory: [],
      };
    }

    // 1. Recursive GARCH(1,1) Volatility
    // sigma_t^2 = omega + alpha * eps_{t-1}^2 + beta * sigma_{t-1}^2
    const omega = 0.00001;
    const alpha = 0.08;
    const beta = 0.88;

    const returns: number[] = new Array(n).fill(0);
    const garchVol: number[] = new Array(n).fill(0.015);

    let sigma2 = 0.000225; // initial variance (0.015^2)

    for (let i = 1; i < n; i++) {
      const prev = candles[i - 1].close;
      const cur = candles[i].close;
      const r = prev > 0 ? Math.log(cur / prev) : 0;
      returns[i] = r;

      const eps2 = r * r;
      sigma2 = omega + alpha * eps2 + beta * sigma2;
      garchVol[i] = Math.sqrt(Math.max(1e-7, sigma2));
    }

    // Annualized GARCH vol for 1h candles: sqrt(365 * 24)
    const currentGarchAnnualized = garchVol[n - 1] * Math.sqrt(365 * 24);

    // 2. Regime History & Probabilities (30-period lookback rolling)
    const regimeHistory: { time: number; regime: RegimeType; vol: number }[] = [];
    const window = Math.min(30, n);

    let bullScore = 0;
    let bearScore = 0;
    let sidewaysScore = 0;

    for (let i = window; i < n; i++) {
      const startPrice = candles[i - window].close;
      const endPrice = candles[i].close;
      const drift = (endPrice - startPrice) / startPrice;
      const vol = garchVol[i] * Math.sqrt(365 * 24);

      let rType: RegimeType = 'SIDEWAYS_VOLATILE';
      if (drift > 0.04 && vol < 0.75) {
        rType = 'BULL_TREND';
      } else if (drift < -0.04) {
        rType = 'BEAR_TREND';
      } else {
        rType = 'SIDEWAYS_VOLATILE';
      }

      regimeHistory.push({
        time: candles[i].openTime,
        regime: rType,
        vol: parseFloat(vol.toFixed(4)),
      });

      if (i >= n - 15) {
        if (rType === 'BULL_TREND') bullScore++;
        else if (rType === 'BEAR_TREND') bearScore++;
        else sidewaysScore++;
      }
    }

    const totalScore = Math.max(1, bullScore + bearScore + sidewaysScore);
    const probBull = bullScore / totalScore;
    const probBear = bearScore / totalScore;
    const probSideways = sidewaysScore / totalScore;

    let currentRegime: RegimeType = 'SIDEWAYS_VOLATILE';
    if (probBull >= probBear && probBull >= probSideways) currentRegime = 'BULL_TREND';
    else if (probBear >= probBull && probBear >= probSideways) currentRegime = 'BEAR_TREND';
    else currentRegime = 'SIDEWAYS_VOLATILE';

    // 3. CUSUM Change Point Detector
    let cusumPos = 0;
    let cusumNeg = 0;
    let changePointDetected = false;
    const threshold = 4.0; // 4 standard deviations

    for (let i = n - 20; i < n; i++) {
      const z = garchVol[i] > 0 ? returns[i] / garchVol[i] : 0;
      cusumPos = Math.max(0, cusumPos + z - 0.5);
      cusumNeg = Math.min(0, cusumNeg + z + 0.5);

      if (cusumPos > threshold || cusumNeg < -threshold) {
        changePointDetected = true;
        break;
      }
    }

    return {
      currentRegime,
      regimeProbabilities: {
        BULL_TREND: parseFloat(probBull.toFixed(2)),
        BEAR_TREND: parseFloat(probBear.toFixed(2)),
        SIDEWAYS_VOLATILE: parseFloat(probSideways.toFixed(2)),
      },
      garchAnnualizedVol: parseFloat(currentGarchAnnualized.toFixed(4)),
      changePointDetected,
      regimeHistory,
    };
  }

  /**
   * Computes Pearson cross-asset correlation matrix
   */
  computeCrossAssetCorrelation(
    seriesA: number[],
    seriesB: number[]
  ): number {
    const len = Math.min(seriesA.length, seriesB.length);
    if (len < 5) return 0;

    let meanA = 0;
    let meanB = 0;
    for (let i = 0; i < len; i++) {
      meanA += seriesA[i];
      meanB += seriesB[i];
    }
    meanA /= len;
    meanB /= len;

    let cov = 0;
    let varA = 0;
    let varB = 0;

    for (let i = 0; i < len; i++) {
      const da = seriesA[i] - meanA;
      const db = seriesB[i] - meanB;
      cov += da * db;
      varA += da * da;
      varB += db * db;
    }

    const denom = Math.sqrt(varA * varB);
    return denom > 0 ? parseFloat((cov / denom).toFixed(3)) : 0;
  }
}

export const regimesEngine = new RegimesEngine();
