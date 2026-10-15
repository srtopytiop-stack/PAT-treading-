import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Award, HelpCircle } from 'lucide-react';
import { AntiOverfitResult } from '../types/quant';

interface AntiOverfittingGateProps {
  result: AntiOverfitResult | null;
}

export const AntiOverfittingGate: React.FC<AntiOverfittingGateProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
        شغّل دورة البحث لعرض نتائج بوابات مكافحة فرط التخصيص والتحقق الإحصائي.
      </div>
    );
  }

  const verdictStyles = {
    ROBUST_EDGE: {
      titleAr: 'اجتياز البوابة: ميزة إحصائية متينة (ROBUST_EDGE)',
      badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40',
      icon: Award,
      glow: 'shadow-emerald-500/10',
    },
    NEEDS_MORE_EVIDENCE: {
      titleAr: 'توقف البوابة: تحتاج أدلة إضافية (NEEDS_MORE_EVIDENCE)',
      badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/40',
      icon: AlertTriangle,
      glow: 'shadow-amber-500/10',
    },
    NO_ROBUST_EDGE: {
      titleAr: 'رفض البوابة: لا توجد ميزة حقيقية (NO_ROBUST_EDGE)',
      badgeClass: 'bg-red-950/90 text-red-300 border-red-500/40',
      icon: ShieldAlert,
      glow: 'shadow-red-500/10',
    },
  }[result.verdict];

  const VerdictIcon = verdictStyles.icon;

  return (
    <div className="space-y-4">
      {/* Prominent Gate Verdict Banner */}
      <div className={`p-4 rounded-xl border ${verdictStyles.badgeClass} shadow-lg ${verdictStyles.glow}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <VerdictIcon className="w-5 h-5 shrink-0" />
            <h3 className="text-base font-bold tracking-tight">{verdictStyles.titleAr}</h3>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950/80 border border-current">
            PBO: {(result.pbo * 100).toFixed(1)}% | DSR: {(result.deflatedSharpeRatio * 100).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-slate-200/90 leading-relaxed font-sans">
          {result.verdictReasonAr}
        </p>
      </div>

      {/* Key Statistical Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* PBO Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>احتمالية فرط التخصيص (PBO)</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className={`font-mono text-2xl font-bold mt-1 ${result.pbo <= 0.30 ? 'text-emerald-400' : result.pbo <= 0.45 ? 'text-amber-400' : 'text-red-400'}`}>
            {(result.pbo * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            تقسيم CSCV التوافقي ({result.cscvCombinationsTested} حزمة)
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/60 pt-1.5">
            العتبة المقبولة: أقل من 30% لضمان عدم كون النتائج مصادفة إحصائية.
          </div>
        </div>

        {/* Deflated Sharpe Ratio Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>نسبة شارب المفرغة (DSR)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className={`font-mono text-2xl font-bold mt-1 ${result.deflatedSharpeRatio >= 0.85 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {(result.deflatedSharpeRatio * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            أقصى شارب متوقع: {result.expectedMaxSharpe.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/60 pt-1.5">
            معادلة Bailey & López de Prado لتصحيح انحياز التجارب المتكررة والتفرطح.
          </div>
        </div>

        {/* Frozen Holdout Performance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>عينة الحفظ المجمدة (Holdout)</span>
            <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono">
              مجمدة 25%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`font-mono text-2xl font-bold ${result.holdoutSharpe >= 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {result.holdoutSharpe.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              عائد: {(result.holdoutReturn * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            حالة الاجتياز: {result.holdoutPass ? 'ناجح (موجب خارج العينة)' : 'فشل خارج العينة'}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/60 pt-1.5">
            لا تُستخدم عينة الحفظ المجمدة أبداً في اختيار المعلمات أو تدريبها.
          </div>
        </div>

        {/* Parameter Perturbation Sensitivity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>حساسية المعلمات (Perturbation)</span>
            <span className="text-[10px] font-mono text-slate-400">±10% Shift</span>
          </div>
          <div className={`font-mono text-2xl font-bold mt-1 ${result.parameterPerturbationDegradation < 0.25 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {(result.parameterPerturbationDegradation * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            نسبة تراجع الأداء عند تغيير النوافذ
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/60 pt-1.5">
            تراجع أقل من 25% يثبت وجود هضبة استقرار عريضة بدلاً من قمة سكين حادة.
          </div>
        </div>
      </div>

      {/* Chronological Split Breakdown Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <h4 className="text-xs font-bold text-slate-200 mb-2">
          مقارنة نسبة شارب عبر التقسيمات الزمنية الصارمة (Zero Lookahead Split Verification):
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-950/70 border border-blue-500/20 rounded-lg p-3">
            <div className="text-blue-400 text-[11px] font-sans font-semibold">1. التدريب الأولي (Train 50%)</div>
            <div className="text-xl font-bold text-slate-100 mt-1">{result.trainSharpe.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">شاشة الفحص واختيار القواعد</div>
          </div>

          <div className="bg-slate-950/70 border border-amber-500/20 rounded-lg p-3">
            <div className="text-amber-400 text-[11px] font-sans font-semibold">2. التحقق المتقاطع (Validation 25%)</div>
            <div className="text-xl font-bold text-slate-100 mt-1">{result.validationSharpe.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">اختبار Walk-Forward والمعايرة</div>
          </div>

          <div className="bg-slate-950/70 border border-purple-500/20 rounded-lg p-3">
            <div className="text-purple-400 text-[11px] font-sans font-semibold">3. عينة الحفظ المجمدة (Holdout 25%)</div>
            <div className="text-xl font-bold text-slate-100 mt-1">{result.holdoutSharpe.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">اختبار التحقق النهائي المعتمد</div>
          </div>
        </div>
      </div>
    </div>
  );
};
