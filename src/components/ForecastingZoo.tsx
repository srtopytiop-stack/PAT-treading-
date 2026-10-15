import React, { useState } from 'react';
import { Eye, BookOpen, Layers } from 'lucide-react';
import { Candle, ModelZooEvaluation } from '../types/quant';

interface ForecastingZooProps {
  candles: Candle[];
  evaluations: ModelZooEvaluation[];
}

export const ForecastingZoo: React.FC<ForecastingZooProps> = ({ candles, evaluations }) => {
  const [selectedModelIdx, setSelectedModelIdx] = useState<number>(4); // Default to Kronos

  const currentEval = evaluations[selectedModelIdx] || evaluations[0];
  const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 90000;

  // Build SVG fan chart coordinates
  const svgWidth = 600;
  const svgHeight = 220;
  const margin = { top: 20, right: 40, bottom: 30, left: 20 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  let minVal = lastPrice;
  let maxVal = lastPrice;
  if (currentEval?.forecasts) {
    for (const f of currentEval.forecasts) {
      if (f.p10 < minVal) minVal = f.p10;
      if (f.p90 > maxVal) maxVal = f.p90;
    }
  }
  const span = Math.max(1, maxVal - minVal) * 1.1;
  minVal -= span * 0.05;
  maxVal += span * 0.05;

  const getY = (v: number) => height + margin.top - ((v - minVal) / (maxVal - minVal)) * height;
  const getX = (idx: number, total: number) => margin.left + (idx / Math.max(1, total - 1)) * width;

  // Build fan polygon points
  const pointsP10P90: string[] = [];
  const pointsP25P75: string[] = [];
  const medianPoints: { x: number; y: number }[] = [];

  if (currentEval?.forecasts) {
    const totalSteps = currentEval.forecasts.length + 1;
    // Step 0: last price
    medianPoints.push({ x: getX(0, totalSteps), y: getY(lastPrice) });

    currentEval.forecasts.forEach((f, idx) => {
      const x = getX(idx + 1, totalSteps);
      medianPoints.push({ x, y: getY(f.p50) });
    });

    // Top path for p90, then bottom path reversed for p10
    const top90: [number, number][] = [[getX(0, totalSteps), getY(lastPrice)]];
    const bot10: [number, number][] = [[getX(0, totalSteps), getY(lastPrice)]];
    const top75: [number, number][] = [[getX(0, totalSteps), getY(lastPrice)]];
    const bot25: [number, number][] = [[getX(0, totalSteps), getY(lastPrice)]];

    currentEval.forecasts.forEach((f, idx) => {
      const x = getX(idx + 1, totalSteps);
      top90.push([x, getY(f.p90)]);
      bot10.push([x, getY(f.p10)]);
      top75.push([x, getY(f.p75)]);
      bot25.push([x, getY(f.p25)]);
    });

    const full90_10 = [...top90, ...bot10.reverse()];
    const full75_25 = [...top75, ...bot25.reverse()];

    pointsP10P90.push(...full90_10.map(([x, y]) => `${x},${y}`));
    pointsP25P75.push(...full75_25.map(([x, y]) => `${x},${y}`));
  }

  return (
    <div className="space-y-4">
      {/* Overview & Differentiation Notice */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              حديقة نماذج التنبؤ التوزيعي والمحول المالي Kronos
            </h3>
          </div>
          <span className="text-[11px] bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">
            Walk-Forward Distributional Benchmarking
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          فصل تنبؤ العائد والتقلب عن تقييم أرباح التداول. المقارنة الصارمة تعتمد على مقاييس الاحتماليات:
          <strong className="text-slate-200"> Pinball Loss</strong>، 
          <strong className="text-slate-200"> CRPS</strong>، وتغطية الفواصل الاحتمالية 
          <strong className="text-slate-200"> (80% Coverage)</strong> بدلاً من الاكتفاء بمتوسط الخطأ المطلق MAE فقط.
        </p>

        {/* Model Zoo Evaluation Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2 pr-2">النموذج</th>
                <th className="pb-2">النوع والتخصص</th>
                <th className="pb-2 font-mono">MAE</th>
                <th className="pb-2 font-mono">Pinball Loss</th>
                <th className="pb-2 font-mono">CRPS</th>
                <th className="pb-2 font-mono">تغطية 80% (Coverage)</th>
                <th className="pb-2 text-left pl-2">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {evaluations.map((evalItem, idx) => {
                const isSelected = selectedModelIdx === idx;
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isSelected ? 'bg-cyan-950/30 text-cyan-300' : 'hover:bg-slate-850 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 pr-2 font-sans font-semibold text-slate-200">
                      {evalItem.modelName}
                    </td>
                    <td className="py-2.5 font-sans">
                      {evalItem.isSpecializedFinancial ? (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px]">
                          تأسيسي مالي متخصص (Candlestick Tokenizer)
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                          خط أساس إحصائي / محول عام
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">{evalItem.mae.toFixed(4)}</td>
                    <td className="py-2.5">{evalItem.pinballLoss.toFixed(4)}</td>
                    <td className="py-2.5 text-indigo-300 font-bold">{evalItem.crps.toFixed(4)}</td>
                    <td className="py-2.5">
                      <span className={`${evalItem.coverage80 >= 0.75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {(evalItem.coverage80 * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-left pl-2">
                      <button
                        onClick={() => setSelectedModelIdx(idx)}
                        className={`text-[11px] font-sans px-2.5 py-1 rounded cursor-pointer transition ${
                          isSelected
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        عرض التوزيع
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fan Chart Visualization of Selected Model */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fan Chart View */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                مروحة التنبؤ التوزيعي (Distributional Fan Chart) - {currentEval?.modelName}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                توقع مسارات الأسعار للأمام (Horizons h=1..5) مع مستويات الثقة 50% و 80%.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-cyan-500/20 border border-cyan-500/40"></span>
                <span className="text-slate-300">نطاق [p10 - p90] (80%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-cyan-500/40 border border-cyan-500/70"></span>
                <span className="text-slate-300">نطاق [p25 - p75] (50%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400"></span>
                <span className="text-slate-300">الوسيط p50</span>
              </div>
            </div>
          </div>

          <div className="relative w-full bg-slate-950/80 rounded-lg border border-slate-800/80 p-2">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
              {/* Grid Lines */}
              {[0, 0.5, 1].map((pct, idx) => {
                const y = margin.top + height * pct;
                const price = maxVal - (maxVal - minVal) * pct;
                return (
                  <g key={idx}>
                    <line x1={margin.left} y1={y} x2={margin.left + width} y2={y} stroke="#1e293b" strokeDasharray="2 4" />
                    <text x={margin.left + width + 4} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                      {price.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Fan Polygons */}
              {pointsP10P90.length > 0 && (
                <polygon points={pointsP10P90.join(' ')} fill="rgba(6, 182, 212, 0.15)" stroke="rgba(6, 182, 212, 0.3)" />
              )}
              {pointsP25P75.length > 0 && (
                <polygon points={pointsP25P75.join(' ')} fill="rgba(6, 182, 212, 0.25)" stroke="rgba(6, 182, 212, 0.5)" />
              )}

              {/* Median Line */}
              {medianPoints.map((pt, i) => {
                if (i === 0) return null;
                const prev = medianPoints[i - 1];
                return (
                  <line
                    key={i}
                    x1={prev.x}
                    y1={prev.y}
                    x2={pt.x}
                    y2={pt.y}
                    stroke="#06b6d4"
                    strokeWidth="2.2"
                  />
                );
              })}

              {/* Step Nodes */}
              {medianPoints.map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#06b6d4" stroke="#020617" strokeWidth="1.5" />
              ))}
            </svg>
          </div>
        </div>

        {/* Theoretical Literature Insight */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm text-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-slate-100">فهم الفارق الجوهري: Kronos مقابل Amazon Chronos</h4>
          </div>

          <div className="space-y-2.5 text-[11px] text-slate-300 leading-relaxed">
            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
              <strong className="text-emerald-400 block mb-1">Kronos المالي (arXiv:2508.02739):</strong>
              نموذج تأسيسي صُمم حصرياً للشموع المالية؛ لا يقطع السلسلة إلى نقاط مجردة، بل يشفّر العلاقة بين
              (Open, High, Low, Close, Volume) كرمزية نسيجية موحدة تحافظ على دلالة الظلال العلوية وضغط المشترين.
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
              <strong className="text-indigo-400 block mb-1">Amazon Chronos (T5 Base):</strong>
              نموذج سلاسل زمنية عامة مبني على معمارية T5؛ يعامل البيانات كسلسلة رقمية أحادية البعد دون فهم هندسة الشموع المالية.
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5 flex items-start gap-2 text-slate-400">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                إدارة الموارد الآمنة: لا يتم تنزيل أوزان ضخمة عشوائياً بدون إذن المستخدم؛ يُنفذ النظام محاكاة دقيقة لمعمارية الباتشات لضمان التشغيل المحلي السريع.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
