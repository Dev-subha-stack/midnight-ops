import React from 'react';
import { Play, Sliders, RotateCcw, Crosshair, Home, Sparkles, Sun, Gamepad2 } from 'lucide-react';
import { GameMode, WeatherType, GraphicsMode } from '../types';

interface PauseMenuProps {
  gameMode: GameMode;
  currentWeather?: WeatherType;
  graphicsMode?: GraphicsMode;
  onResume: () => void;
  onOpenGunsmith: () => void;
  onOpenSettings: () => void;
  onOpenHudCustomizer?: () => void;
  onRestart: () => void;
  onReturnToHome?: () => void;
  onChangeMode: (mode: GameMode) => void;
  onSelectWeather?: (weather: WeatherType) => void;
  onSelectGraphicsMode?: (mode: GraphicsMode) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  gameMode,
  currentWeather = 'clear_day',
  graphicsMode = 'standard',
  onResume,
  onOpenGunsmith,
  onOpenSettings,
  onOpenHudCustomizer,
  onRestart,
  onReturnToHome,
  onSelectWeather,
  onSelectGraphicsMode,
}) => {
  return (
    <div
      id="pause-menu"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 text-zinc-100 select-none"
    >
      <div className="w-full max-w-3xl bg-[#0D1015]/95 border border-white/10 rounded-sm shadow-2xl p-6 sm:p-7 flex flex-col gap-5 cod-chamfer">
        {/* Header */}
        <div className="flex justify-between items-end border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#A3E635] font-semibold block">
              Deployment Active · {gameMode.toUpperCase()}
            </span>
            <h2 className="font-display text-3xl font-bold uppercase text-white tracking-wider leading-none mt-1">
              Tactical Pause
            </h2>
          </div>

          <span className="text-[11px] font-mono uppercase text-zinc-400">
            Press [ESC] to Resume
          </span>
        </div>

        {/* 2-Column COD Blade Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left: Blade Commands */}
          <div className="md:col-span-6 flex flex-col gap-2">
            <button
              onClick={onResume}
              className="w-full py-3 px-4 bg-[#A3E635] hover:bg-[#BEF264] text-[#090B0E] font-bold text-xs uppercase tracking-widest rounded-sm cod-chamfer-sm transition-all flex items-center justify-between cursor-pointer font-mono"
            >
              <span className="flex items-center gap-2.5">
                <Play className="w-4 h-4 fill-[#090B0E]" /> Resume Match
              </span>
              <span className="text-[10px] font-bold opacity-80">[ESC]</span>
            </button>

            <button
              onClick={onOpenGunsmith}
              className="w-full py-2.5 px-4 bg-[#151921] hover:bg-[#1E242E] text-zinc-100 font-semibold text-xs uppercase tracking-wider rounded-sm border border-white/10 hover:border-[#A3E635]/50 transition-all flex items-center justify-between cursor-pointer font-mono"
            >
              <span className="flex items-center gap-2.5">
                <Crosshair className="w-4 h-4 text-[#A3E635]" /> Gunsmith & Operator
              </span>
              <span className="text-[10px] text-zinc-400">[B]</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="w-full py-2.5 px-4 bg-[#151921] hover:bg-[#1E242E] text-zinc-100 font-semibold text-xs uppercase tracking-wider rounded-sm border border-white/10 hover:border-white/25 transition-all flex items-center justify-between cursor-pointer font-mono"
            >
              <span className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-zinc-300" /> Settings & Sensitivity
              </span>
            </button>

            {onOpenHudCustomizer && (
              <button
                id="btn-pause-custom-hud"
                onClick={onOpenHudCustomizer}
                className="w-full py-2.5 px-4 bg-[#151921] hover:bg-[#1E242E] text-[#A3E635] font-semibold text-xs uppercase tracking-wider rounded-sm border border-[#A3E635]/30 hover:border-[#A3E635] transition-all flex items-center justify-between cursor-pointer font-mono"
              >
                <span className="flex items-center gap-2.5">
                  <Gamepad2 className="w-4 h-4 text-[#A3E635]" /> Customize Controls HUD
                </span>
                <span className="text-[10px] text-zinc-400">TOUCH</span>
              </button>
            )}

            <button
              onClick={onRestart}
              className="w-full py-2.5 px-4 bg-[#151921] hover:bg-[#1E242E] text-zinc-200 font-semibold text-xs uppercase tracking-wider rounded-sm border border-white/10 hover:border-white/25 transition-all flex items-center justify-between cursor-pointer font-mono"
            >
              <span className="flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4 text-zinc-300" /> Restart Match
              </span>
            </button>

            {onReturnToHome && (
              <button
                onClick={onReturnToHome}
                className="w-full py-2.5 px-4 bg-[#1E1214] hover:bg-[#2B1619] text-red-300 font-semibold text-xs uppercase tracking-wider rounded-sm border border-red-500/25 hover:border-red-500/50 transition-all flex items-center justify-between cursor-pointer font-mono mt-1"
              >
                <span className="flex items-center gap-2.5">
                  <Home className="w-4 h-4 text-red-400" /> Leave Match to HQ
                </span>
              </button>
            )}
          </div>

          {/* Right: Graphics, Weather & Keybinds */}
          <div className="md:col-span-6 flex flex-col gap-3">
            {onSelectGraphicsMode && (
              <div className="flex flex-col gap-2 bg-[#12151B] p-3.5 rounded-sm border border-white/10">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <Sparkles className="w-3.5 h-3.5 text-[#A3E635]" /> Graphics Engine
                  </span>
                  <span className="text-[#A3E635]">
                    {graphicsMode === 'extreme' ? 'RTX EXTREME' : graphicsMode === 'smooth' ? '144 FPS' : 'STANDARD HD'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'smooth', label: 'Smooth', sub: '144 FPS' },
                    { id: 'standard', label: 'Standard', sub: 'HD AAA' },
                    { id: 'extreme', label: 'Extreme', sub: 'RTXGI' },
                  ].map(g => (
                    <button
                      key={g.id}
                      onClick={() => onSelectGraphicsMode(g.id as GraphicsMode)}
                      className={`py-2 px-1.5 rounded-sm transition-all border font-mono cursor-pointer flex flex-col items-center justify-center text-center ${
                        graphicsMode === g.id
                          ? 'bg-[#1B2214] border-[#A3E635] text-[#A3E635]'
                          : 'bg-[#0C0E12] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">{g.label}</span>
                      <span className="text-[9px] opacity-70">{g.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {onSelectWeather && (
              <div className="flex flex-col gap-2 bg-[#12151B] p-3.5 rounded-sm border border-white/10">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> Time of Day
                  </span>
                  <span className="text-zinc-500">[T]</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'clear_day', label: 'Noon' },
                    { id: 'golden_sunset', label: 'Dusk' },
                    { id: 'midnight_fog', label: 'Night' },
                  ].map(w => (
                    <button
                      key={w.id}
                      onClick={() => onSelectWeather(w.id as WeatherType)}
                      className={`py-2 px-2 rounded-sm text-[10px] font-bold uppercase transition-all border font-mono cursor-pointer text-center ${
                        currentWeather === w.id
                          ? 'bg-[#1B2214] border-[#A3E635] text-[#A3E635]'
                          : 'bg-[#0C0E12] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Controls Reference */}
            <div className="flex flex-col gap-1.5 bg-[#12151B] p-3 rounded-sm border border-white/10 text-[10px] font-mono text-zinc-400">
              <span className="text-[10px] text-zinc-200 uppercase font-semibold tracking-wider">
                Combat Controls
              </span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div><span className="text-[#A3E635] font-bold">WASD</span> Move</div>
                <div><span className="text-[#A3E635] font-bold">R-CLICK</span> Aim Down Sights</div>
                <div><span className="text-[#A3E635] font-bold">SHIFT</span> Tac Sprint</div>
                <div><span className="text-[#A3E635] font-bold">C / CTRL</span> Slide / Crouch</div>
                <div><span className="text-[#A3E635] font-bold">G / Q</span> Frag / Tactical</div>
                <div><span className="text-[#A3E635] font-bold">F</span> Tactical Laser</div>
                <div><span className="text-[#A3E635] font-bold">TAB</span> Scoreboard</div>
                <div><span className="text-[#A3E635] font-bold">1-8</span> Weapon Slots</div>
                <div className="col-span-2 text-zinc-300 border-t border-white/10 pt-1">
                  <span className="text-[#A3E635] font-bold">&lt; / &gt;</span> Peek Left / Right
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
