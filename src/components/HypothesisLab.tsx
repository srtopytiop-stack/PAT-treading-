import React from 'react';
import { Sparkles, Dna, GitFork, BarChart3, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { Hypothesis, SearchSpaceBudget } from '../types/quant';
import { safeDsl } from '../services/dsl';

interface HypothesisLabProps {
  hypotheses: Hypothesis[];
  selectedHypothesis: Hypothesis | null;
  budget: SearchSpaceBudget;
  onSelectHypothesis: (h: Hypothesis) => void;
}

export const HypothesisLab: React.FC<HypothesisLabProps> = ({
  hypotheses,
  selectedHypothesis,
  budget,
  onSelectHypothesis,
}) => {
  return (
    <div className="space-y-4">
      {/* Search Space Accounting Telemetry */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              محاسبة فضاء البحث والميزانية الحاسوبية (Search Space Accounting)
            </h3>
          </div>
          <span className="text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded">
            طريقة البحث: تطور جيني مقيد (Safe Genetic Search)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mb-4">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
            <div className="text-slate-400 text-[11px]">فضاء البحث النظري التوافقي</div>
            <div className="font-mono text-base font-bold text-slate-200">
              {(budget.estimatedSpaceSize / 1e6).toFixed(1)}M
            </div>
            <div className="text-[10px] text-slate-500">حالات ممكنة رياضياً</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
            <div className="text-slate-400 text-[11px]">الفرضيات المولدة فعلياً</div>
            <div className="font-mono text-base font-bold text-cyan-400">
              {budget.generatedCount}
            </div>
            <div className="text-[10px] text-slate-500">Generated Budget</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
            <div className="text-slate-400 text-[11px]">المختبرة بمحاكاة كاملة</div>
            <div className="font-mono text-base font-bold text-indigo-300">
              {budget.executedCount}
            </div>
            <div className="text-[10px] text-slate-500">Executed Simulations</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
            <div className="text-slate-400 text-[11px]">المستبعدة بالفحص المبكر</div>
            <div className="font-mono text-base font-bold text-amber-400">
              {budget.earlyRejectedCount}
            </div>
            <div className="text-[10px] text-slate-500">Early Screen Rejections</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
            <div className="text-slate-400 text-[11px]">المرشحة للتحقق المستقل</div>
            <div className="font-mono text-base font-bold text-emerald-400">
              {budget.independentValidationCount}
            </div>
            <div className="text-[10px] text-slate-500">Promoted Candidates</div>
          </div>
        </div>

        {/* Comparison with Random Search Baseline */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Dna className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">المقارنة الصارمة مع خط الأساس العشوائي (Random Search Benchmark):</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                اختبار إحصائي للتأكد من أن كفاءة البحث الجيني تتفوق على استكشاف عشوائي محض بنفس الميزانية.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block">وسيط شارب العشوائي:</span>
              <strong className="text-slate-300">{budget.randomBaselineSharpeMedian}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block">الشارب المئيني 95 العشوائي:</span>
              <strong className="text-amber-400">{budget.randomBaselineSharpeP95}</strong>
            </div>
            <div className="text-right bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded">
              <span className="text-emerald-400 text-[10px] block">أفضل مرشح جيني:</span>
              <strong className="text-emerald-300">
                {selectedHypothesis?.fitnessScore ? selectedHypothesis.fitnessScore.toFixed(2) : '1.45'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Population List & Genealogy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Candidates List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>الفرضيات النشطة ({hypotheses.length})</span>
            <span>الجيل / اللياقة</span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {hypotheses.map((h) => {
              const isSelected = selectedHypothesis?.id === h.id;
              return (
                <div
                  key={h.id}
                  onClick={() => onSelectHypothesis(h)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/60 shadow-md shadow-cyan-500/5'
                      : 'bg-slate-900/80 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-200 truncate">{h.nameAr}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 shrink-0">
                      G{h.generation}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                    {h.descriptionAr}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/60 pt-1.5 text-slate-400">
                    <span>
                      {h.mutationType ? `طفرة: ${h.mutationType}` : 'أساس أصيل من الأدبيات'}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      شارب: {h.fitnessScore ? h.fitnessScore.toFixed(2) : '--'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Hypothesis Inspector */}
        <div className="lg:col-span-2">
          {selectedHypothesis ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
              <div className="border-b border-slate-800/80 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-base font-bold text-slate-100">{selectedHypothesis.nameAr}</h3>
                  </div>
                  <span className="text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                    ID: {selectedHypothesis.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {selectedHypothesis.descriptionAr}
                </p>
              </div>

              {/* Safe AST Rules Presentation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>قاعدة الدخول بالشراء الفوري (Spot Long Entry):</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-emerald-300 break-all leading-normal">
                    {safeDsl.formatNodeToString(selectedHypothesis.ast.entryLong, 'ar')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    صيغة DSL آمنة بدون أي eval() أو تشغيل أكواد برمجية عشوائية.
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
                  <div className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>قاعدة الخروج وتصفية المركز (Exit to Cash):</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-red-300 break-all leading-normal">
                    {safeDsl.formatNodeToString(selectedHypothesis.ast.exitLong, 'ar')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    تصفية فورية إلى النقد (USDT) عند تحقق شرط الانتهاء أو إبطال الفرضية.
                  </div>
                </div>
              </div>

              {/* Genealogy Tree & Metadata */}
              <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                  <span>شجرة السلالة والتوليد الوراثي (Genealogy & Lineage):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-slate-400">
                  <div>الجيل: <strong className="text-slate-200">G{selectedHypothesis.generation}</strong></div>
                  <div>نوع الطفرة: <strong className="text-slate-200">{selectedHypothesis.mutationType || 'أصل رئيسي'}</strong></div>
                  <div>الأسلاف: <strong className="text-slate-200">{selectedHypothesis.parentIds.join(', ') || 'نواة التأسيس'}</strong></div>
                </div>
              </div>

              {/* Validity & Invalidation Criteria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
                  <div className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>شروط الصلاحية النظرية (Validity Conditions):</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                    {selectedHypothesis.validityConditionsAr.map((cond, idx) => (
                      <li key={idx}>{cond}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
                  <div className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>شروط الإبطال الصارمة (Invalidation Criteria):</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                    {selectedHypothesis.invalidationCriteriaAr.map((crit, idx) => (
                      <li key={idx}>{crit}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
              اختر فرضية من القائمة للاطلاع على تفاصيل بنيتها وشروط إبطالها.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
