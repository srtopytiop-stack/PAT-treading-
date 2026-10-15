/**
 * Quantitative Simulation and Backtesting Engine
 * Spot Long / Cash ONLY. No leverage, no shorting, no derivatives.
 * Strictly separates signal time (t close) from execution time (t+1 open).
 * Enforces real-world transaction costs (commissions + slippage).
 */

import { APP_CONFIG, TRADING_ENABLED, LIVE_TRADING_ENABLED } from '../config/constants';
import { BacktestResult, Candle, EquityPoint, MonteCarloResult, Trade } from '../types/quant';

export class BacktestEngine {
  constructor() {
    if (TRADING_ENABLED || LIVE_TRADING_ENABLED) {
      throw new Error('SECURITY VIOLATION: Backtesting must remain strictly simulated.');
    }
  }

  /**
   * Runs a rigorous point-in-time backtest on Spot Long / Cash only.
   */
  runBacktest(
    candles: Candle[],
    entrySignals: boolean[],
    exitSignals: boolean[],
    initialCapital = 10000,
    commissionBps = APP_CONFIG.DEFAULT_COMMISSION_BPS,
    slippageBps = APP_CONFIG.DEFAULT_SLIPPAGE_BPS,
    stopLossPct = 0.05,
    takeProfitPct = 0.15
  ): BacktestResult {
    const n = candles.length;
    if (n < 2) {
      return this.emptyResult(candles, initialCapital);
    }

    const commissionRate = commissionBps / 10000;
    const slippageRate = slippageBps / 10000;
    const totalCostRate = commissionRate + slippageRate;

    let capital = initialCapital;
    let position: 0 | 1 = 0;
    let entryPrice = 0;
    let entryIndex = 0;
    let peakCapital = initialCapital;
    let maxDrawdown = 0;
    let currentDdDuration = 0;
    let maxDdDuration = 0;

    const trades: Trade[] = [];
    const equityCurve: EquityPoint[] = [];

    const benchmarkInitial = candles[0].close;

    // First candle
    equityCurve.push({
      timestamp: candles[0].openTime,
      equity: capital,
      drawdown: 0,
      position: 0,
      benchmarkEquity: initialCapital,
    });

    // CAUSAL LOOP: Signal generated at i-1 close -> Executed at i open
    for (let i = 1; i < n; i++) {
      const prevSignalIndex = i - 1;
      const curCandle = candles[i];
      const execPrice = curCandle.open;

      // Check intra-candle stop-loss / take-profit if in position
      if (position === 1) {
        const dropPct = (entryPrice - curCandle.low) / entryPrice;
        const gainPct = (curCandle.high - entryPrice) / entryPrice;

        if (stopLossPct > 0 && dropPct >= stopLossPct) {
          // Exit on stop loss
          const exitPrice = entryPrice * (1 - stopLossPct) * (1 - totalCostRate);
          const pnl = capital * ((exitPrice - entryPrice) / entryPrice);
          capital = Math.max(10, capital + pnl);
          trades.push({
            entryIndex,
            entryTime: candles[entryIndex].openTime,
            entryPrice,
            exitIndex: i,
            exitTime: curCandle.openTime,
            exitPrice,
            pnl,
            pnlPercent: (exitPrice - entryPrice) / entryPrice,
            holdingPeriods: i - entryIndex,
            reason: 'stop_loss',
          });
          position = 0;
        } else if (takeProfitPct > 0 && gainPct >= takeProfitPct) {
          // Exit on take profit
          const exitPrice = entryPrice * (1 + takeProfitPct) * (1 - totalCostRate);
          const pnl = capital * ((exitPrice - entryPrice) / entryPrice);
          capital = Math.max(10, capital + pnl);
          trades.push({
            entryIndex,
            entryTime: candles[entryIndex].openTime,
            entryPrice,
            exitIndex: i,
            exitTime: curCandle.openTime,
            exitPrice,
            pnl,
            pnlPercent: (exitPrice - entryPrice) / entryPrice,
            holdingPeriods: i - entryIndex,
            reason: 'take_profit',
          });
          position = 0;
        }
      }

      // Check signal-based exit
      if (position === 1 && exitSignals[prevSignalIndex]) {
        const effectiveExitPrice = execPrice * (1 - totalCostRate);
        const pnl = capital * ((effectiveExitPrice - entryPrice) / entryPrice);
        capital = Math.max(10, capital + pnl);
        trades.push({
          entryIndex,
          entryTime: candles[entryIndex].openTime,
          entryPrice,
          exitIndex: i,
          exitTime: curCandle.openTime,
          exitPrice: effectiveExitPrice,
          pnl,
          pnlPercent: (effectiveExitPrice - entryPrice) / entryPrice,
          holdingPeriods: i - entryIndex,
          reason: 'signal_exit',
        });
        position = 0;
      }

      // Check signal-based entry
      if (position === 0 && entrySignals[prevSignalIndex]) {
        position = 1;
        entryIndex = i;
        entryPrice = execPrice * (1 + totalCostRate);
      }

      // Mark-to-market valuation at candle close
      let currentEquity = capital;
      if (position === 1) {
        currentEquity = capital * (curCandle.close / entryPrice);
      }

      if (currentEquity > peakCapital) {
        peakCapital = currentEquity;
        currentDdDuration = 0;
      } else {
        currentDdDuration++;
        if (currentDdDuration > maxDdDuration) {
          maxDdDuration = currentDdDuration;
        }
      }

      const dd = peakCapital > 0 ? (peakCapital - currentEquity) / peakCapital : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;

      const benchmarkEquity = benchmarkInitial > 0 ? initialCapital * (curCandle.close / benchmarkInitial) : initialCapital;

      equityCurve.push({
        timestamp: curCandle.openTime,
        equity: parseFloat(currentEquity.toFixed(2)),
        drawdown: parseFloat(dd.toFixed(4)),
        position,
        benchmarkEquity: parseFloat(benchmarkEquity.toFixed(2)),
      });
    }

    // Force close open position at the very end
    if (position === 1) {
      const finalCandle = candles[n - 1];
      const effectiveExitPrice = finalCandle.close * (1 - totalCostRate);
      const pnl = capital * ((effectiveExitPrice - entryPrice) / entryPrice);
      capital = Math.max(10, capital + pnl);
      trades.push({
        entryIndex,
        entryTime: candles[entryIndex].openTime,
        entryPrice,
        exitIndex: n - 1,
        exitTime: finalCandle.closeTime,
        exitPrice: effectiveExitPrice,
        pnl,
        pnlPercent: (effectiveExitPrice - entryPrice) / entryPrice,
        holdingPeriods: n - 1 - entryIndex,
        reason: 'end_of_period',
      });
    }

    // Compute returns series
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevE = equityCurve[i - 1].equity;
      const curE = equityCurve[i].equity;
      returns.push(prevE > 0 ? (curE - prevE) / prevE : 0);
    }

