import React from 'react';
import { Play, Sliders, RotateCcw, Crosshair, Home, LogOut } from 'lucide-react';
import { GameMode, WeatherType } from '../types';

interface PauseMenuProps {
  gameMode: GameMode;
  currentWeather?: WeatherType;
  onResume: () => void;
  onOpenGunsmith: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onReturnToHome?: () => void;
  onChangeMode: (mode: GameMode) => void;
  onSelectWeather?: (weather: WeatherType) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  gameMode,
  currentWeather,
  onResume,
  onOpenGunsmith,
  onOpenSettings,
  onRestart,
  onReturnToHome,
  onChangeMode,
  onSelectWeather,
}) => {
  return (
    <div id="pause-menu" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6 text-slate-200 select-none">
      <div className="w-full max-w-lg bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl p-8 flex flex-col gap-5 text-center">
        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">Tactical Deployment</span>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white">Operation Paused</h2>
        </div>

        {/* Menu Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <Play className="w-4 h-4 fill-slate-950" /> Resume Mission
          </button>

          <button
            onClick={onOpenGunsmith}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm uppercase tracking-widest rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <Crosshair className="w-4 h-4 text-cyan-400" /> Gunsmith Armory
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm uppercase tracking-widest rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <Sliders className="w-4 h-4 text-cyan-400" /> Settings & Preferences
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm uppercase tracking-widest rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" /> Restart Match
          </button>

          {onReturnToHome && (
            <button
              onClick={onReturnToHome}
              className="w-full py-3 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-bold text-sm uppercase tracking-widest rounded-xl border border-rose-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono shadow-md hover:shadow-rose-950/50"
            >
              <Home className="w-4 h-4 text-rose-400" /> Exit to Main Lobby
            </button>
          )}
        </div>

        {/* Environment & Weather Quick Selector */}
        {onSelectWeather && (
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-800 text-left">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Environment & Time of Day</span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">[T Key in Combat]</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'clear_day', label: 'Clear Day' },
                { id: 'golden_sunset', label: 'Sunset' },
                { id: 'tactical_storm', label: 'Storm & Rain' },
                { id: 'midnight_fog', label: 'Midnight Ops' },
                { id: 'sandstorm', label: 'Sandstorm' },
                { id: 'dynamic_cycle', label: 'Dynamic Cycle' },
              ].map(w => (
                <button
                  key={w.id}
                  onClick={() => onSelectWeather(w.id as WeatherType)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold uppercase transition-all border font-mono cursor-pointer text-center ${
                    (currentWeather || 'dynamic_cycle') === w.id
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Game Mode</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'tdm', label: 'Team Deathmatch' },
              { id: 'gungame', label: 'Gun Game' },
              { id: 'training', label: '🎯 Training Range (0 Enemies)' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => onChangeMode(m.id as GameMode)}
                className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all border font-mono cursor-pointer ${
                  gameMode === m.id
                    ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Controls Quick Guide */}
        <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-col gap-1 text-left">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] font-mono">Tactical Directives</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10.5px]">
            <div><span className="text-cyan-400">WASD:</span> Move</div>
            <div><span className="text-cyan-400">T:</span> Shift Weather / Time</div>
            <div><span className="text-cyan-400">Right-Click:</span> ADS Zoom</div>
            <div><span className="text-cyan-400">F:</span> Flashlight & Laser</div>
            <div><span className="text-cyan-400">G:</span> Frag Grenade</div>
            <div><span className="text-cyan-400">V / MMB:</span> Quick Melee</div>
            <div><span className="text-cyan-400">C:</span> Crouch / Slide</div>
            <div><span className="text-cyan-400">I:</span> Inspect Weapon Camo</div>
          </div>
        </div>
      </div>
    </div>
  );
};
