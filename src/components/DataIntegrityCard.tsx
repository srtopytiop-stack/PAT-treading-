import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, Database, Clock } from 'lucide-react';
import { DataIntegrityReport } from '../types/quant';

interface DataIntegrityCardProps {
  report: DataIntegrityReport | null;
}

export const DataIntegrityCard: React.FC<DataIntegrityCardProps> = ({ report }) => {
  if (!report) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center text-slate-500 text-xs">
        جاري تحميل تقرير سلامة البيانات...
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">تدقيق سلامة بيانات السوق (Data Integrity)</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {report.isClean ? (
            <span className="flex items-center gap-1 text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              بيانات سليمة وموثوقة
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              تنبيهات سلامة البيانات
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
          <div className="text-slate-400 text-[11px] mb-0.5">عدد الشموع المسترجعة</div>
          <div className="font-mono text-base font-bold text-slate-100">{report.totalCandles}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Binance Spot Public Klines</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
          <div className="text-slate-400 text-[11px] mb-0.5">الفجوات الزمنية المفقودة</div>
          <div className={`font-mono text-base font-bold ${report.missingCandlesCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {report.missingCandlesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">فحص تواتر الطوابع الزمنية</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
          <div className="text-slate-400 text-[11px] mb-0.5">الشموع المكررة المستبعدة</div>
          <div className={`font-mono text-base font-bold ${report.duplicateCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {report.duplicateCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">استبعاد التكرار لمنع التحيز</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
          <div className="text-slate-400 text-[11px] mb-0.5">التسلسل الزمني المتصاعد</div>
          <div className="font-mono text-base font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>UTC Monotonic</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Strict Timestamp Ordering</div>
        </div>
      </div>

      {/* Timestamp Range */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-1.5 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>النطاق: {report.startTimeUtc.slice(0, 16)} إلى {report.endTimeUtc.slice(0, 16)} UTC</span>
        </div>
        <div className="text-[10px] text-slate-500">
          معيار الإسناد: Spot Cash Long Only (لا يوجد بتر صامت للفترات)
        </div>
      </div>

      {/* Warnings List if any */}
      {report.warnings.length > 0 && (
        <div className="mt-2.5 bg-amber-950/20 border border-amber-500/20 rounded-lg p-2 text-xs text-amber-300/90 space-y-1">
          {report.warnings.map((w, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
