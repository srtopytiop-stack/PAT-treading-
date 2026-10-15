import React from 'react';
import { ShieldAlert, Cpu, Activity, RefreshCw } from 'lucide-react';
import { TRADING_ENABLED, LIVE_TRADING_ENABLED } from '../config/constants';

interface HeaderProps {
  symbol: string;
  timeframe: string;
  isResearching: boolean;
  statusMessage: string;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (tf: string) => void;
  onRunResearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  symbol,
  timeframe,
  isResearching,
  statusMessage,
  onSymbolChange,
  onTimeframeChange,
  onRunResearch,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      {/* Top Security Banner */}
      <div className="bg-amber-950/40 border-b border-amber-500/20 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 text-amber-200">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">قيد أمان غير قابل للتفاوض:</span>
          <span>Binance Spot Public Market-Data فقط. لا تداول حقيقي، لا مفاتيح خاصة، ولا أوامر بيع أو شراء مباشرة.</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="bg-red-950/80 text-red-300 border border-red-500/30 px-2 py-0.5 rounded">
            TRADING_ENABLED = {TRADING_ENABLED ? 'TRUE' : 'FALSE'}
          </span>
          <span className="bg-red-950/80 text-red-300 border border-red-500/30 px-2 py-0.5 rounded">
            LIVE_TRADING = {LIVE_TRADING_ENABLED ? 'TRUE' : 'FALSE'}
          </span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/10 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">PAT Trading</h1>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                v2.4 Quant Lab
              </span>
            </div>
            <p className="text-xs text-slate-400">مختبر الأبحاث الكمية والتحقق الإحصائي المستقل</p>
          </div>
        </div>

        {/* Global Controls & Action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Symbol Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
            <span className="text-xs text-slate-400">الزوج:</span>
            <select
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold text-cyan-300 focus:outline-none cursor-pointer"
              disabled={isResearching}
            >
              <option value="BTCUSDT" className="bg-slate-900 text-slate-200">BTC/USDT (Spot)</option>
              <option value="ETHUSDT" className="bg-slate-900 text-slate-200">ETH/USDT (Spot)</option>
              <option value="SOLUSDT" className="bg-slate-900 text-slate-200">SOL/USDT (Spot)</option>
              <option value="BNBUSDT" className="bg-slate-900 text-slate-200">BNB/USDT (Spot)</option>
              <option value="ADAUSDT" className="bg-slate-900 text-slate-200">ADA/USDT (Spot)</option>
              <option value="AVAXUSDT" className="bg-slate-900 text-slate-200">AVAX/USDT (Spot)</option>
            </select>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
            <span className="text-xs text-slate-400">الإطار:</span>
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold text-cyan-300 focus:outline-none cursor-pointer"
              disabled={isResearching}
            >
              <option value="15m" className="bg-slate-900 text-slate-200">15m</option>
              <option value="1h" className="bg-slate-900 text-slate-200">1h (ساعة)</option>
              <option value="4h" className="bg-slate-900 text-slate-200">4h (4 ساعات)</option>
              <option value="1d" className="bg-slate-900 text-slate-200">1d (يومي)</option>
            </select>
          </div>

          {/* Run Research Cycle Button */}
          <button
            onClick={onRunResearch}
            disabled={isResearching}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs shadow-md transition-all ${
              isResearching
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20 cursor-pointer active:scale-95'
            }`}
          >
            {isResearching ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>جاري البحث الكمي...</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 text-cyan-200" />
                <span>تشغيل دورة البحث الآلي</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress or Status Bar */}
      {statusMessage && (
        <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 py-1.5 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="truncate">{statusMessage}</span>
          </div>
        </div>
      )}
    </header>
  );
};