    const totalReturn = (capital - initialCapital) / initialCapital;
    const periodsPerYear = 365 * 24; // 1-hour default
    const annualizedReturn = Math.pow(Math.max(0.01, 1 + totalReturn), periodsPerYear / Math.max(1, n)) - 1;

    // Sharpe and Sortino
    let meanReturn = 0;
    for (const r of returns) meanReturn += r;
    meanReturn = returns.length > 0 ? meanReturn / returns.length : 0;

    let varReturn = 0;
    let downsideVar = 0;
    for (const r of returns) {
      const d = r - meanReturn;
      varReturn += d * d;
      if (r < 0) downsideVar += r * r;
    }
    const stdReturn = returns.length > 1 ? Math.sqrt(varReturn / (returns.length - 1)) : 0;
    const downsideStd = returns.length > 1 ? Math.sqrt(downsideVar / (returns.length - 1)) : 0;

    const sharpeRatio = stdReturn > 0 ? (meanReturn / stdReturn) * Math.sqrt(periodsPerYear) : 0;
    const sortinoRatio = downsideStd > 0 ? (meanReturn / downsideStd) * Math.sqrt(periodsPerYear) : 0;
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

    // Win Rate & Profit Factor
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

    // Tail Metrics: Historical VaR 95% and Expected Shortfall
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * 0.05);
    const valueAtRisk95 = sortedReturns.length > 0 ? -sortedReturns[varIndex] : 0;
    
    let esSum = 0;
    const esCount = Math.max(1, varIndex);
    for (let k = 0; k < esCount; k++) {
      esSum += sortedReturns[k] || 0;
    }
    const expectedShortfall95 = Math.abs(esSum / esCount);

    return {
      symbol: candles[0].openTime ? 'SpotAsset' : 'Asset',
      timeframe: '1h',
      periodStart: candles[0].openTime,
      periodEnd: candles[n - 1].closeTime,
      totalCandles: n,
      initialCapital,
      endingCapital: parseFloat(capital.toFixed(2)),
      totalReturn: parseFloat(totalReturn.toFixed(4)),
      annualizedReturn: parseFloat(annualizedReturn.toFixed(4)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
      calmarRatio: parseFloat(calmarRatio.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(4)),
      maxDrawdownDuration: maxDdDuration,
      winRate: parseFloat(winRate.toFixed(4)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      tradeCount: trades.length,
      avgTradeReturn: trades.length > 0 ? totalReturn / trades.length : 0,
      valueAtRisk95: parseFloat(valueAtRisk95.toFixed(4)),
      expectedShortfall95: parseFloat(expectedShortfall95.toFixed(4)),
      trades,
      equityCurve,
    };
  }

  /**
   * Stationary Block Bootstrap Monte Carlo Simulation
   * Preserves serial autocorrelation while testing thousands of synthetic paths.
   */
  runMonteCarlo(
    equityCurve: EquityPoint[],
    simulations = APP_CONFIG.MONTE_CARLO_PATHS,
    blockSize = 6
  ): MonteCarloResult {
    const n = equityCurve.length;
    if (n < 10) {
      return {
        simulationsCount: 0,
        paths: [],
        quantiles: { p5: [], p25: [], p50: [], p75: [], p95: [] },
        medianEndingReturn: 0,
        p5EndingReturn: 0,
        p95EndingReturn: 0,
        maxDrawdownMedian: 0,
        maxDrawdownWorst95: 0,
        ruinProbability: 0,
      };
    }

    // Step returns
    const stepReturns: number[] = [];
    for (let i = 1; i < n; i++) {
      const prev = equityCurve[i - 1].equity;
      const cur = equityCurve[i].equity;
      stepReturns.push(prev > 0 ? (cur - prev) / prev : 0);
    }

    const retLen = stepReturns.length;
    const paths: number[][] = [];
    const maxDrawdowns: number[] = [];
    const endingReturns: number[] = [];
    let ruinCount = 0;

    // Run stationary bootstrap simulations
    for (let s = 0; s < simulations; s++) {
      const simCurve = [1.0];
      let simPeak = 1.0;
      let simMaxDd = 0;

      let idx = 0;
      while (idx < retLen) {
        // Pick random block start
        let start = Math.floor(Math.random() * (retLen - blockSize));
        if (start < 0) start = 0;
        const len = Math.min(blockSize, retLen - idx);

        for (let b = 0; b < len; b++) {
          const r = stepReturns[start + b];
          const newEq = simCurve[simCurve.length - 1] * (1 + r);
          simCurve.push(newEq);

          if (newEq > simPeak) simPeak = newEq;
          const dd = simPeak > 0 ? (simPeak - newEq) / simPeak : 0;
          if (dd > simMaxDd) simMaxDd = dd;
        }
        idx += len;
      }

      const endRet = simCurve[simCurve.length - 1] - 1.0;
      endingReturns.push(endRet);
      maxDrawdowns.push(simMaxDd);
      if (simMaxDd > 0.40) ruinCount++; // > 40% DD defined as ruin in risk model

      // Save a sample of paths for visualization (first 40)
      if (s < 40) {
        paths.push(simCurve);
      }
    }

    // Quantiles across time steps
    const numPoints = retLen + 1;
    const p5: number[] = new Array(numPoints);
    const p25: number[] = new Array(numPoints);
    const p50: number[] = new Array(numPoints);
    const p75: number[] = new Array(numPoints);
    const p95: number[] = new Array(numPoints);

    for (let t = 0; t < numPoints; t++) {
      const valsAtT = paths.map((p) => p[t] ?? p[p.length - 1]).sort((a, b) => a - b);
      p5[t] = valsAtT[Math.floor(valsAtT.length * 0.05)] || 1.0;
      p25[t] = valsAtT[Math.floor(valsAtT.length * 0.25)] || 1.0;
      p50[t] = valsAtT[Math.floor(valsAtT.length * 0.50)] || 1.0;
      p75[t] = valsAtT[Math.floor(valsAtT.length * 0.75)] || 1.0;
      p95[t] = valsAtT[Math.floor(valsAtT.length * 0.95)] || 1.0;
    }

    endingReturns.sort((a, b) => a - b);
    maxDrawdowns.sort((a, b) => a - b);

    return {
      simulationsCount: simulations,
      paths,
      quantiles: { p5, p25, p50, p75, p95 },
      medianEndingReturn: endingReturns[Math.floor(endingReturns.length * 0.5)] || 0,
      p5EndingReturn: endingReturns[Math.floor(endingReturns.length * 0.05)] || 0,
      p95EndingReturn: endingReturns[Math.floor(endingReturns.length * 0.95)] || 0,
      maxDrawdownMedian: maxDrawdowns[Math.floor(maxDrawdowns.length * 0.5)] || 0,
      maxDrawdownWorst95: maxDrawdowns[Math.floor(maxDrawdowns.length * 0.95)] || 0,
      ruinProbability: ruinCount / simulations,
    };
  }

  private emptyResult(candles: Candle[], initialCapital: number): BacktestResult {
    return {
      symbol: 'N/A',
      timeframe: '1h',
      periodStart: 0,
      periodEnd: 0,
      totalCandles: candles.length,
      initialCapital,
      endingCapital: initialCapital,
      totalReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      maxDrawdownDuration: 0,
      winRate: 0,
      profitFactor: 0,
      tradeCount: 0,
      avgTradeReturn: 0,
      valueAtRisk95: 0,
      expectedShortfall95: 0,
      trades: [],
      equityCurve: [],
    };
  }
}

export const backtestEngine = new BacktestEngine();
