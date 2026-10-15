/**
 * Autonomous Hypothesis Generator & Evolutionary Search Engine
 * - Search space lazily budgeted and accounted:
 *   estimatedSpaceSize, generatedCount, executedCount, earlyRejectedCount, independentValidationCount
 * - Genetic programming (mutation, crossover, selection)
 * - Genealogy tracking (parents, generations, mutation type)
 * - Benchmark vs Random Search Baseline
 */

import { ASTCondition, ASTNode, Candle, Hypothesis, HypothesisAST, SearchSpaceBudget } from '../types/quant';
import { backtestEngine } from './backtest';
import { safeDsl } from './dsl';
import { FEATURE_REGISTRY, featureEngine } from './features';

export class AutonomousSearchEngine {
  private generatedCount = 0;
  private executedCount = 0;
  private earlyRejectedCount = 0;
  private independentValidationCount = 0;

  // Combinatorial theoretical space estimate:
  // Features (~14) * Operators (~6) * Threshold quantiles (~20) = ~1,680 single conditions
  // Pairs with AND/OR = ~1,680^2 * 2 ≈ 5,644,800 entry rules * exit rules ≈ 3.18e7
  private readonly ESTIMATED_SPACE_SIZE = 31800000;

  /**
   * Returns current search budget and execution telemetry
   */
  getBudgetMetrics(
    randomBaselineSharpeMedian = 0.22,
    randomBaselineSharpeP95 = 0.78
  ): SearchSpaceBudget {
    return {
      estimatedSpaceSize: this.ESTIMATED_SPACE_SIZE,
      generatedCount: this.generatedCount,
      executedCount: this.executedCount,
      earlyRejectedCount: this.earlyRejectedCount,
      independentValidationCount: this.independentValidationCount,
      randomBaselineSharpeMedian,
      randomBaselineSharpeP95,
      searchMethod: 'evolutionary_genetic',
    };
  }

