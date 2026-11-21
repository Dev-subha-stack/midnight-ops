import React from 'react';
import { GameSettings } from '../types';
import { Sliders, X, Crosshair, Cpu, Cloud, Volume2, Sparkles, Compass, Circle, Square, Gamepad2 } from 'lucide-react';
import { soundManager } from '../game/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onOpenHudCustomizer?: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onOpenHudCustomizer,
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
    <div
      id="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 text-zinc-100 select-none"
    >
      <div className="w-full max-w-2xl bg-[#0D1015]/95 border border-white/10 rounded-sm shadow-2xl p-6 sm:p-7 flex flex-col gap-5 cod-chamfer">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#161B22] border border-white/10 flex items-center justify-center text-[#A3E635]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A3E635] font-semibold block">
                System Calibration
              </span>
              <h2 className="font-display text-2xl font-bold uppercase text-white tracking-wider leading-none mt-0.5">
                Combat Settings
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-sm bg-[#151921] border border-white/10 hover:bg-[#1E242E] transition-colors text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex flex-col gap-4 max-h-[62vh] overflow-y-auto pr-1">
          {/* Controls Section */}
          <div className="flex flex-col gap-3 bg-[#12151B] p-4 rounded-sm border border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              <Crosshair className="w-3.5 h-3.5 text-[#A3E635]" />
              <span>Aim & Vision</span>
            </div>

            {/* Mouse Sensitivity */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-medium tabular-nums">
                <span className="text-zinc-300">Mouse Sensitivity</span>
                <span className="font-mono text-[#A3E635] font-bold">{current.mouseSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.5"
                step="0.1"
                value={current.mouseSensitivity}
                onChange={e => handleChange('mouseSensitivity', parseFloat(e.target.value))}
                className="w-full accent-[#A3E635] cursor-pointer h-1.5 bg-zinc-800 rounded-sm"
              />
            </div>

            {/* FOV */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-medium tabular-nums">
                <span className="text-zinc-300">Field of View (FOV)</span>
                <span className="font-mono text-[#A3E635] font-bold">{current.fieldOfView}°</span>
              </div>
              <input
                type="range"
                min="70"
                max="105"
                step="1"
                value={current.fieldOfView}
                onChange={e => handleChange('fieldOfView', parseInt(e.target.value))}
                className="w-full accent-[#A3E635] cursor-pointer h-1.5 bg-zinc-800 rounded-sm"
              />
            </div>

            {/* Peek & Lean Mode */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-zinc-300">Peek & Lean Behavior (&lt; / &gt;)</span>
                <span className="font-mono text-[#A3E635] font-bold uppercase text-[10px]">
                  {current.leanMode === 'hold' ? 'HOLD' : 'TOGGLE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'toggle', label: 'Tap to Toggle' },
                  { id: 'hold', label: 'Hold to Peek' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleChange('leanMode', m.id)}
                    className={`py-1.5 px-2 rounded-sm text-[11px] font-bold uppercase transition-all border cursor-pointer font-mono text-center ${
                      (current.leanMode || 'toggle') === m.id
                        ? 'bg-[#1B2214] border-[#A3E635] text-[#A3E635]'
                        : 'bg-[#0C0E12] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactical Radar Style */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
              <div className="flex justify-between items-center text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#A3E635]" />
                  <span className="text-zinc-300">Minimap Shape</span>
                </div>
                <span className="font-mono text-[#A3E635] font-bold uppercase text-[10px]">
                  {(current.minimapShape || 'square') === 'square' ? 'SQUARE RADAR' : 'CIRCULAR 360°'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'square',
                    label: 'Square Grid',
                    desc: 'COD Warzone Corner',
                    icon: Square,
                  },
                  {
                    id: 'circular',
                    label: 'Circular 360°',
                    desc: 'Classic Radial',
                    icon: Circle,
                  },
                ].map(style => {
                  const Icon = style.icon;
                  const isSelected = (current.minimapShape || 'square') === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleChange('minimapShape', style.id)}
                      className={`p-2 rounded-sm text-left transition-all border cursor-pointer font-mono flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-[#1B2214] border-[#A3E635] text-[#A3E635]'
                          : 'bg-[#0C0E12] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold uppercase">{style.label}</span>
                        <span className="text-[9px] opacity-70">{style.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Touch / Mobile Virtual Gamepad Mode */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-zinc-300">Mobile Touch Gamepad</span>
                <span className="font-mono text-[#A3E635] font-bold uppercase text-[10px]">
                  {(current.touchControlsMode || 'auto').toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'auto', label: 'Auto Detect' },
                  { id: 'on', label: 'Always On' },
                  { id: 'off', label: 'Off' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleChange('touchControlsMode', mode.id)}
                    className={`py-2 px-2 rounded-sm text-[11px] font-bold uppercase transition-all border cursor-pointer font-mono text-center ${
                      (current.touchControlsMode || 'auto') === mode.id
                        ? 'bg-[#1B2214] border-[#A3E635] text-[#A3E635]'
                        : 'bg-[#0C0E12] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              {onOpenHudCustomizer && (
                <button
                  id="btn-settings-custom-hud"
                  type="button"
                  onClick={onOpenHudCustomizer}
                  className="mt-1.5 w-full py-2 px-3 rounded-sm bg-[#161B24] hover:bg-[#1E2633] border border-[#A3E635]/40 hover:border-[#A3E635] text-[#A3E635] text-[11px] font-mono font-bold uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Customize Controls Layout (Free Fire / BGMI HUD)</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Difficulty */}
          <div className="flex flex-col gap-2.5 bg-[#12151B] p-4 rounded-sm border border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-[#A3E635]" />
              <span>AI Combatant Difficulty</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['recruit', 'regular', 'hardened', 'veteran'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => handleChange('botDifficulty', diff)}
                  className={`py-2 rounded-sm text-[11px] font-bold uppercase transition-all border cursor-pointer font-mono text-center ${
                    current.botDifficulty === diff
                      ? 'bg-[#1B2214] border-[#A3E635] text-[#A3E635]'
                      : 'bg-[#0C0E12] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="flex flex-col gap-2.5 bg-[#12151B] p-4 rounded-sm border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#A3E635]" />
                <span>Graphics Engine</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#A3E635] uppercase">
                {(current.graphicsMode || 'standard') === 'extreme'
                  ? 'Extreme RTX'
                  : (current.graphicsMode || 'standard') === 'smooth'
                  ? '144 FPS Smooth'
                  : 'Standard HD'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'smooth', label: 'Smooth', sub: '144+ FPS' },
                { id: 'standard', label: 'Standard', sub: 'Default HD' },
                { id: 'extreme', label: 'Extreme', sub: 'RTX Lighting' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    updateBatch({
                      graphicsMode: g.id as any,
                      graphicsQuality: g.id === 'smooth' ? 'medium' : g.id === 'standard' ? 'high' : 'ultra',
                    });
                  }}
                  className={`py-2 px-2 rounded-sm text-left transition-all border cursor-pointer flex flex-col items-center justify-center text-center ${
                    (current.graphicsMode || 'standard') === g.id
                      ? 'bg-[#1B2214] border-[#A3E635] text-[#A3E635]'
                      : 'bg-[#0C0E12] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase font-mono">{g.label}</span>
                  <span className="text-[9px] opacity-70 font-mono">{g.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Atmosphere */}
          <div className="flex flex-col gap-2.5 bg-[#12151B] p-4 rounded-sm border border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              <Cloud className="w-3.5 h-3.5 text-[#A3E635]" />
              <span>Atmosphere Preset</span>
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
                  className={`py-2 px-2 rounded-sm text-[10px] font-bold uppercase transition-all border cursor-pointer font-mono text-center ${
                    (current.weatherPreset || 'clear_day') === w.id
                      ? 'bg-[#1B2214] border-[#A3E635] text-[#A3E635]'
                      : 'bg-[#0C0E12] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio */}
          <div className="flex flex-col gap-2.5 bg-[#12151B] p-4 rounded-sm border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                <Volume2 className="w-3.5 h-3.5 text-[#A3E635]" />
                <span>Combat Audio</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundManager.init();
                  soundManager.playGunshot('m4');
                }}
                className="text-[10px] font-mono px-2.5 py-1 bg-[#181E14] border border-[#A3E635]/40 text-[#A3E635] hover:bg-[#232D1B] rounded-sm cursor-pointer transition-colors uppercase font-bold"
              >
                Test Gunshot
              </button>
            </div>
            <div className="flex justify-between text-xs font-medium tabular-nums">
              <span className="text-zinc-300">SFX Volume</span>
              <span className="font-mono text-[#A3E635] font-bold">{Math.round(current.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={current.sfxVolume}
              onChange={e => handleChange('sfxVolume', parseFloat(e.target.value))}
              className="w-full accent-[#A3E635] cursor-pointer h-1.5 bg-zinc-800 rounded-sm"
            />
          </div>
        </div>

        {/* Footer Apply */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-[#A3E635] hover:bg-[#BEF264] text-[#090B0E] font-bold text-xs uppercase tracking-widest rounded-sm cod-chamfer-sm transition-all cursor-pointer font-mono"
        >
          Save & Close [ESC]
        </button>
      </div>
    </div>
  );
};
