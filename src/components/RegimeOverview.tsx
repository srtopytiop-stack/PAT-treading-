import React from 'react';
import { Layers, Activity, AlertOctagon, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';
import { MarketRegimeState } from '../types/quant';

interface RegimeOverviewProps {
  regimeState: MarketRegimeState | null;
}

export const RegimeOverview: React.FC<RegimeOverviewProps> = ({ regimeState }) => {
  if (!regimeState) return null;

  const { currentRegime, regimeProbabilities, garchAnnualizedVol, changePointDetected } = regimeState;

  const regimeConfig = {
    BULL_TREND: {
      titleAr: 'نظام اتجاه صاعد (Bull Trend)',
      descAr: 'انحراف إيجابي مستقر مع تقلب منخفض إلى معتدل.',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
      icon: TrendingUp,
      color: 'text-emerald-400',
    },
    BEAR_TREND: {
      titleAr: 'نظام اتجاه هابط (Bear Trend)',
      descAr: 'انحراف سلبي متسارع مع ارتفاع في مخاطر التفرطح.',
      badgeClass: 'bg-red-950/80 text-red-300 border-red-500/30',
      icon: TrendingDown,
      color: 'text-red-400',
    },
    SIDEWAYS_VOLATILE: {
      titleAr: 'نظام تذبذب عرضي متقلب (Sideways Volatile)',
      descAr: 'انحراف قريب من الصفر مع ارتدادات سريعة وانضغاط مدى.',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
      icon: RefreshCcw,
      color: 'text-amber-400',
    },
  }[currentRegime];

  const CurrentIcon = regimeConfig.icon;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">تحليل أنظمة السوق والتقلب الحركي (Regimes & Volatility)</h3>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold ${regimeConfig.badgeClass}`}>
          <CurrentIcon className="w-3.5 h-3.5" />
          <span>{regimeConfig.titleAr}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Regime Probabilities */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2 font-medium">احتماليات أنظمة السوق المقدرة (HMM / GMM):</div>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-emerald-400">اتجاه صاعد (Bull):</span>
                <span className="font-mono font-bold text-slate-200">{(regimeProbabilities.BULL_TREND * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${regimeProbabilities.BULL_TREND * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-amber-400">تذبذب عرضي (Sideways):</span>
                <span className="font-mono font-bold text-slate-200">{(regimeProbabilities.SIDEWAYS_VOLATILE * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${regimeProbabilities.SIDEWAYS_VOLATILE * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-red-400">اتجاه هابط (Bear):</span>
                <span className="font-mono font-bold text-slate-200">{(regimeProbabilities.BEAR_TREND * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${regimeProbabilities.BEAR_TREND * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* GARCH Volatility */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-400 mb-1 font-medium">التقلب السنوي المقدر بنموذج GARCH(1,1):</div>
            <div className="font-mono text-2xl font-bold text-cyan-300 mt-1">
              {(garchAnnualizedVol * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              معادلة التباين الشرطي: σ²_t = ω + α ε²_{`t-1`} + β σ²_{`t-1`}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded mt-2">
            مستوى المخاطرة: {garchAnnualizedVol > 0.65 ? 'مرتفع جداً (ذيول سميكة)' : garchAnnualizedVol > 0.40 ? 'معتدل' : 'منخفض ومستقر'}
          </div>
        </div>

        {/* CUSUM Change Point Detector */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-400 mb-1 font-medium">كاشف نقاط التحول الهيكلية (CUSUM):</div>
            <div className="flex items-center gap-2 mt-2">
              {changePointDetected ? (
                <div className="flex items-center gap-1.5 text-xs text-red-300 bg-red-950/60 border border-red-500/30 px-2.5 py-1 rounded-lg">
                  <AlertOctagon className="w-4 h-4 text-red-400" />
                  <span>تم رصد تحول هيكلي حديث في توزيع العائدات!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>استقرار إحصائي دون قفزات عشوائية حادة</span>
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              يراقب المجموع التراكمي للبواقي المعيارية لرصد الانكسارات المفاجئة في تقلبات السوق.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
