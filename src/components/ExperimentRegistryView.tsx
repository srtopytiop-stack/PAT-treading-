import React, { useState } from 'react';
import { History, Download, FileText, CheckCircle2 } from 'lucide-react';
import { ExperimentRecord } from '../types/quant';

interface ExperimentRegistryViewProps {
  experiments: ExperimentRecord[];
}

export const ExperimentRegistryView: React.FC<ExperimentRegistryViewProps> = ({ experiments }) => {
  const [selectedExp, setSelectedExp] = useState<ExperimentRecord | null>(
    experiments.length > 0 ? experiments[0] : null
  );
  const [copied, setCopied] = useState(false);

  const activeExp = selectedExp || (experiments.length > 0 ? experiments[0] : null);

  const generateMarkdownReport = (exp: ExperimentRecord): string => {
    return `# تقرير فحص كمي وإحصائي - PAT Trading Research Lab
تاريخ الاختبار: ${new Date(exp.timestamp).toISOString()}
الأصل المتداول: ${exp.symbol} (Binance Spot Public)
الإطار الزمني: ${exp.timeframe}
معرف الفرضية: ${exp.hypothesis.id}
اسم الفرضية: ${exp.hypothesis.nameAr}

## 1. قيود الأمان وعدم اليقين
- بيئة التحليل: محاكاة أبحاث فقط (Simulation Only)
- TRADING_ENABLED = false (ممنوع التداول الحقيقي قطعاً)
- الأصول: Spot Long / Cash فقط دون رافعة مالية أو مشتقات.

## 2. بنية الفرضية (Safe AST DSL)
- صيغة الدخول: ${JSON.stringify(exp.hypothesis.ast.entryLong)}
- صيغة الخروج: ${JSON.stringify(exp.hypothesis.ast.exitLong)}
- الجيل: G${exp.hypothesis.generation} | الطفرة: ${exp.hypothesis.mutationType || 'نواة أولية'}

## 3. نتائج التقسيمات الزمنية الصارمة (Zero Lookahead)
- نسبة شارب داخل عينة التدريب (Train 50%): ${exp.trainMetrics.sharpeRatio.toFixed(2)}
- نسبة شارب عينة التحقق (Validation 25%): ${exp.valMetrics.sharpeRatio.toFixed(2)}
- نسبة شارب عينة الحفظ المجمدة (Holdout 25%): ${exp.antiOverfit.holdoutSharpe.toFixed(2)}
- العائد التراكمي خارج العينة: ${(exp.antiOverfit.holdoutReturn * 100).toFixed(1)}%

## 4. اختبارات مكافحة فرط التخصيص
- احتمالية فرط التخصيص (PBO): ${(exp.antiOverfit.pbo * 100).toFixed(1)}%
- نسبة شارب المفرغة (DSR): ${(exp.antiOverfit.deflatedSharpeRatio * 100).toFixed(1)}%
- حساسية تغيير المعلمات (±10%): ${(exp.antiOverfit.parameterPerturbationDegradation * 100).toFixed(1)}%
- قرار البوابة الإحصائية: ${exp.antiOverfit.verdict}
- سبب القرار: ${exp.antiOverfit.verdictReasonAr}

## 5. مقاييس المخاطر التوزيعية
- القيمة المعرضة للمخاطر (VaR 95%): ${(exp.trainMetrics.valueAtRisk95 * 100).toFixed(2)}%
- العجز المتوقع (CVaR 95%): ${(exp.trainMetrics.expectedShortfall95 * 100).toFixed(2)}%
- أقصى تراجع للمحفظة: ${(exp.trainMetrics.maxDrawdown * 100).toFixed(1)}%
`;
  };

  const handleCopyMarkdown = () => {
    if (!activeExp) return;
    const md = generateMarkdownReport(activeExp);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              سجل التجارب والتقارير العلمية (Experiment Registry & Reports)
            </h3>
          </div>
          <span className="text-[11px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
            {experiments.length} تجربة مسجلة
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          سجل تجارب مركزي ومستقر يوثق جميع مسارات البحث، البذور العشوائية (Deterministic Seeds)،
          ونتائج بوابات التدقيق الإحصائي لتسهيل تكرار النتائج علمياً (Reproducibility).
        </p>
      </div>

      {experiments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
          لا توجد تجارب مسجلة حتى الآن. شغّل دورة البحث لتسجيل أول تجربة علمية كاملة.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Experiments Table */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium font-mono text-[11px]">
                    <th className="pb-2 pr-2">معرف التجربة</th>
                    <th className="pb-2">الزوج</th>
                    <th className="pb-2">الفرضية</th>
                    <th className="pb-2">عينة الحفظ</th>
                    <th className="pb-2">PBO</th>
                    <th className="pb-2">DSR</th>
                    <th className="pb-2">القرار الإحصائي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {experiments.map((exp) => {
                    const isSelected = activeExp?.id === exp.id;
                    return (
                      <tr
                        key={exp.id}
                        onClick={() => setSelectedExp(exp)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-cyan-950/40 text-cyan-200' : 'hover:bg-slate-850 text-slate-300'
                        }`}
                      >
                        <td className="py-2.5 pr-2 font-mono text-[10px] text-slate-400">{exp.id.slice(0, 16)}</td>
                        <td className="py-2.5 font-bold text-slate-200">{exp.symbol}</td>
                        <td className="py-2.5 font-sans font-medium truncate max-w-[150px]">{exp.hypothesis.nameAr}</td>
                        <td className="py-2.5 text-emerald-400 font-bold">{exp.antiOverfit.holdoutSharpe.toFixed(2)}</td>
                        <td className="py-2.5">{(exp.antiOverfit.pbo * 100).toFixed(0)}%</td>
                        <td className="py-2.5">{(exp.antiOverfit.deflatedSharpeRatio * 100).toFixed(0)}%</td>
                        <td className="py-2.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-sans ${
                            exp.antiOverfit.verdict === 'ROBUST_EDGE'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                              : exp.antiOverfit.verdict === 'NEEDS_MORE_EVIDENCE'
                              ? 'bg-amber-950 text-amber-300 border-amber-500/30'
                              : 'bg-red-950 text-red-300 border-red-500/30'
                          }`}>
                            {exp.antiOverfit.verdict}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export & Markdown Inspector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-slate-200">تصدير التقرير العلمي (Markdown)</h4>
              </div>
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded cursor-pointer transition border border-slate-700"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>نسخ Markdown</span>
                  </>
                )}
              </button>
            </div>

            {activeExp && (
              <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-[380px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {generateMarkdownReport(activeExp)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
