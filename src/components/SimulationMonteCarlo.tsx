import React, { useState } from 'react';
import { Sliders, AlertOctagon, TrendingUp, BarChart2 } from 'lucide-react';
import { BacktestResult, MonteCarloResult } from '../types/quant';

interface SimulationMonteCarloProps {
  backtest: BacktestResult | null;
  monteCarlo: MonteCarloResult | null;
}

export const SimulationMonteCarlo: React.FC<SimulationMonteCarloProps> = ({ backtest, monteCarlo }) => {
  const [commissionBps, setCommissionBps] = useState<number>(10);
  const [slippageBps, setSlippageBps] = useState<number>(5);

  if (!backtest) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
        شغّل دورة البحث لتوليد محاكاة مونت كارلو واختبارات الحساسية.
      </div>
    );
  }

  // Cost sensitivity stress calculation
  const totalCostBps = commissionBps + slippageBps;
  const originalCostBps = 15;
  const deltaCost = (totalCostBps - originalCostBps) * 0.0001 * (backtest.tradeCount * 2);
  const stressedReturn = backtest.totalReturn - deltaCost;
  const stressedSharpe = Math.max(0, backtest.sharpeRatio * (stressedReturn > 0 ? stressedReturn / Math.max(0.01, backtest.totalReturn) : 0));

  // Monte Carlo SVG visualizer
  const svgWidth = 650;
  const svgHeight = 220;
  const margin = { top: 20, right: 30, bottom: 25, left: 40 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  let minEquity = 0.7;
  let maxEquity = 1.4;

  if (monteCarlo?.quantiles.p95) {
    for (const val of monteCarlo.quantiles.p95) {
      if (val > maxEquity) maxEquity = val;
    }
    for (const val of monteCarlo.quantiles.p5) {
      if (val < minEquity) minEquity = val;
    }
  }

  const range = Math.max(0.1, maxEquity - minEquity);
  const getY = (val: number) => height + margin.top - ((val - minEquity) / range) * height;
  const getX = (idx: number, total: number) => margin.left + (idx / Math.max(1, total - 1)) * width;

  // Build points for Monte Carlo quantiles
  const p95_p5_polygon: string[] = [];
  const p75_p25_polygon: string[] = [];
  const p50_points: { x: number; y: number }[] = [];

  if (monteCarlo && monteCarlo.quantiles.p50.length > 0) {
    const total = monteCarlo.quantiles.p50.length;
    const top95: [number, number][] = [];
    const bot5: [number, number][] = [];
    const top75: [number, number][] = [];
    const bot25: [number, number][] = [];

    monteCarlo.quantiles.p50.forEach((val, i) => {
      const x = getX(i, total);
      p50_points.push({ x, y: getY(val) });
      top95.push([x, getY(monteCarlo.quantiles.p95[i])]);
      bot5.push([x, getY(monteCarlo.quantiles.p5[i])]);
      top75.push([x, getY(monteCarlo.quantiles.p75[i])]);
      bot25.push([x, getY(monteCarlo.quantiles.p25[i])]);
    });

    const full95_5 = [...top95, ...bot5.reverse()];
    const full75_25 = [...top75, ...bot25.reverse()];

    p95_p5_polygon.push(...full95_5.map(([x, y]) => `${x},${y}`));
    p75_p25_polygon.push(...full75_25.map(([x, y]) => `${x},${y}`));
  }

  return (
    <div className="space-y-4">
      {/* Simulation Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="text-slate-400 text-[11px] mb-1">العائد الصافي التراكمي</div>
          <div className={`font-mono text-xl font-bold ${backtest.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(backtest.totalReturn * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">CAGR سنوي: {(backtest.annualizedReturn * 100).toFixed(1)}%</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>نسبة شارب السنوية</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="font-mono text-xl font-bold text-cyan-300">
            {backtest.sharpeRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">سورتينو: {backtest.sortinoRatio.toFixed(2)} | كالمار: {backtest.calmarRatio.toFixed(2)}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="text-slate-400 text-[11px] mb-1">أقصى تراجع للمحفظة (Max DD)</div>
          <div className="font-mono text-xl font-bold text-amber-400">
            {(backtest.maxDrawdown * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">مدة التعافي: {backtest.maxDrawdownDuration} شمعة</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="text-slate-400 text-[11px] mb-1">معدل الفوز وعامل الربح</div>
          <div className="font-mono text-xl font-bold text-slate-100">
            {(backtest.winRate * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            ربح/خسارة: {backtest.profitFactor.toFixed(2)} | عدد الصفقات: {backtest.tradeCount}
          </div>
        </div>
      </div>

      {/* Monte Carlo Stationary Block Bootstrap Visualization */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-800/80 pb-2">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <span>محاكاة مونت كارلو عبر إعادة الترتيب الحزمي (Stationary Block Bootstrap)</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              300 مسار محاكاة اصطناعي يحفظ الارتباط الذاتي لسلسلة العائدات ويفحص احتمالية الإفلاس.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-indigo-500/20 border border-indigo-500/40"></span>
              <span className="text-slate-300">نطاق p5 - p95 (90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-indigo-500/40 border border-indigo-500/70"></span>
              <span className="text-slate-300">نطاق p25 - p75 (50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-indigo-400"></span>
              <span className="text-slate-300">الوسيط p50</span>
            </div>
          </div>
        </div>

        {/* SVG Curve */}
        <div className="relative w-full bg-slate-950/80 rounded-lg border border-slate-800/80 p-2">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
            {/* Grid Lines */}
            {[0, 0.5, 1].map((pct, idx) => {
              const y = margin.top + height * pct;
              const eq = maxEquity - (maxEquity - minEquity) * pct;
              return (
                <g key={idx}>
                  <line x1={margin.left} y1={y} x2={margin.left + width} y2={y} stroke="#1e293b" strokeDasharray="2 4" />
                  <text x={margin.left + width + 5} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                    {eq.toFixed(2)}x
                  </text>
                </g>
              );
            })}

            {/* Polygons */}
            {p95_p5_polygon.length > 0 && (
              <polygon points={p95_p5_polygon.join(' ')} fill="rgba(99, 102, 241, 0.15)" stroke="rgba(99, 102, 241, 0.3)" />
            )}
            {p75_p25_polygon.length > 0 && (
              <polygon points={p75_p25_polygon.join(' ')} fill="rgba(99, 102, 241, 0.25)" stroke="rgba(99, 102, 241, 0.5)" />
            )}

            {/* Median line */}
            {p50_points.map((pt, i) => {
              if (i === 0) return null;
              const prev = p50_points[i - 1];
              return (
                <line
                  key={i}
                  x1={prev.x}
                  y1={prev.y}
                  x2={pt.x}
                  y2={pt.y}
                  stroke="#818cf8"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>

        {/* Tail Risk Metrics from Monte Carlo */}
        {monteCarlo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 text-xs font-mono">
            <div className="bg-slate-950/60 border border-slate-800/60 rounded p-2 text-right">
              <span className="text-[10px] text-slate-400 block font-sans">وسيط العائد النهائي (p50):</span>
              <strong className="text-emerald-400">{(monteCarlo.medianEndingReturn * 100).toFixed(1)}%</strong>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded p-2 text-right">
              <span className="text-[10px] text-slate-400 block font-sans">أسوأ 5% عائداً (p5 Worst):</span>
              <strong className="text-red-400">{(monteCarlo.p5EndingReturn * 100).toFixed(1)}%</strong>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded p-2 text-right">
              <span className="text-[10px] text-slate-400 block font-sans">أقصى تراجع لأسوأ 5% مسار:</span>
              <strong className="text-amber-400">{(monteCarlo.maxDrawdownWorst95 * 100).toFixed(1)}%</strong>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded p-2 text-right">
              <span className="text-[10px] text-slate-400 block font-sans">احتمالية الخسارة الحادة (&gt;40%):</span>
              <strong className={`${monteCarlo.ruinProbability === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(monteCarlo.ruinProbability * 100).toFixed(1)}%
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Slippage & Fee Stress Sensitivity Slider */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-slate-100">
            اختبار حساسية الرسوم والانزلاق السعري (Cost & Slippage Stress Test)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-300">عمولة التداول الفوري لكل صفقة:</span>
              <span className="font-mono text-cyan-300 font-bold">{commissionBps} نقطة أساس ({(commissionBps / 100).toFixed(2)}%)</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={commissionBps}
              onChange={(e) => setCommissionBps(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0 (معفى من الرسوم)</span>
              <span>10 bps (Binance Standard Spot)</span>
              <span>30 bps (رسوم قصوى)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-300">الانزلاق السعري المقدر (Market Impact):</span>
              <span className="font-mono text-cyan-300 font-bold">{slippageBps} نقطة أساس ({(slippageBps / 100).toFixed(2)}%)</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={slippageBps}
              onChange={(e) => setSlippageBps(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0 bps</span>
              <span>5 bps (سيولة عالية)</span>
              <span>20 bps (أسواق متذبذبة شحيحة)</span>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
            <span>النتيجة بعد ضغط التكاليف الإجمالية ({totalCostBps} bps):</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">صافي العائد المضغوط:</span>
              <strong className={stressedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {(stressedReturn * 100).toFixed(1)}%
              </strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">نسبة شارب بعد الضغط:</span>
              <strong className="text-cyan-300">{stressedSharpe.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
