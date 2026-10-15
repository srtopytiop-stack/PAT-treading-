/**
 * Deterministic High-Fidelity Historical Public Spot Candle Fixtures
 * Used for offline verification, reproducible unit tests, and sandboxed research.
 */

import { RawCandle } from '../types/quant';

function generateDeterministicCandles(
  basePrice: number,
  baseVol: number,
  seed = 42,
  count = 350,
  intervalMs = 3600000 // 1 hour
): RawCandle[] {
  const candles: RawCandle[] = [];
  let price = basePrice;
  // Deterministic LCG pseudo-random generator
  let state = seed;
  const lcg = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  const startTime = Date.UTC(2025, 0, 1, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const openTime = startTime + i * intervalMs;
    const closeTime = openTime + intervalMs - 1;

    // Regime fluctuation: alternate drift and volatility
    const regimeCycle = Math.sin((i / 50) * Math.PI);
    const drift = regimeCycle * 0.0015;
    const volatility = 0.012 + Math.abs(regimeCycle) * 0.008;

    // Generate price steps
    const r1 = lcg() * 2 - 1;
    const r2 = lcg() * 2 - 1;
    const pctChange = drift + r1 * volatility;

    const open = price;
    const close = Math.max(10, open * (1 + pctChange));
    const high = Math.max(open, close) * (1 + Math.abs(r2) * 0.006);
    const low = Math.min(open, close) * (1 - Math.abs(lcg()) * 0.006);

    const volume = baseVol * (0.6 + lcg() * 0.8 + (Math.abs(pctChange) / volatility) * 0.5);
    const quoteVolume = volume * ((open + close) / 2);
    const trades = Math.floor(volume * 8 + lcg() * 100);

    candles.push({
      openTime,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2)),
      closeTime,
      quoteVolume: parseFloat(quoteVolume.toFixed(2)),
      trades,
    });

    price = close;
  }

  return candles;
}

export const SAMPLE_BTC_CANDLES = generateDeterministicCandles(94500, 120, 101, 380);
export const SAMPLE_ETH_CANDLES = generateDeterministicCandles(3350, 850, 202, 380);
export const SAMPLE_SOL_CANDLES = generateDeterministicCandles(185, 4200, 303, 380);
