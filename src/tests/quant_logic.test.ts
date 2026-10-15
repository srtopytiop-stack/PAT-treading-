import test from 'node:test';
import assert from 'node:assert/strict';

import { TRADING_ENABLED, LIVE_TRADING_ENABLED } from '../config/constants.ts';
import { binanceService } from '../services/binance.ts';
import { featureEngine } from '../services/features.ts';
import { safeDsl } from '../services/dsl.ts';
import { backtestEngine } from '../services/backtest.ts';
import { antiOverfitGate } from '../services/antiOverfit.ts';
import { forecastingZoo } from '../services/forecasting.ts';
import { SAMPLE_BTC_CANDLES } from '../services/mockData.ts';
import { RawCandle } from '../types/quant.ts';

test('Strict Safety Guardrails: Real trading must remain permanently disabled', () => {
  assert.equal(TRADING_ENABLED, false, 'TRADING_ENABLED must be strictly false');
  assert.equal(LIVE_TRADING_ENABLED, false, 'LIVE_TRADING_ENABLED must be strictly false');
});

test('Data Integrity Validator: Accurately detects gaps and duplicate candles', () => {
  const baseTime = 1700000000000;
  const hourMs = 3600000;
  const testCandles: RawCandle[] = [
    { openTime: baseTime, open: 100, high: 105, low: 95, close: 102, volume: 10, closeTime: baseTime + hourMs - 1, quoteVolume: 1000, trades: 100 },
    { openTime: baseTime + hourMs, open: 102, high: 106, low: 101, close: 104, volume: 12, closeTime: baseTime + 2 * hourMs - 1, quoteVolume: 1200, trades: 120 },
    // Duplicate candle
    { openTime: baseTime + hourMs, open: 102, high: 106, low: 101, close: 104, volume: 12, closeTime: baseTime + 2 * hourMs - 1, quoteVolume: 1200, trades: 120 },
    // Gap: skipped 1 hour
    { openTime: baseTime + 3 * hourMs, open: 104, high: 108, low: 103, close: 107, volume: 15, closeTime: baseTime + 4 * hourMs - 1, quoteVolume: 1500, trades: 150 },
  ];

  const { candles, integrity } = binanceService.normalizeAndValidate(testCandles, 'TESTUSDT', '1h');
  assert.equal(integrity.duplicateCount, 1, 'Should detect 1 duplicate candle');
  assert.equal(integrity.missingCandlesCount, 1, 'Should detect 1 missing candle gap');
  assert.equal(candles.length, 3, 'Clean candles list should exclude duplicate');
  assert.equal(integrity.isClean, false, 'Integrity report should flag unclean dataset');
});

test('Causal Feature Engine: Strict Point-In-Time Guarantee (No Lookahead Bias)', () => {
  const { candles } = binanceService.normalizeAndValidate(SAMPLE_BTC_CANDLES, 'BTCUSDT', '1h');
  assert.ok(candles.length >= 100, 'Requires at least 100 candles');

  // Compute on full length
  const fullFeatures = featureEngine.computeFeatures(candles);

  // Compute on prefix up to index 80
  const prefixCandles = candles.slice(0, 81);
  const prefixFeatures = featureEngine.computeFeatures(prefixCandles);

  // The value of any causal feature at index 80 MUST be bitwise identical whether computed on full series or prefix
  const targetIndex = 80;
  assert.ok(!isNaN(fullFeatures.rsi_14[targetIndex]), 'RSI at 80 should be a valid number');
  assert.equal(
    fullFeatures.rsi_14[targetIndex].toFixed(6),
    prefixFeatures.rsi_14[targetIndex].toFixed(6),
    'RSI(14) at index 80 must match between full and prefix (zero future lookahead)'
  );
  assert.equal(
    fullFeatures.macd_hist[targetIndex].toFixed(6),
    prefixFeatures.macd_hist[targetIndex].toFixed(6),
    'MACD histogram at index 80 must match between full and prefix'
  );
  assert.equal(
    fullFeatures.garman_klass_vol[targetIndex].toFixed(6),
    prefixFeatures.garman_klass_vol[targetIndex].toFixed(6),
    'Garman-Klass vol at index 80 must match'
  );
  assert.equal(
    fullFeatures.amihud_illiquidity_20[targetIndex].toFixed(6),
    prefixFeatures.amihud_illiquidity_20[targetIndex].toFixed(6),
    'Amihud illiquidity at index 80 must match'
  );
});

