/**
 * PAT Trading - Autonomous Quantitative Research Laboratory
 * Full-stack quantitative environment for hypothesis discovery, Kronos candlestick forecasting,
 * anti-overfitting statistical gates (PBO/CSCV/DSR), and Monte Carlo risk simulations.
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Dna, 
  Eye, 
  ShieldCheck, 
  Sliders, 
  Newspaper, 
  GraduationCap, 
  History,
  Layers
} from 'lucide-react';

import { Header } from './components/Header';
import { DataIntegrityCard } from './components/DataIntegrityCard';
import { CandlestickChart } from './components/CandlestickChart';
import { RegimeOverview } from './components/RegimeOverview';
import { HypothesisLab } from './components/HypothesisLab';
import { ForecastingZoo } from './components/ForecastingZoo';
import { AntiOverfittingGate } from './components/AntiOverfittingGate';
import { SimulationMonteCarlo } from './components/SimulationMonteCarlo';
import { NewsEventStudy } from './components/NewsEventStudy';
import { LiteratureKnowledge } from './components/LiteratureKnowledge';
import { ExperimentRegistryView } from './components/ExperimentRegistryView';

import { researchScheduler, ResearchLoopState } from './services/scheduler';
import { forecastingZoo } from './services/forecasting';
import { backtestEngine } from './services/backtest';
import { safeDsl } from './services/dsl';
import { featureEngine } from './services/features';
import { binanceService } from './services/binance';
import { Candle, DataIntegrityReport, Hypothesis, ModelZooEvaluation } from './types/quant';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [researchState, setResearchState] = useState<ResearchLoopState | null>(null);
  const [selectedHypothesis, setSelectedHypothesis] = useState<Hypothesis | null>(null);
  const [zooEvaluations, setZooEvaluations] = useState<ModelZooEvaluation[]>([]);
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [activeBacktest, setActiveBacktest] = useState<any>(null);

  // Initialize and run research cycle on mount or when symbol/timeframe changes
  const executeResearch = async (targetSymbol = symbol, targetTf = timeframe) => {
    setIsResearching(true);
    try {
      const state = await researchScheduler.runCompleteResearchCycle(
        targetSymbol,
        targetTf,
        (msg) => setStatusMessage(msg)
      );

      setResearchState(state);
      setSelectedHypothesis(state.bestHypothesis);

      // Evaluate model zoo
      const zoo = forecastingZoo.evaluateAllModels(state.candles, 5);
      setZooEvaluations(zoo);

      // Audit data integrity
      const { integrity } = binanceService.normalizeAndValidate(state.candles, targetSymbol, targetTf);
      setIntegrityReport(integrity);

      // Compute active backtest for the best hypothesis
      if (state.bestHypothesis) {
        const feats = featureEngine.computeFeatures(state.candles);
        const sigs = safeDsl.generateSignals(state.bestHypothesis.ast, feats, state.candles.length);
        const bt = backtestEngine.runBacktest(state.candles, sigs.entrySignals, sigs.exitSignals);
        setActiveBacktest(bt);
      }
    } catch (err: any) {
      setStatusMessage(`خطأ أثناء دورة البحث: ${err?.message || 'تعذر استكمال العملية'}`);
    } finally {
      setIsResearching(false);
    }
  };

  useEffect(() => {
    executeResearch('BTCUSDT', '1h');
  }, []);

  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    executeResearch(newSymbol, timeframe);
  };

  const handleTimeframeChange = (newTf: string) => {
    setTimeframe(newTf);
    executeResearch(symbol, newTf);
  };

  const handleSelectHypothesis = (h: Hypothesis) => {
    setSelectedHypothesis(h);
    if (researchState?.candles) {
      const feats = featureEngine.computeFeatures(researchState.candles);
      const sigs = safeDsl.generateSignals(h.ast, feats, researchState.candles.length);
      const bt = backtestEngine.runBacktest(researchState.candles, sigs.entrySignals, sigs.exitSignals);
      setActiveBacktest(bt);
    }
  };

  const tabs = [
    { id: 'overview', label: 'لوحة المختبر ونظام السوق', icon: BarChart3 },
    { id: 'hypotheses', label: 'محرك الفرضيات والبحث الآلي', icon: Dna },
    { id: 'forecasting', label: 'حديقة نماذج التنبؤ (Kronos)', icon: Eye },
    { id: 'antiOverfit', label: 'بوابة مكافحة فرط التخصيص (PBO/DSR)', icon: ShieldCheck },
    { id: 'simulation', label: 'المحاكاة ومونت كارلو', icon: Sliders },
    { id: 'news', label: 'ذكاء الأخبار ودراسات الأحداث', icon: Newspaper },
    { id: 'literature', label: 'سجل الأبحاث والمصادر', icon: GraduationCap },
    { id: 'registry', label: 'سجل التجارب والتقارير', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Header & Safety Guard */}
      <Header
        symbol={symbol}
        timeframe={timeframe}
        isResearching={isResearching}
        statusMessage={statusMessage}
        onSymbolChange={handleSymbolChange}
        onTimeframeChange={handleTimeframeChange}
        onRunResearch={() => executeResearch(symbol, timeframe)}
      />

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-800 bg-slate-900/60 sticky top-[95px] z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Tab 1: Overview & Live Candlestick Lab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <DataIntegrityCard report={integrityReport} />
            <CandlestickChart
              candles={researchState?.candles || []}
              symbol={symbol}
            />
            <RegimeOverview regimeState={researchState?.regimeState || null} />
          </div>
        )}

        {/* Tab 2: Autonomous Hypothesis Lab */}
        {activeTab === 'hypotheses' && (
          <HypothesisLab
            hypotheses={researchState?.activeHypotheses || []}
            selectedHypothesis={selectedHypothesis}
            budget={researchState?.searchBudget || {
              estimatedSpaceSize: 31800000,
              generatedCount: 0,
              executedCount: 0,
              earlyRejectedCount: 0,
              independentValidationCount: 0,
              randomBaselineSharpeMedian: 0.22,
              randomBaselineSharpeP95: 0.78,
              searchMethod: 'evolutionary_genetic',
            }}
            onSelectHypothesis={handleSelectHypothesis}
          />
        )}

        {/* Tab 3: Forecasting Model Zoo & Kronos */}
        {activeTab === 'forecasting' && (
          <ForecastingZoo
            candles={researchState?.candles || []}
            evaluations={zooEvaluations}
          />
        )}

        {/* Tab 4: Anti-Overfitting Gate */}
        {activeTab === 'antiOverfit' && (
          <AntiOverfittingGate
            result={researchState?.antiOverfitResult || null}
          />
        )}

        {/* Tab 5: Simulation & Monte Carlo */}
        {activeTab === 'simulation' && (
          <SimulationMonteCarlo
            backtest={activeBacktest}
            monteCarlo={researchState?.monteCarloResult || null}
          />
        )}

        {/* Tab 6: News Intelligence & Event Studies */}
        {activeTab === 'news' && (
          <NewsEventStudy
            candles={researchState?.candles || []}
          />
        )}

        {/* Tab 7: Literature & Knowledge Engine */}
        {activeTab === 'literature' && (
          <LiteratureKnowledge />
        )}

        {/* Tab 8: Experiment Registry & Reports */}
        {activeTab === 'registry' && (
          <ExperimentRegistryView
            experiments={researchState?.experimentRegistry || []}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>PAT Trading - مختبر الأبحاث الكمية والتحقق الإحصائي | Binance Spot Public Only</span>
          <span className="font-mono text-[11px] text-slate-400">
            TRADING_ENABLED=false | Strictly Simulated Research
          </span>
        </div>
      </footer>
    </div>
  );
}
