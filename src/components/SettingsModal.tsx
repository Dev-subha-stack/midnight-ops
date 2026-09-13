import React from 'react';
import { GameSettings } from '../types';
import { Sliders, X, Crosshair, Cpu, Cloud, Volume2, Sparkles } from 'lucide-react';
import { soundManager } from '../game/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [current, setCurrent] = React.useState<GameSettings>({ ...settings });

  React.useEffect(() => {
    setCurrent({ ...settings });
  }, [settings]);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Enter') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const updateBatch = (partial: Partial<GameSettings>) => {
    const updated = { ...current, ...partial };
    setCurrent(updated);
    onUpdateSettings(updated);
    if ('masterVolume' in partial || 'sfxVolume' in partial) {
      soundManager.setVolumes(updated.masterVolume, updated.sfxVolume);
    }
  };

  const handleChange = (key: keyof GameSettings, val: any) => {
    updateBatch({ [key]: val });
  };

  return (
    <div id="settings-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-6 text-slate-200 select-none font-sans">
      <div className="w-full max-w-xl bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-5">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                SYSTEM CALIBRATION
              </span>
              <h2 className="text-xl font-black uppercase text-white tracking-tight">
                Combat Preferences
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Controls Section */}
          <div className="flex flex-col gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span>Aim & Vision</span>
            </div>

            {/* Mouse Sensitivity */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Aim Sensitivity</span>
                <span className="font-mono text-cyan-400 font-bold">{current.mouseSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.5"
                step="0.1"
                value={current.mouseSensitivity}
                onChange={e => handleChange('mouseSensitivity', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* FOV */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Field of View (FOV)</span>
                <span className="font-mono text-cyan-400 font-bold">{current.fieldOfView}°</span>
              </div>
              <input
                type="range"
                min="70"
                max="105"
                step="1"
                value={current.fieldOfView}
                onChange={e => handleChange('fieldOfView', parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* AI Difficulty */}
          <div className="flex flex-col gap-2.5 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hostile Intelligence Level</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['recruit', 'regular', 'hardened', 'veteran'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => handleChange('botDifficulty', diff)}
                  className={`py-2 rounded-lg text-[11px] font-bold uppercase transition-all border cursor-pointer font-mono text-center ${
                    current.botDifficulty === diff
                      ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Graphics Quality & RTX Engine Mode */}
          <div className="flex flex-col gap-2.5 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Graphics Engine Mode</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                (current.graphicsMode || 'standard') === 'extreme'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}>
                {(current.graphicsMode || 'standard') === 'extreme' ? '⚡ RTX RAY-TRACING ACTIVE' : (current.graphicsMode || 'standard').toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'smooth', label: 'Smooth', sub: 'High FPS' },
                { id: 'standard', label: 'Standard', sub: 'Default AAA' },
                { id: 'extreme', label: 'Extreme', sub: 'RTX Ray-Trace' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    updateBatch({
                      graphicsMode: g.id as any,
                      graphicsQuality: g.id === 'smooth' ? 'medium' : g.id === 'standard' ? 'high' : 'ultra',
                    });
                  }}
                  className={`py-2 px-2 rounded-lg text-left transition-all border cursor-pointer flex flex-col items-center justify-center text-center ${
                    (current.graphicsMode || 'standard') === g.id
                      ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase font-mono">{g.label}</span>
                  <span className="text-[9px] opacity-75 font-mono">{g.sub}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {(current.graphicsMode || 'standard') === 'extreme' && '✨ Extreme Mode enables 4K PCF soft shadows, ACES filmic HDR tone mapping, specular gloss, and ray-marched ballistic light glow.'}
              {(current.graphicsMode || 'standard') === 'standard' && '🎯 Standard Mode provides high-definition balanced graphics with crisp shadows and optimal performance.'}
              {(current.graphicsMode || 'standard') === 'smooth' && '🚀 Smooth Mode optimizes rendering parameters for ultra-high framerates and competitive response time.'}
            </p>
          </div>

          {/* Environment */}
          <div className="flex flex-col gap-2.5 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase">
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Atmospheric Preset</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'clear_day', label: 'Day (Noon)' },
                { id: 'golden_sunset', label: 'Evening' },
                { id: 'midnight_fog', label: 'Night' },
              ].map(w => (
                <button
                  key={w.id}
                  onClick={() => handleChange('weatherPreset', w.id)}
                  className={`py-2 px-2 rounded-lg text-[10px] font-bold uppercase transition-all border cursor-pointer font-mono text-center truncate ${
                    (current.weatherPreset || 'clear_day') === w.id
                      ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio */}
          <div className="flex flex-col gap-2.5 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Combat Sound FX Audio</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                PUBG DATASET ACTIVE
              </span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">SFX Master Volume</span>
              <span className="font-mono text-cyan-400 font-bold">{Math.round(current.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={current.sfxVolume}
              onChange={e => handleChange('sfxVolume', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span className="text-slate-400 font-mono text-[10px]">PUBG Weapon Audio (M416, UMP, AWM, Pump, Deagle)</span>
              <button
                type="button"
                onClick={() => {
                  soundManager.init();
                  soundManager.playGunshot('m4');
                }}
                className="text-[10px] font-mono px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 rounded cursor-pointer transition-colors"
              >
                TEST FIRE
              </button>
            </div>
          </div>
        </div>

        {/* Footer Apply */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow hover:shadow-cyan-500/20 cursor-pointer font-mono"
        >
          Confirm & Save Settings [ESC]
        </button>
      </div>
    </div>
  );
};
