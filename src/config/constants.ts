/**
 * PAT Trading - Strict Safety & Configuration Constants
 * 
 * Non-negotiable safety constraints:
 * - Public market-data ONLY
 * - No real trading, no API keys, no order placement
 * - TRADING_ENABLED=false and LIVE_TRADING_ENABLED=false are strictly immutable
 */

export const TRADING_ENABLED = false as const;
export const LIVE_TRADING_ENABLED = false as const;

export const APP_CONFIG = {
  APP_NAME: 'PAT Trading',
  VERSION: '2.4.0',
  ENV: 'research_lab',
  EXCHANGE: 'Binance Spot',
  BASE_URL: 'https://api.binance.com',
  DEFAULT_QUOTE_ASSET: 'USDT',
  DEFAULT_SYMBOL: 'BTCUSDT',
  DEFAULT_TIMEFRAME: '1h',
  TIMEFRAMES: ['15m', '1h', '4h', '1d'] as const,
  DEFAULT_COMMISSION_BPS: 10, // 0.1% Binance standard spot fee
  DEFAULT_SLIPPAGE_BPS: 5,     // 0.05% estimated market impact
  MIN_CANDLES_REQUIRED: 120,
  TRAIN_SPLIT_RATIO: 0.50,
  VALIDATION_SPLIT_RATIO: 0.25,
  HOLDOUT_SPLIT_RATIO: 0.25,
  CSCV_COMBINATIONS: 16,
  MONTE_CARLO_PATHS: 300,
  RANDOM_SEED: 42,
} as const;

// Ensure runtime immutability
Object.freeze(APP_CONFIG);
