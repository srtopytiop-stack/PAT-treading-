/**
 * Research Scheduler and Metasearch Orchestrator
 * Integrates all modules into a unified automated scientific research loop:
 * Data -> Features -> Regimes -> Hypothesis Generation -> Fast Screen -> Deep Validation -> Holdout Gate -> Monte Carlo
 * Maintains a persistent shared experiment registry.
 */

import { AntiOverfitResult, Candle, ExperimentRecord, Hypothesis, MarketRegimeState, MonteCarloResult, SearchSpaceBudget } from '../types/quant';
import { antiOverfitGate } from './antiOverfit';
import { backtestEngine } from './backtest';
import { binanceService } from './binance';
import { safeDsl } from './dsl';
import { featureEngine } from './features';
import { regimesEngine } from './regimes';
import { autonomousSearch } from './search';

export interface ResearchLoopState {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  regimeState: MarketRegimeState;
  activeHypotheses: Hypothesis[];
  bestHypothesis: Hypothesis | null;
  antiOverfitResult: AntiOverfitResult | null;
  monteCarloResult: MonteCarloResult | null;
  searchBudget: SearchSpaceBudget;
  experimentRegistry: ExperimentRecord[];
  isResearching: boolean;
  statusMessageAr: string;
}

export class ResearchScheduler {
  private experiments: ExperimentRecord[] = [];

  /**
   * Runs the full automated research cycle
   */
  async runCompleteResearchCycle(
    symbol = 'BTCUSDT',
    timeframe = '1h',
    onProgress?: (status: string) => void
  ): Promise<ResearchLoopState> {
    onProgress?.('جلب وتدقيق بيانات Binance Spot والتحقق من سلامة الفترات الزمنية...');
    const { candles, integrity } = await binanceService.getKlines(symbol, timeframe, 380);

    onProgress?.('حساب سجل الميزات السببية (Point-in-Time) ومنع تسرب المستقبل...');
    const allFeatures = featureEngine.computeFeatures(candles);

    onProgress?.('تقدير نظام السوق (HMM) وتقلب GARCH ونقاط التحول الهيكلية...');
    const regimeState = regimesEngine.analyzeRegime(candles);

    onProgress?.('توليد الفرضيات الأولية وتطبيق شاشات الفحص السريع (Fast Screen)...');
    const initialPopulation = autonomousSearch.getInitialCuratedHypotheses();

    const trainSplitEnd = Math.floor(candles.length * 0.50);
    const trainCandles = candles.slice(0, trainSplitEnd);
    const trainFeatures = featureEngine.computeFeatures(trainCandles);

    const screenResult = autonomousSearch.fastScreen(initialPopulation, trainCandles, trainFeatures);

    onProgress?.('تشغيل محرك التطور الجيني (Evolutionary Crossover & Mutation)...');
    const evolved = autonomousSearch.evolvePopulation(screenResult.viable, 4, 1);
    const fullCandidates = [...screenResult.viable, ...evolved];

    onProgress?.('إجراء التحقق المتقاطع وبوابة مكافحة فرط التخصيص (CSCV, PBO, DSR)...');
    let bestHyp: Hypothesis | null = null;
    let bestScore = -Infinity;
    let bestGate: AntiOverfitResult | null = null;

    for (const hyp of fullCandidates) {
      const gate = antiOverfitGate.evaluateHypothesis(hyp, candles, this.experiments.length + 10);
      hyp.fitnessScore = gate.validationSharpe;

      const combinedScore = gate.holdoutSharpe * 0.5 + (1 - gate.pbo) * 0.3 + gate.deflatedSharpeRatio * 0.2;
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestHyp = hyp;
        bestGate = gate;
      }
    }

    if (!bestHyp && fullCandidates.length > 0) {
      bestHyp = fullCandidates[0];
      bestGate = antiOverfitGate.evaluateHypothesis(bestHyp, candles, this.experiments.length + 10);
    }

    onProgress?.('تشغيل محاكاة مونت كارلو (Stationary Block Bootstrap)...');
    let monteCarlo: MonteCarloResult | null = null;
    if (bestHyp) {
      const sigs = safeDsl.generateSignals(bestHyp.ast, allFeatures, candles.length);
      const fullBt = backtestEngine.runBacktest(candles, sigs.entrySignals, sigs.exitSignals);
      monteCarlo = backtestEngine.runMonteCarlo(fullBt.equityCurve, 300, 6);

      // Log into research registry
      const record: ExperimentRecord = {
        id: `exp-${Date.now()}-${bestHyp.id}`,
        timestamp: Date.now(),
        symbol,
        timeframe,
        hypothesis: bestHyp,
        trainMetrics: backtestEngine.runBacktest(
          candles.slice(0, trainSplitEnd),
          sigs.entrySignals.slice(0, trainSplitEnd),
          sigs.exitSignals.slice(0, trainSplitEnd)
        ),
        valMetrics: backtestEngine.runBacktest(
          candles.slice(trainSplitEnd, Math.floor(candles.length * 0.75)),
          sigs.entrySignals.slice(trainSplitEnd, Math.floor(candles.length * 0.75)),
          sigs.exitSignals.slice(trainSplitEnd, Math.floor(candles.length * 0.75))
        ),
        antiOverfit: bestGate!,
        regimeAtTest: regimeState.currentRegime,
        tags: [regimeState.currentRegime, bestGate?.verdict || 'NEEDS_MORE_EVIDENCE'],
      };
      this.experiments.unshift(record);
    }

    onProgress?.('مقارنة نتائج البحث مع خط الأساس العشوائي (Random Search Baseline)...');
    const randomBaseline = autonomousSearch.runRandomSearchBaseline(candles, allFeatures, 15);
    const searchBudget = autonomousSearch.getBudgetMetrics(
      randomBaseline.medianSharpe,
      randomBaseline.p95Sharpe
    );

    onProgress?.('اكتملت دورة البحث بنجاح.');

    return {
      symbol,
      timeframe,
      candles,
      regimeState,
      activeHypotheses: fullCandidates,
      bestHypothesis: bestHyp,
      antiOverfitResult: bestGate,
      monteCarloResult: monteCarlo,
      searchBudget,
      experimentRegistry: [...this.experiments],
      isResearching: false,
      statusMessageAr: `تم فحص ${candles.length} شمعة على ${symbol} بنجاح.`,
    };
  }

  getExperiments(): ExperimentRecord[] {
    return this.experiments;
  }
}

export const researchScheduler = new ResearchScheduler();
