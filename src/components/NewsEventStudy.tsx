import React, { useState } from 'react';
import { Newspaper, Calendar, ExternalLink, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Candle, NewsEventItem } from '../types/quant';
import { VERIFIED_NEWS_FEED, newsEngine } from '../services/news';

interface NewsEventStudyProps {
  candles: Candle[];
}

export const NewsEventStudy: React.FC<NewsEventStudyProps> = ({ candles }) => {
  const [selectedEvent, setSelectedEvent] = useState<NewsEventItem>(VERIFIED_NEWS_FEED[0]);

  const study = newsEngine.runEventStudy(selectedEvent, candles, 5, 8);

  return (
    <div className="space-y-4">
      {/* Header & Methodology Note */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              ذكاء الأخبار ودراسات أثر الأحداث (News Intelligence & Event Studies)
            </h3>
          </div>
          <span className="text-[11px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
            Event Study Window: [-5, +8]
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          منهجية كمية دقيقة: فصل مشاعر الخبر (Sentiment) عن نوع الحدث وعن الأثر السعري الحقيقي.
          قياس العائد غير الطبيعي التراكمي (Cumulative Abnormal Return - CAR) خارج العينة مع نوافذ ضبط زمنية حقيقية لمنع التحيز.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Events Timeline Feed */}
        <div className="space-y-2">
          <div className="text-xs text-slate-400 px-1 font-medium">سجل الأحداث الموثقة ({VERIFIED_NEWS_FEED.length})</div>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {VERIFIED_NEWS_FEED.map((evt) => {
              const isSelected = selectedEvent.id === evt.id;
              const isPositive = evt.sentimentScore > 0;
              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/60 shadow-md shadow-cyan-500/5'
                      : 'bg-slate-900/80 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(evt.timestampUtc).toLocaleDateString('ar-EG')}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                      isPositive
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-950 text-red-300 border-red-500/30'
                    }`}>
                      {evt.category}
                    </span>
                  </div>

                  <h5 className="font-semibold text-slate-200 line-clamp-2 mb-1.5 leading-snug">
                    {evt.titleAr}
                  </h5>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60 font-mono">
                    <span className="truncate max-w-[140px]">{evt.source}</span>
                    <span className={evt.carWindowPercent >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      CAR: {evt.carWindowPercent >= 0 ? '+' : ''}{evt.carWindowPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Event Study Analysis */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                المصدر المعتمد: {selectedEvent.source}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {new Date(selectedEvent.timestampUtc).toISOString()} UTC
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-100 mt-2">
              {selectedEvent.titleAr}
            </h4>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Original: {selectedEvent.title}
            </p>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
              <div className="text-slate-400 text-[11px] mb-0.5">درجة المشاعر (Sentiment Score)</div>
              <div className="font-mono text-lg font-bold text-slate-200">
                {selectedEvent.sentimentScore > 0 ? `+${selectedEvent.sentimentScore.toFixed(2)}` : selectedEvent.sentimentScore.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">نطاق القياس: -1.0 إلى +1.0</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
              <div className="text-slate-400 text-[11px] mb-0.5">متوسط عائد الأساس قبل الحدث</div>
              <div className="font-mono text-lg font-bold text-slate-200">
                {(study.preEventMeanReturn * 100).toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pre-event baseline [-5..-1]</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
              <div className="text-slate-400 text-[11px] mb-0.5">العائد غير الطبيعي التراكمي (CAR)</div>
              <div className={`font-mono text-lg font-bold ${study.cumulativeAbnormalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {study.cumulativeAbnormalReturn >= 0 ? '+' : ''}{(study.cumulativeAbnormalReturn * 100).toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Cumulative Abnormal Return</div>
            </div>
          </div>

          {/* Abnormal Returns breakdown table */}
          {study.abnormalReturns.length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>سلسلة العائد غير الطبيعي لكل شمعة لاحقة (Post-Event Horizon):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                {study.abnormalReturns.slice(0, 8).map((ar, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded p-1.5 text-center">
                    <span className="text-[10px] text-slate-500 block">T+{idx + 1}</span>
                    <strong className={ar.abnormalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {ar.abnormalReturn >= 0 ? '+' : ''}{(ar.abnormalReturn * 100).toFixed(2)}%
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-800/40">
            تأكيد سلامة البحث: لا يتم اختراع مشاعر أو مصداقية وهمية في غياب مصدر وبيانات تحقق فعلية.
          </div>
        </div>
      </div>
    </div>
  );
};
