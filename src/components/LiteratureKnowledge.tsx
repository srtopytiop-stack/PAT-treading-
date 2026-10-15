import React, { useState } from 'react';
import { BookOpen, Search, GraduationCap, CheckCircle, Clock } from 'lucide-react';
import { RESEARCH_PAPERS } from '../services/literature';
import { LiteraturePaper } from '../types/quant';

export const LiteratureKnowledge: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaper, setSelectedPaper] = useState<LiteraturePaper>(RESEARCH_PAPERS[0]);

  const filtered = RESEARCH_PAPERS.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.titleAr.includes(searchQuery) ||
    p.authors.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              سجل الأدبيات الكمية والأوراق الأكاديمية (Literature & Research Engine)
            </h3>
          </div>
          <span className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
            {RESEARCH_PAPERS.length} مراجع علمية معتمدة
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          المرجعية العلمية التي تحكم مختبر PAT Trading. استخراج الفرضيات الرياضية، المتغيرات اللازمة، شروط الصلاحية،
          وقيود الدراسة التجريبية. لا يُعتبر تلخيص النماذج اللغوية إثباتاً علمياً، مع الفصل الصارم بين الادعاء المنشور ونتائج اختبارات PAT.
        </p>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الأوراق العلمية، المؤلفين، أو المفاهيم الرياضية..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Papers List */}
        <div className="space-y-2">
          <div className="text-xs text-slate-400 px-1 font-medium">قائمة الأوراق البحثية</div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filtered.map((paper) => {
              const isSelected = selectedPaper.id === paper.id;
              return (
                <div
                  key={paper.id}
                  onClick={() => setSelectedPaper(paper)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/60 shadow-md shadow-cyan-500/5'
                      : 'bg-slate-900/80 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-cyan-300">
                      {paper.venueOrArxiv}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {paper.year}
                    </span>
                  </div>

                  <h5 className="font-semibold text-slate-100 line-clamp-2 mb-1 leading-snug">
                    {paper.titleAr}
                  </h5>

                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    {paper.authors}
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">حالة التطبيق في PAT:</span>
                    <span className={`flex items-center gap-1 font-mono ${
                      paper.patImplementationStatus === 'implemented'
                        ? 'text-emerald-400'
                        : 'text-cyan-400'
                    }`}>
                      <CheckCircle className="w-3 h-3" />
                      {paper.patImplementationStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Paper Deep Dive Inspector */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                {selectedPaper.venueOrArxiv} ({selectedPaper.year})
              </span>
              <span className="text-xs text-slate-400 font-mono">
                المؤلفون: {selectedPaper.authors}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-100 mt-2">
              {selectedPaper.titleAr}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {selectedPaper.title}
            </p>
          </div>

          {/* Mathematical Hypothesis & Formula */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
            <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>الفرضية الرياضية والمعادلة المركزية:</span>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded p-2.5 font-mono text-xs text-cyan-200 break-all leading-relaxed">
              {selectedPaper.mathematicalHypothesisAr}
            </div>
          </div>

          {/* Key Contribution & PAT Application */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
              <span className="font-semibold text-slate-300 block mb-1">المساهمة العلمية المركزية:</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {selectedPaper.keyContributionAr}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
              <span className="font-semibold text-emerald-400 block mb-1">تطبيقها الفعلي في PAT Trading:</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedPaper.relevanceAr}
              </p>
            </div>
          </div>

          {/* Limitations and Empirical Cautions */}
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 text-xs">
            <span className="font-semibold text-amber-300 block mb-1">
              القيود المنهجية وتحذيرات عدم اليقين (Study Limitations):
            </span>
            <p className="text-amber-200/90 text-[11px] leading-relaxed">
              {selectedPaper.limitationsAr}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
