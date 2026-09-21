import React from 'react';
import { GameSettings } from '../types';
import { Sliders, X, Crosshair, Cpu, Cloud, Volume2, Sparkles, Compass, Circle, Square } from 'lucide-react';
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

            {/* PUBG / BGMI Peek & Lean Mode */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-slate-300">PUBG / BGMI Lean Mode</span>
                <span className="font-mono text-cyan-400 font-bold uppercase text-[10px]">
                  {current.leanMode === 'hold' ? 'HOLD TO PEEK' : 'TAP TO TOGGLE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'toggle', label: 'Tap to Toggle (< / >)' },
                  { id: 'hold', label: 'Hold to Peek (< / >)' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleChange('leanMode', m.id)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition-all border cursor-pointer font-mono text-center ${
                      (current.leanMode || 'toggle') === m.id
                        ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Hotkeys: &lt; (or Comma) to Lean Left, &gt; (or Period) to Lean Right. Firing supported while leaning.
              </span>
            </div>

            {/* Tactical Radar / Minimap Display Style */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-300">Tactical Radar (Minimap) Style</span>
                </div>
                <span className="font-mono text-cyan-400 font-bold uppercase text-[10px]">
                  {(current.minimapShape || 'circular') === 'square' ? 'WARZONE SQUARE' : 'CIRCULAR 360°'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'circular',
                    label: 'Circular 360°',
                    desc: 'Classic Radial Radar',
                    icon: Circle,
                  },
                  {
                    id: 'square',
                    label: 'Square Grid',
                    desc: 'Warzone / MW Corner View',
                    icon: Square,
                  },
                ].map(style => {
                  const Icon = style.icon;
                  const isSelected = (current.minimapShape || 'circular') === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleChange('minimapShape', style.id)}
                      className={`p-2 rounded-lg text-left transition-all border cursor-pointer font-mono flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold uppercase">{style.label}</span>
                        <span className="text-[9px] opacity-75">{style.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Square radar provides 25% expanded corner peripheral vision; Circular provides pure 360° compass bearings.
              </span>
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
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)] animate-pulse'
                  : (current.graphicsMode || 'standard') === 'smooth'
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {(current.graphicsMode || 'standard') === 'extreme' ? '⚡ SUPER EXTREME RTX ACTIVE' : (current.graphicsMode || 'standard') === 'smooth' ? '⚡ SMOOTH PERFORMANCE (120+ FPS)' : '🎯 STANDARD DEFAULT (HD)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'smooth', label: 'Smooth', sub: 'Pure Performance' },
                { id: 'standard', label: 'Standard', sub: 'Default AAA' },
                { id: 'extreme', label: '⚡ Super Extreme', sub: 'Ray-Traced RTX' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    updateBatch({
                      graphicsMode: g.id as any,
                      graphicsQuality: g.id === 'smooth' ? 'medium' : g.id === 'standard' ? 'high' : 'ultra',
                    });
                  }}
                  className={`py-2.5 px-2 rounded-lg text-left transition-all border cursor-pointer flex flex-col items-center justify-center text-center ${
                    (current.graphicsMode || 'standard') === g.id
                      ? g.id === 'extreme'
                        ? 'bg-amber-950/70 border-amber-400 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/50'
                        : 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase font-mono">{g.label}</span>
                  <span className="text-[9px] opacity-75 font-mono">{g.sub}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-slate-400 font-mono bg-black/40 p-2.5 rounded border border-slate-800/60 leading-relaxed">
              {(current.graphicsMode || 'standard') === 'extreme' && (
                <div className="text-amber-300/90">
                  <strong className="text-amber-300 font-bold block mb-1">⚡ SUPER EXTREME (RTX RAY-TRACED GRAPHICS):</strong>
                  Dynamic 4K Cascaded Contact Shadows centered on player (~45 texels/meter), Ray-Traced Global Illumination (RT-GI ground bounce & specular rim lighting), 360° HDR environment reflections, real-time gunshot muzzle flash & grenade blast shadow casting, and high-frequency micro-surface normal relief.
                </div>
              )}
              {(current.graphicsMode || 'standard') === 'standard' && (
                <div className="text-emerald-300/90">
                  <strong className="text-emerald-300 font-bold block mb-1">🎯 STANDARD (DEFAULT AAA HIGH-DEF):</strong>
                  High-definition balanced graphics with 2048x2048 PCF soft shadows, natural HDR reflections, ACES filmic tone mapping, and volumetric godray shafts.
                </div>
              )}
              {(current.graphicsMode || 'standard') === 'smooth' && (
                <div className="text-cyan-300/90">
                  <strong className="text-cyan-300 font-bold block mb-1">🚀 SMOOTH (PURE PERFORMANCE):</strong>
                  Optimized competitive esports parameters: raw 1.0 pixel ratio, shadow compute disabled, flat lighting for maximum visibility, and reduced particle overhead for buttery smooth 120+ FPS.
                </div>
              )}
            </div>
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
