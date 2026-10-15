import React, { useState } from 'react';
import { Candle } from '../types/quant';

interface CandlestickChartProps {
  candles: Candle[];
  symbol: string;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ candles, symbol }) => {
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  if (!candles || candles.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
        لا توجد بيانات شموع متاحة للعرض.
      </div>
    );
  }

  // Display the most recent 70 candles for clear crisp viewing
  const displayCount = Math.min(70, candles.length);
  const subset = candles.slice(-displayCount);

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let maxVolume = 0;

  for (const c of subset) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
    if (c.volume > maxVolume) maxVolume = c.volume;
  }

  // Add 4% padding to price bounds
  const pricePadding = (maxPrice - minPrice) * 0.04;
  minPrice -= pricePadding;
  maxPrice += pricePadding;
  const priceRange = Math.max(1e-6, maxPrice - minPrice);

  const svgWidth = 800;
  const svgHeight = 320;
  const chartHeight = 240;
  const volumeHeight = 60;
  const margin = { top: 20, right: 60, bottom: 20, left: 10 };

  const usableWidth = svgWidth - margin.left - margin.right;
  const candleWidth = Math.max(2, (usableWidth / displayCount) * 0.7);
  const candleGap = usableWidth / displayCount;

  const getY = (val: number) => {
    return margin.top + chartHeight - ((val - minPrice) / priceRange) * chartHeight;
  };

  const getVolY = (vol: number) => {
    const norm = maxVolume > 0 ? vol / maxVolume : 0;
    return svgHeight - margin.bottom - norm * volumeHeight;
  };

  const activeCandle = hoveredCandle || subset[subset.length - 1];

  // Train / Val / Holdout partitions indicator on the timeline
  const trainSplitRatio = 0.50;
  const valSplitRatio = 0.75;
  const trainX = margin.left + usableWidth * trainSplitRatio;
  const valX = margin.left + usableWidth * valSplitRatio;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
      {/* Top Details & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-sm text-slate-100">{symbol}</span>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">O: <strong className="text-slate-200">{activeCandle?.open.toLocaleString()}</strong></span>
            <span className="text-slate-400">H: <strong className="text-emerald-400">{activeCandle?.high.toLocaleString()}</strong></span>
            <span className="text-slate-400">L: <strong className="text-red-400">{activeCandle?.low.toLocaleString()}</strong></span>
            <span className="text-slate-400">C: <strong className="text-cyan-300">{activeCandle?.close.toLocaleString()}</strong></span>
            <span className="text-slate-400">V: <strong className="text-slate-300">{activeCandle?.volume.toFixed(1)}</strong></span>
          </div>
        </div>

        {/* Chronological split legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/20 border border-blue-500/40"></span>
            <span className="text-slate-300">تدريب (Train 50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/40"></span>
            <span className="text-slate-300">تحقق (Validation 25%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/20 border border-purple-500/40"></span>
            <span className="text-slate-300">حفظ مجمد (Holdout 25%)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden bg-slate-950/80 rounded-lg border border-slate-800/80">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredCandle(null)}
        >
          {/* Background Split Regions */}
          <rect x={margin.left} y={margin.top} width={trainX - margin.left} height={chartHeight} fill="rgba(59, 130, 246, 0.04)" />
          <rect x={trainX} y={margin.top} width={valX - trainX} height={chartHeight} fill="rgba(245, 158, 11, 0.04)" />
          <rect x={valX} y={margin.top} width={usableWidth - (valX - margin.left)} height={chartHeight} fill="rgba(168, 85, 247, 0.04)" />

          {/* Partition Separator Lines */}
          <line x1={trainX} y1={margin.top} x2={trainX} y2={chartHeight + margin.top} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity="0.4" />
          <line x1={valX} y1={margin.top} x2={valX} y2={chartHeight + margin.top} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity="0.4" />

          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const pVal = minPrice + priceRange * pct;
            const y = getY(pVal);
            return (
              <g key={idx}>
                <line x1={margin.left} y1={y} x2={margin.left + usableWidth} y2={y} stroke="#1e293b" strokeDasharray="2 4" />
                <text x={margin.left + usableWidth + 6} y={y + 3} fill="#64748b" fontSize="10" fontFamily="monospace">
                  {pVal > 1000 ? pVal.toFixed(0) : pVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Candlesticks & Volume */}
          {subset.map((c, i) => {
            const x = margin.left + i * candleGap + candleGap / 2;
            const isUp = c.close >= c.open;
            const color = isUp ? '#10b981' : '#ef4444';

            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
            const volY = getVolY(c.volume);
            const volBarHeight = Math.max(1, svgHeight - margin.bottom - volY);

            return (
              <g
                key={i}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={() => setHoveredCandle(c)}
              >
                {/* Wick */}
                <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1.2" />
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="0.5"
                />
                {/* Volume Bar */}
                <rect
                  x={x - candleWidth / 2}
                  y={volY}
                  width={candleWidth}
                  height={volBarHeight}
                  fill={isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-mono">
        <span>عرض أحدث {subset.length} شمعة تداول فورية مع تقسيم فضاء التدريب والتحقق والحفظ</span>
        <span>تحديث مستمر من Binance Public API</span>
      </div>
    </div>
  );
};
