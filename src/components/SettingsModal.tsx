import React from 'react';
import { GameSettings } from '../types';
import { Settings as SettingsIcon, Volume2, Eye, Shield, X, Sliders } from 'lucide-react';
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

  const handleChange = (key: keyof GameSettings, val: any) => {
    const updated = { ...current, [key]: val };
    setCurrent(updated);
    onUpdateSettings(updated);

    if (key === 'masterVolume' || key === 'sfxVolume') {
      soundManager.setVolumes(updated.masterVolume, updated.sfxVolume);
    }
  };

  return (
    <div id="settings-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6 text-slate-200 select-none">
      <div className="w-full max-w-2xl bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-cyan-400" />
            <div>
              <span className="text-xs uppercase tracking-widest text-cyan-400 font-mono font-bold">Preferences</span>
              <h2 className="text-2xl font-black uppercase text-white">Tactical Settings</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-2">
          {/* Mouse Sensitivity */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-300">Mouse Sensitivity</span>
              <span className="font-mono text-cyan-400">{current.mouseSensitivity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="4.0"
              step="0.1"
              value={current.mouseSensitivity}
              onChange={e => handleChange('mouseSensitivity', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Field of View */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-300">Field of View (FOV)</span>
              <span className="font-mono text-cyan-400">{current.fieldOfView}°</span>
            </div>
            <input
              type="range"
              min="65"
              max="110"
              step="1"
              value={current.fieldOfView}
              onChange={e => handleChange('fieldOfView', parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Bot Difficulty */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-300">Bot Combat Intelligence</span>
            <div className="grid grid-cols-4 gap-2">
              {(['recruit', 'regular', 'hardened', 'veteran'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => handleChange('botDifficulty', diff)}
                  className={`py-2 rounded-lg text-xs font-bold uppercase transition-all border cursor-pointer font-mono ${
                    current.botDifficulty === diff
                      ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Atmosphere & Environmental Preset */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-300">Environment & Atmosphere</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'clear_day', label: 'Clear Day' },
                { id: 'golden_sunset', label: 'Sunset' },
                { id: 'tactical_storm', label: 'Storm (Rain/Lightning)' },
                { id: 'midnight_fog', label: 'Midnight Ops' },
                { id: 'sandstorm', label: 'Sandstorm' },
                { id: 'dynamic_cycle', label: 'Dynamic Cycle' },
              ].map(w => (
                <button
                  key={w.id}
                  onClick={() => handleChange('weatherPreset', w.id)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold uppercase transition-all border cursor-pointer font-mono text-center ${
                    (current.weatherPreset || 'dynamic_cycle') === w.id
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Master Volume */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-300">Master Sound FX Volume</span>
              <span className="font-mono text-cyan-400">{Math.round(current.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={current.sfxVolume}
              onChange={e => handleChange('sfxVolume', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Apply */}
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-cyan-500/25 cursor-pointer font-mono"
        >
          Save & Return to Combat
        </button>
      </div>
    </div>
  );
};
