/**
 * Core Quantitative Types for PAT Trading Lab
 */

export interface RawCandle {
  openTime: number; // UTC ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number; // UTC ms
  quoteVolume: number;
  trades: number;
}

export interface Candle extends RawCandle {
  timestampUtc: string;
  isComplete: boolean;
}

export interface DataIntegrityReport {
  symbol: string;
  timeframe: string;
  totalCandles: number;
  startTimeUtc: string;
  endTimeUtc: string;
  missingCandlesCount: number;
  duplicateCount: number;
  nonMonotonicCount: number;
  gapRanges: { from: string; to: string; missingCount: number }[];
  isClean: boolean;
  warnings: string[];
}

export type FeatureCategory = 'momentum' | 'volatility' | 'volume' | 'liquidity' | 'cross_asset' | 'regime';

export interface FeatureDefinition {
  id: string;
  name: string;
  nameAr: string;
  descriptionAr: string;
  category: FeatureCategory;
  lookback: number;
  pointInTimeLag: number; // minimum lag in periods (e.g., 1 period)
  formulaAr: string;
  sourcePaper?: string;
}

export type ASTOperator = '>' | '<' | '>=' | '<=' | 'CROSSES_ABOVE' | 'CROSSES_BELOW' | 'BETWEEN';
export type LogicalOperator = 'AND' | 'OR';

export interface ASTCondition {
  type: 'condition';
  leftFeature: string;
  operator: ASTOperator;
  rightFeature?: string;
  threshold?: number;
  threshold2?: number; // for BETWEEN
}

export interface ASTLogicalGroup {
  type: 'group';
  operator: LogicalOperator;
  children: ASTNode[];
}

export type ASTNode = ASTCondition | ASTLogicalGroup;

export interface HypothesisAST {
  entryLong: ASTNode;
  exitLong: ASTNode;
}

export interface Hypothesis {
  id: string;
  name: string;
  nameAr: string;
  descriptionAr: string;
  ast: HypothesisAST;
  parameters: Record<string, number>;
  generation: number;
  parentIds: string[];
  mutationType?: string;
  sourcePaperId?: string;
  validityConditionsAr: string[];
  invalidationCriteriaAr: string[];
  fitnessScore?: number;
  createdAt: number;
}

export interface Trade {
  entryIndex: number;
  entryTime: number;
  entryPrice: number;
  exitIndex: number;
  exitTime: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  holdingPeriods: number;
  reason: 'signal_exit' | 'stop_loss' | 'take_profit' | 'end_of_period';
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;
  position: 0 | 1;
  benchmarkEquity: number;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  periodStart: number;
  periodEnd: number;
  totalCandles: number;
  initialCapital: number;
  endingCapital: number;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number; // candles
  winRate: number;
  profitFactor: number;
  tradeCount: number;
  avgTradeReturn: number;
  valueAtRisk95: number;
  expectedShortfall95: number;
  trades: Trade[];
  equityCurve: EquityPoint[];
}

export interface MonteCarloResult {
  simulationsCount: number;
  paths: number[][]; // normalized equity curves
  quantiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  medianEndingReturn: number;
  p5EndingReturn: number;
  p95EndingReturn: number;
  maxDrawdownMedian: number;
  maxDrawdownWorst95: number;
  ruinProbability: number; // prob of DD > 40%
}

export type GateVerdict = 'ROBUST_EDGE' | 'NEEDS_MORE_EVIDENCE' | 'NO_ROBUST_EDGE';

export interface AntiOverfitResult {
  verdict: GateVerdict;
  verdictReasonAr: string;
  trainSharpe: number;
  validationSharpe: number;
  holdoutSharpe: number;
  holdoutReturn: number;
  pbo: number; // Probability of Backtest Overfitting (0 - 1)
  deflatedSharpeRatio: number; // DSR (0 - 1)
  expectedMaxSharpe: number;
  cscvCombinationsTested: number;
  parameterPerturbationDegradation: number; // % drop when changing lookbacks +-10%
  regimeStabilityScore: number;
  holdoutPass: boolean;
}

export interface SearchSpaceBudget {
  estimatedSpaceSize: number;
  generatedCount: number;
  executedCount: number;
  earlyRejectedCount: number;
  independentValidationCount: number;
  randomBaselineSharpeMedian: number;
  randomBaselineSharpeP95: number;
  searchMethod: 'evolutionary_genetic' | 'random_baseline' | 'bayesian_proxy';
}

export type RegimeType = 'BULL_TREND' | 'BEAR_TREND' | 'SIDEWAYS_VOLATILE';

export interface MarketRegimeState {
  currentRegime: RegimeType;
  regimeProbabilities: {
    BULL_TREND: number;
    BEAR_TREND: number;
    SIDEWAYS_VOLATILE: number;
  };
  garchAnnualizedVol: number;
  changePointDetected: boolean;
  regimeHistory: { time: number; regime: RegimeType; vol: number }[];
}

export interface ForecastQuantiles {
  horizon: number;
  timestamp: number;
  actualPrice?: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface ModelZooEvaluation {
  modelName: string;
  isSpecializedFinancial: boolean;
  mae: number;
  pinballLoss: number;
  crps: number;
  coverage80: number; // % actual within [p10, p90]
  forecasts: ForecastQuantiles[];
}

export interface NewsEventItem {
  id: string;
  timestampUtc: number;
  title: string;
  titleAr: string;
  source: string;
  category: 'protocol' | 'macro' | 'regulation' | 'security' | 'market';
  impactExpected: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1 to +1
  carWindowPercent: number; // Cumulative Abnormal Return
  verifiedPointInTime: boolean;
}

export interface LiteraturePaper {
  id: string;
  title: string;
  titleAr: string;
  authors: string;
  year: number;
  venueOrArxiv: string;
  keyContributionAr: string;
  mathematicalHypothesisAr: string;
  limitationsAr: string;
  patImplementationStatus: 'implemented' | 'adapted' | 'in_progress' | 'roadmap';
  relevanceAr: string;
}

export interface ExperimentRecord {
  id: string;
  timestamp: number;
  symbol: string;
  timeframe: string;
  hypothesis: Hypothesis;
  trainMetrics: BacktestResult;
  valMetrics: BacktestResult;
  holdoutMetrics?: BacktestResult;
  antiOverfit: AntiOverfitResult;
  regimeAtTest: RegimeType;
  tags: string[];
}