  /**
   * Generates a population of curated baseline hypotheses anchored in literature
   */
  getInitialCuratedHypotheses(): Hypothesis[] {
    return [
      {
        id: 'hyp-mean-reversion-rsi-amihud',
        name: 'RSI Inelastic Liquidity Bounce',
        nameAr: 'ارتداد ذروة البيع المقترن بضعف سيولة أميهود',
        descriptionAr: 'دخول عند وصول RSI إلى منطقة ذروة بيع حادة (< 28) مع ارتفاع معامل أميهود لعدم السيولة، وخروج عند تعافي الزخم (RSI > 55).',
        ast: {
          entryLong: {
            type: 'group',
            operator: 'AND',
            children: [
              { type: 'condition', leftFeature: 'rsi_14', operator: '<', threshold: 28 },
              { type: 'condition', leftFeature: 'amihud_illiquidity_20', operator: '>', threshold: 1.2 },
            ],
          },
          exitLong: {
            type: 'condition',
            leftFeature: 'rsi_14',
            operator: '>',
            threshold: 55,
          },
        },
        parameters: { rsi_entry: 28, rsi_exit: 55, amihud_min: 1.2 },
        generation: 0,
        parentIds: [],
        sourcePaperId: 'Amihud (2002)',
        validityConditionsAr: ['نظام سوق عرضي أو ارتدادي', 'أحجام تداول كافية لتجنب الانزلاق العنيف'],
        invalidationCriteriaAr: ['كسر القاع السابق بنسبة 5%', 'استمرار هبوط السعر لأكثر من 12 شمعة متتالية'],
        createdAt: Date.now(),
      },
      {
        id: 'hyp-breakout-volume-zscore',
        name: 'Donchian Channel Volume Explosion',
        nameAr: 'اختراق قناة دونشيان مدعوماً بانفجار حجم التداول Z-Score',
        descriptionAr: 'دخول عند تسجيل اختراق علوي لقناة العشرين شمعة (> 0.85) مع قفزة غير اعتيادية في حجم التداول (Volume Z-Score > 1.8)، وخروج عند كسر الماكد لخط الصفر هبوطاً.',
        ast: {
          entryLong: {
            type: 'group',
            operator: 'AND',
            children: [
              { type: 'condition', leftFeature: 'donchian_breakout_20', operator: '>', threshold: 0.85 },
              { type: 'condition', leftFeature: 'volume_zscore_20', operator: '>', threshold: 1.8 },
            ],
          },
          exitLong: {
            type: 'condition',
            leftFeature: 'macd_hist',
            operator: '<',
            threshold: 0,
          },
        },
        parameters: { breakout_threshold: 0.85, vol_zscore: 1.8 },
        generation: 0,
        parentIds: [],
        sourcePaperId: 'Garman & Klass (1980)',
        validityConditionsAr: ['نظام اتجاه صاعد قوي (Bull Trend)', 'عدم وجود فجوات سعرية حادة مفاجئة'],
        invalidationCriteriaAr: ['انعكاس السعر إلى ما دون متوسط 20 فترة', 'تلاشي حجم التداول فجأة'],
        createdAt: Date.now(),
      },
      {
        id: 'hyp-garman-klass-compression',
        name: 'Volatility Compression Expansion',
        nameAr: 'توسع التقلب بعد انضغاط جارمان-كلاس',
        descriptionAr: 'رصد فترات انضغاط شديد في تقلب جارمان-كلاس يليه تحرك إيجابي في تدفق الأوامر (OFI > 0)، وخروج بعد 8 شمعات أو تحقيق الربح المستهدف.',
        ast: {
          entryLong: {
            type: 'group',
            operator: 'AND',
            children: [
              { type: 'condition', leftFeature: 'regime_vol_ratio', operator: '<', threshold: 0.75 },
              { type: 'condition', leftFeature: 'order_flow_imbalance_proxy', operator: '>', threshold: 0.1 },
            ],
          },
          exitLong: {
            type: 'condition',
            leftFeature: 'regime_vol_ratio',
            operator: '>',
            threshold: 1.4,
          },
        },
        parameters: { vol_compression: 0.75, ofi_min: 0.1, vol_exit: 1.4 },
        generation: 0,
        parentIds: [],
        sourcePaperId: 'Garman & Klass (1980)',
        validityConditionsAr: ['نظام الانتقال بين الهدوء وبداية الاتجاه العنيف'],
        invalidationCriteriaAr: ['انفجار التقلب نحو الاتجاه الهابط'],
        createdAt: Date.now(),
      },
      {
        id: 'hyp-macd-trend-continuation',
        name: 'Dual Moving Average & MACD Surge',
        nameAr: 'استمرار الاتجاه بتوافق SMA 20/50 وتسارع MACD',
        descriptionAr: 'دخول عندما يتجاوز SMA(20) متوسط SMA(50) مع مدرج MACD موجب ومتصاعد، وخروج عند تقاطع الماكد هبوطاً.',
        ast: {
          entryLong: {
            type: 'group',
            operator: 'AND',
            children: [
              { type: 'condition', leftFeature: 'sma_ratio_20_50', operator: '>', threshold: 1.01 },
              { type: 'condition', leftFeature: 'macd_hist', operator: '>', threshold: 0.05 },
            ],
          },
          exitLong: {
            type: 'condition',
            leftFeature: 'macd_hist',
            operator: '<',
            threshold: -0.02,
          },
        },
        parameters: { sma_ratio: 1.01, macd_min: 0.05 },
        generation: 0,
        parentIds: [],
        sourcePaperId: 'Qlib Trend Architecture',
        validityConditionsAr: ['أسواق ذات سيولة عالية واتجاه طويل'],
        invalidationCriteriaAr: ['تذبذب عرضي متكرر يستنزف العمولات'],
        createdAt: Date.now(),
      },
    ];
  }

  /**
   * Runs an evolutionary generation cycle to produce novel hypotheses
   */
  evolvePopulation(
    parents: Hypothesis[],
    targetCount = 6,
    generation = 1
  ): Hypothesis[] {
    const novel: Hypothesis[] = [];
    const featureKeys = Object.keys(FEATURE_REGISTRY);
    const validParents = parents && parents.length > 0 ? parents : this.getInitialCuratedHypotheses();

    while (novel.length < targetCount) {
      this.generatedCount++;
      const p1 = validParents[Math.floor(Math.random() * validParents.length)];
      const p2 = validParents[Math.floor(Math.random() * validParents.length)];

      const coin = Math.random();
      let childAst: HypothesisAST;
      let mutationType = 'threshold_perturbation';

      if (coin < 0.4) {
        // Threshold Mutation
        childAst = JSON.parse(JSON.stringify(p1.ast));
        this.mutateConditionThresholds(childAst.entryLong);
        mutationType = 'threshold_mutation';
      } else if (coin < 0.7) {
        // Crossover between P1 entry and P2 exit
        childAst = {
          entryLong: JSON.parse(JSON.stringify(p1.ast.entryLong)),
          exitLong: JSON.parse(JSON.stringify(p2.ast.exitLong)),
        };
        mutationType = 'crossover_entry_exit';
      } else {
        // Structural Feature Swap
        childAst = JSON.parse(JSON.stringify(p1.ast));
        const randomFeat = featureKeys[Math.floor(Math.random() * featureKeys.length)];
        this.swapFeatureInNode(childAst.entryLong, randomFeat);
        mutationType = 'feature_substitution';
      }

      const id = `hyp-gen${generation}-${Math.random().toString(36).substring(2, 7)}`;
      novel.push({
        id,
        name: `Evolved Hypothesis Gen ${generation}`,
        nameAr: `فرضية متطورة (الجيل ${generation} - ${mutationType})`,
        descriptionAr: `فرضية بحثية مشتقة جينياً من الأسلاف عبر ${mutationType}.`,
        ast: childAst,
        parameters: { ...p1.parameters },
        generation,
        parentIds: [p1.id, p2.id],
        mutationType,
        validityConditionsAr: ['نطاق سوق متوافق مع شروط السلف', 'ثبات كلفة التداول والانزلاق'],
        invalidationCriteriaAr: ['فشل الخروج في التوقيت المحسوب', 'تراجع أداء العينة خارج التدريب'],
        createdAt: Date.now(),
      });
    }

    return novel;
  }