test('Safe DSL Evaluator: Correctly evaluates logical groups and cross-over operators without eval', () => {
  const dummyFeatures = {
    rsi_14: [25, 29, 32, 55],
    sma_ratio: [0.98, 1.02, 1.05, 1.04],
  };

  // Condition 1: RSI crosses above 30
  const condCross = {
    type: 'condition' as const,
    leftFeature: 'rsi_14',
    operator: 'CROSSES_ABOVE' as const,
    threshold: 30,
  };

  assert.equal(safeDsl.evaluateCondition(condCross, dummyFeatures, 1), false); // 25 -> 29 (still < 30)
  assert.equal(safeDsl.evaluateCondition(condCross, dummyFeatures, 2), true);  // 29 -> 32 (crossed 30)

  // Logical Group: RSI > 30 AND sma_ratio > 1.0
  const group = {
    type: 'group' as const,
    operator: 'AND' as const,
    children: [
      { type: 'condition' as const, leftFeature: 'rsi_14', operator: '>' as const, threshold: 30 },
      { type: 'condition' as const, leftFeature: 'sma_ratio', operator: '>' as const, threshold: 1.0 },
    ],
  };

  assert.equal(safeDsl.evaluateNode(group, dummyFeatures, 2), true);
  assert.equal(safeDsl.evaluateNode(group, dummyFeatures, 0), false);
});

test('Backtest Engine: Signal at candle t executes at candle t+1 Open with transaction costs', () => {
  const { candles } = binanceService.normalizeAndValidate(SAMPLE_BTC_CANDLES.slice(0, 50), 'BTCUSDT', '1h');
  const entrySignals = new Array(candles.length).fill(false);
  const exitSignals = new Array(candles.length).fill(false);

  // Trigger signal at index 5
  entrySignals[5] = true;
  // Trigger exit signal at index 10
  exitSignals[10] = true;

  const result = backtestEngine.runBacktest(
    candles,
    entrySignals,
    exitSignals,
    10000,
    10, // 10 bps commission
    5   // 5 bps slippage
  );

  assert.ok(result.trades.length >= 1, 'Should record at least 1 trade');
  const firstTrade = result.trades[0];
  // Signal at 5 -> execution at 6!
  assert.equal(firstTrade.entryIndex, 6, 'Execution must occur at candle t+1 (index 6)');
  // Exit signal at 10 -> exit execution at 11!
  assert.equal(firstTrade.exitIndex, 11, 'Exit execution must occur at candle t+1 (index 11)');
  assert.ok(firstTrade.holdingPeriods === 5, 'Holding period should be 5 candles');
});

test('Deflated Sharpe Ratio (DSR): Penalizes selection bias as number of trials increases', () => {
  const mockEquity = [100, 102, 101, 104, 106, 105, 108, 110, 109, 112, 115];
  const observedSharpe = 1.8;

  // Single trial vs 500 trials
  const res1Trial = antiOverfitGate.calculateDeflatedSharpe(observedSharpe, mockEquity, 2, 100);
  const res500Trials = antiOverfitGate.calculateDeflatedSharpe(observedSharpe, mockEquity, 500, 100);

  assert.ok(
    res500Trials.expectedMaxSharpe > res1Trial.expectedMaxSharpe,
    'Expected maximum Sharpe must increase with number of trials'
  );
  assert.ok(
    res500Trials.dsr < res1Trial.dsr,
    'Deflated Sharpe Ratio must decrease when tested across 500 trials (penalizing multiple testing)'
  );
});

test('Forecasting Zoo: Kronos Candlestick Adapter returns valid probabilistic quantiles', () => {
  const { candles } = binanceService.normalizeAndValidate(SAMPLE_BTC_CANDLES.slice(0, 60), 'BTCUSDT', '1h');
  const kronos = forecastingZoo.runKronosCandlestickAdapter(candles, 4);

  assert.equal(kronos.isSpecializedFinancial, true, 'Kronos is flagged as specialized financial model');
  assert.equal(kronos.forecasts.length, 4, 'Should forecast 4 horizon steps');

  for (const f of kronos.forecasts) {
    assert.ok(f.p10 < f.p25, 'Quantiles must be monotonic: p10 < p25');
    assert.ok(f.p25 <= f.p50, 'Quantiles must be monotonic: p25 <= p50');
    assert.ok(f.p50 <= f.p75, 'Quantiles must be monotonic: p50 <= p75');
    assert.ok(f.p75 < f.p90, 'Quantiles must be monotonic: p75 < p90');
  }

  assert.ok(kronos.pinballLoss > 0, 'Pinball loss should be positive');
  assert.ok(kronos.coverage80 >= 0 && kronos.coverage80 <= 1, 'Coverage80 must be between 0 and 1');
});
