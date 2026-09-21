import React from 'react';
import { Play, Sliders, RotateCcw, Crosshair, Home, Sparkles } from 'lucide-react';
import { GameMode, WeatherType, GraphicsMode } from '../types';

interface PauseMenuProps {
  gameMode: GameMode;
  currentWeather?: WeatherType;
  graphicsMode?: GraphicsMode;
  onResume: () => void;
  onOpenGunsmith: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onReturnToHome?: () => void;
  onChangeMode: (mode: GameMode) => void;
  onSelectWeather?: (weather: WeatherType) => void;
  onSelectGraphicsMode?: (mode: GraphicsMode) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  gameMode,
  currentWeather = 'dynamic_cycle',
  graphicsMode = 'standard',
  onResume,
  onOpenGunsmith,
  onOpenSettings,
  onRestart,
  onReturnToHome,
  onChangeMode,
  onSelectWeather,
  onSelectGraphicsMode,
}) => {
  return (
    <div id="pause-menu" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-6 text-slate-200 select-none font-sans">
      <div className="w-full max-w-3xl bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-5">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                TACTICAL DEPLOYMENT // ACTIVE
              </span>
              <h2 className="text-xl font-black uppercase text-white tracking-tight">
                Mission Paused
              </h2>
            </div>
          </div>

          <span className="text-[10px] font-mono uppercase bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-400 font-bold">
            PRESS [ESC] TO RESUME
          </span>
        </div>

        {/* 2-Column Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left: Primary Command Buttons */}
          <div className="md:col-span-6 flex flex-col gap-2">
            <button
              onClick={onResume}
              className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow hover:shadow-cyan-500/20 flex items-center justify-between cursor-pointer font-mono"
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4 fill-slate-950" /> Resume Mission
              </span>
              <span className="text-[10px] font-bold bg-slate-950/20 px-1.5 py-0.5 rounded">[ESC]</span>
            </button>

            <button
              onClick={onOpenGunsmith}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between cursor-pointer font-mono"
            >
              <span className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" /> Gunsmith Armory
              </span>
              <span className="text-[10px] text-slate-500">[B]</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between cursor-pointer font-mono"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Settings & Sensitivity
              </span>
            </button>

            <button
              onClick={onRestart}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between cursor-pointer font-mono"
            >
              <span className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-cyan-400" /> Restart Match
              </span>
            </button>

            {onReturnToHome && (
              <button
                onClick={onReturnToHome}
                className="w-full py-2.5 px-4 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-rose-500/30 transition-all flex items-center justify-between cursor-pointer font-mono mt-1"
              >
                <span className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-rose-400" /> Return to Main Lobby
                </span>
              </button>
            )}
          </div>

          {/* Right: Graphics Mode & Environment Preset */}
          <div className="md:col-span-6 flex flex-col gap-3">
            {/* Graphics Mode Switcher */}
            {onSelectGraphicsMode && (
              <div className="flex flex-col gap-2 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase font-bold">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Sparkles className="w-3.5 h-3.5" /> Graphics Engine Mode
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded border ${
                    graphicsMode === 'extreme'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold animate-pulse'
                      : graphicsMode === 'smooth'
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      : 'text-slate-400 border-slate-700'
                  }`}>
                    {graphicsMode === 'extreme' ? '⚡ SUPER EXTREME RTX' : graphicsMode === 'smooth' ? '🚀 SMOOTH FPS' : '🎯 STANDARD HD'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'smooth', label: 'Smooth', sub: '120+ FPS' },
                    { id: 'standard', label: 'Standard', sub: 'Default AAA' },
                    { id: 'extreme', label: '⚡ Extreme', sub: 'RTX Ray-Trace' },
                  ].map(g => (
                    <button
                      key={g.id}
                      onClick={() => onSelectGraphicsMode(g.id as GraphicsMode)}
                      className={`py-2 px-1.5 rounded-lg transition-all border font-mono cursor-pointer flex flex-col items-center justify-center text-center truncate ${
                        graphicsMode === g.id
                          ? g.id === 'extreme'
                            ? 'bg-amber-950/70 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                            : 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">{g.label}</span>
                      <span className="text-[8px] opacity-70">{g.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Weather / Atmosphere Presets */}
            {onSelectWeather && (
              <div className="flex flex-col gap-2 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase font-bold">
                  <span>Atmosphere & Time of Day</span>
                  <span className="text-cyan-400">[T in Combat]</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'clear_day', label: 'Day (Noon)' },
                    { id: 'golden_sunset', label: 'Evening' },
                    { id: 'midnight_fog', label: 'Night' },
                  ].map(w => (
                    <button
                      key={w.id}
                      onClick={() => onSelectWeather(w.id as WeatherType)}
                      className={`py-2 px-2 rounded-lg text-[10px] font-bold uppercase transition-all border font-mono cursor-pointer text-center truncate ${
                        currentWeather === w.id
                          ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tactical Controls Reference */}
            <div className="flex flex-col gap-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 text-[10px] font-mono text-slate-400">
              <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">
                Operative Hotkeys
              </span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div><span className="text-cyan-400 font-bold">WASD:</span> Move</div>
                <div><span className="text-cyan-400 font-bold">Right Click:</span> ADS Zoom</div>
                <div><span className="text-cyan-400 font-bold">Shift:</span> Tac Sprint</div>
                <div><span className="text-cyan-400 font-bold">C:</span> Slide / Crouch</div>
                <div><span className="text-cyan-400 font-bold">G / Q:</span> Lethal / Tactical</div>
                <div><span className="text-cyan-400 font-bold">F:</span> Tactical Laser</div>
                <div><span className="text-cyan-400 font-bold">TAB:</span> Scoreboard</div>
                <div><span className="text-cyan-400 font-bold">1-5:</span> Swap Weapons</div>
                <div className="col-span-2 text-cyan-300 border-t border-slate-800/80 pt-1">
                  <span className="text-cyan-400 font-bold">&lt; / &gt; (or , / .):</span> Peek Left / Right & Fire (PUBG/BGMI)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