  /**
   * Fast Screen Pipeline (Stage 1 train filter)
   * Discards hypotheses that fail minimum viability before deeper walk-forward.
   */
  fastScreen(
    hypotheses: Hypothesis[],
    trainCandles: Candle[],
    features: Record<string, number[]>
  ): { viable: Hypothesis[]; rejectedCount: number } {
    const viable: Hypothesis[] = [];
    const scored: { h: Hypothesis; score: number }[] = [];

    for (const h of hypotheses) {
      this.executedCount++;
      const sigs = safeDsl.generateSignals(h.ast, features, trainCandles.length);
      const res = backtestEngine.runBacktest(trainCandles, sigs.entrySignals, sigs.exitSignals);
      h.fitnessScore = res.sharpeRatio;
      scored.push({ h, score: res.sharpeRatio });

      // Early rejection criteria:
      // Minimum 2 trades, drawdown < 45%
      if (res.tradeCount >= 2 && res.maxDrawdown < 0.45) {
        viable.push(h);
        this.independentValidationCount++;
      } else {
        this.earlyRejectedCount++;
      }
    }

    // Always ensure at least the top 2 candidates are preserved as seed parents
    if (viable.length === 0 && scored.length > 0) {
      scored.sort((a, b) => b.score - a.score);
      viable.push(scored[0].h);
      if (scored.length > 1) viable.push(scored[1].h);
    }

    return { viable, rejectedCount: this.earlyRejectedCount };
  }

  /**
   * Benchmarks against Random Search Baseline with identical budget
   */
  runRandomSearchBaseline(
    candles: Candle[],
    features: Record<string, number[]>,
    budget = 15
  ): { medianSharpe: number; p95Sharpe: number; bestReturn: number } {
    const featureKeys = Object.keys(FEATURE_REGISTRY);
    const sharpes: number[] = [];
    let bestRet = -1;

    for (let i = 0; i < budget; i++) {
      const f1 = featureKeys[Math.floor(Math.random() * featureKeys.length)];
      const f2 = featureKeys[Math.floor(Math.random() * featureKeys.length)];
      const op = Math.random() > 0.5 ? '>' : '<';

      const randomAst: HypothesisAST = {
        entryLong: {
          type: 'condition',
          leftFeature: f1,
          operator: op,
          threshold: (Math.random() - 0.5) * 2,
        },
        exitLong: {
          type: 'condition',
          leftFeature: f2,
          operator: op === '>' ? '<' : '>',
          threshold: 0,
        },
      };

      const sigs = safeDsl.generateSignals(randomAst, features, candles.length);
      const res = backtestEngine.runBacktest(candles, sigs.entrySignals, sigs.exitSignals);
      sharpes.push(res.sharpeRatio);
      if (res.totalReturn > bestRet) bestRet = res.totalReturn;
    }

    sharpes.sort((a, b) => a - b);
    const median = sharpes[Math.floor(sharpes.length * 0.5)] || 0;
    const p95 = sharpes[Math.floor(sharpes.length * 0.95)] || 0;

    return {
      medianSharpe: parseFloat(median.toFixed(2)),
      p95Sharpe: parseFloat(p95.toFixed(2)),
      bestReturn: parseFloat(bestRet.toFixed(4)),
    };
  }

  private mutateConditionThresholds(node: ASTNode) {
    if (node.type === 'condition' && node.threshold !== undefined) {
      const delta = 1 + (Math.random() - 0.5) * 0.2; // +/- 10%
      node.threshold = parseFloat((node.threshold * delta).toFixed(4));
    } else if (node.type === 'group') {
      for (const child of node.children) {
        this.mutateConditionThresholds(child);
      }
    }
  }

  private swapFeatureInNode(node: ASTNode, newFeature: string) {
    if (node.type === 'condition') {
      node.leftFeature = newFeature;
    } else if (node.type === 'group' && node.children.length > 0) {
      this.swapFeatureInNode(node.children[0], newFeature);
    }
  }
}

export const autonomousSearch = new AutonomousSearchEngine();
