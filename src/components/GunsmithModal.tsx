import React, { useState } from 'react';
import { OpticType, ReticleColor, ReticleStyle, TacticalType, WeaponCamo, WeaponType } from '../types';
import { OPTIC_REGISTRY, TACTICAL_EQUIPMENT_REGISTRY, WEAPON_REGISTRY } from '../game/weapons';
import { Sparkles, Check, X, Target, Crosshair, Eye, ZoomIn, Palette, Radio, Sun, Zap, Cloud, Wifi, ShieldAlert } from 'lucide-react';
import { soundManager } from '../game/audio';

interface GunsmithModalProps {
  currentWeapon: WeaponType;
  currentCamo: WeaponCamo;
  currentOptic?: OpticType;
  currentReticleColor?: ReticleColor;
  currentReticleStyle?: ReticleStyle;
  currentTactical?: TacticalType;
  onSelectWeapon: (
    weapon: WeaponType,
    camo: WeaponCamo,
    optic?: OpticType,
    reticleColor?: ReticleColor,
    reticleStyle?: ReticleStyle,
    tactical?: TacticalType
  ) => void;
  onSelectTactical?: (tactical: TacticalType) => void;
  onClose: () => void;
}

export const GunsmithModal: React.FC<GunsmithModalProps> = ({
  currentWeapon,
  currentCamo,
  currentOptic = 'holo_553',
  currentReticleColor = 'red',
  currentReticleStyle = 'holo_ring',
  currentTactical = 'smoke',
  onSelectWeapon,
  onSelectTactical,
  onClose,
}) => {
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>(currentWeapon);
  const [selectedCamo, setSelectedCamo] = useState<WeaponCamo>(currentCamo);
  const [selectedOptic, setSelectedOptic] = useState<OpticType>(currentOptic);
  const [selectedReticleColor, setSelectedReticleColor] = useState<ReticleColor>(currentReticleColor);
  const [selectedReticleStyle, setSelectedReticleStyle] = useState<ReticleStyle>(currentReticleStyle);
  const [selectedTactical, setSelectedTactical] = useState<TacticalType>(currentTactical);
  const [activeTab, setActiveTab] = useState<'specs' | 'optics' | 'camo' | 'tactical'>('optics');

  const weaponList: WeaponType[] = ['m4', 'ak47', 'scar', 'mp5', 'vector', 'shotgun', 'sniper', 'deagle'];
  const camoList: { id: WeaponCamo; name: string; color: string; desc: string }[] = [
    { id: 'standard', name: 'Tactical Cerakote', color: 'bg-zinc-800', desc: 'Military matte black finish' },
    { id: 'damascus', name: 'Damascus Steel', color: 'bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600', desc: 'Iridescent layered tempered steel' },
    { id: 'gold', name: '24K Pure Gold', color: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-600', desc: 'Prestige mastercraft engraving' },
    { id: 'carbon', name: 'Carbon Fiber', color: 'bg-zinc-900 border border-zinc-700', desc: 'Lightweight twill weave composite' },
    { id: 'woodland', name: 'Digital Woodland', color: 'bg-gradient-to-r from-lime-800 via-emerald-900 to-stone-800', desc: 'Special forces camouflage' },
  ];

  const opticList: OpticType[] = ['iron_sight', 'red_dot_micro', 'holo_553', 'acog_4x', 'sniper_variable', 'thermal_ir'];

  const tacticalList: TacticalType[] = ['flashbang', 'concussion', 'heartbeat_sensor', 'smoke', 'motion_sensor'];

  const reticleColorList: { id: ReticleColor; name: string; hex: string }[] = [
    { id: 'red', name: 'Tactical Red', hex: '#ef4444' },
    { id: 'green', name: 'NVG Emerald', hex: '#10b981' },
    { id: 'amber', name: 'Amber Glow', hex: '#f59e0b' },
    { id: 'cyan', name: 'Cyber Cyan', hex: '#06b6d4' },
  ];

  const reticleStyleList: { id: ReticleStyle; name: string; desc: string }[] = [
    { id: 'dot', name: '1 MOA Precision Dot', desc: 'Clean single dot for fast target acquisition' },
    { id: 'holo_ring', name: '68 MOA Holographic Ring', desc: 'CQB halo with center 1 MOA dot' },
    { id: 'cross', name: 'Duplex Crosshair', desc: 'Classic quad-line precision intersection' },
    { id: 'chevron', name: 'Tactical Chevron', desc: 'Top apex for bullet drop compensation' },
    { id: 'mildot_circle', name: 'Mil-Dot Combat Grid', desc: 'Subtensions for ranging and windage' },
    { id: 't_post', name: 'T-Post German Reticle', desc: 'High visibility unobstructed upper field' },
  ];

  const activeCfg = WEAPON_REGISTRY[selectedWeapon];
  const activeOpticCfg = OPTIC_REGISTRY[selectedOptic];
  const activeTacticalCfg = TACTICAL_EQUIPMENT_REGISTRY[selectedTactical];

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleEquip = () => {
    soundManager.playOpticClick();
    soundManager.playReload(selectedWeapon, 'cock');
    onSelectWeapon(selectedWeapon, selectedCamo, selectedOptic, selectedReticleColor, selectedReticleStyle, selectedTactical);
    onSelectTactical?.(selectedTactical);
    onClose();
  };

  return (
    <div id="gunsmith-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 sm:p-6 text-slate-200 select-none overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-mono font-black">AAA TACTICAL ARMORY</span>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">Gunsmith Customizer</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body 2-Column */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: Weapon Selection List */}
          <div className="md:col-span-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
              <span>Select Firearm</span>
              <span className="text-[10px] text-cyan-400">{weaponList.length} PLATFORMS</span>
            </span>
            {weaponList.map(wId => {
              const cfg = WEAPON_REGISTRY[wId];
              const isSelected = selectedWeapon === wId;
              return (
                <button
                  key={wId}
                  onClick={() => {
                    setSelectedWeapon(wId);
                    soundManager.playOpticClick();
                  }}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/50 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-white">{cfg.name}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                      {cfg.category}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 font-mono">{cfg.fireRateRpm} RPM | {cfg.magSize} RND MAG</span>
                </button>
              );
            })}
          </div>

          {/* Right: Customization Hub with Tabs */}
          <div className="md:col-span-8 flex flex-col gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
            {/* Active Weapon Showcase Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-800/80">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">{activeCfg.category}</span>
                <h3 className="text-xl font-black uppercase text-white">{activeCfg.name}</h3>
              </div>
              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('optics')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'optics'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Optics & Reticles
                </button>
                <button
                  onClick={() => setActiveTab('camo')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'camo'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" /> Camo Finish
                </button>
                <button
                  onClick={() => setActiveTab('tactical')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'tactical'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" /> Equipment Loadout
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'specs'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" /> Ballistics
                </button>
              </div>
            </div>

            {/* TAB 1: OPTICS & RETICLES */}
            {activeTab === 'optics' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {/* Optic Attachment Cards Grid */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-400 uppercase font-bold">
                    <span>Tactical Sights & High-Magnification Scopes</span>
                    <span className="text-cyan-400">{activeOpticCfg.magnification}x ZOOM</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {opticList.map(oId => {
                      const cfg = OPTIC_REGISTRY[oId];
                      const isSelected = selectedOptic === oId;
                      return (
                        <button
                          key={oId}
                          onClick={() => {
                            setSelectedOptic(oId);
                            soundManager.playOpticClick();
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_12px_rgba(6,182,212,0.3)] text-white'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate">{cfg.name}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-cyan-400">
                              {cfg.magnification}X
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{cfg.description}</span>
                          <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                            <span>ADS: <b className="text-cyan-300">{Math.round(cfg.adsSpeedMultiplier * 100)}%</b></span>
                            <span>•</span>
                            <span>SWAY: <b className="text-amber-300">{Math.round(cfg.swayMultiplier * 100)}%</b></span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reticle Color & Style Customization (For Reflex & Combat Scopes) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  {/* Reticle Color Picker */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase font-mono text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" /> Reticle Illumination Color
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {reticleColorList.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedReticleColor(c.id);
                            soundManager.playOpticClick();
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 transition-all cursor-pointer ${
                            selectedReticleColor === c.id
                              ? 'border-cyan-400 bg-cyan-950/50 text-white shadow-sm'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: c.hex }} />
                          <span className="text-[11px] font-mono font-bold uppercase">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reticle Pattern Selector */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase font-mono text-slate-300 flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-cyan-400" /> Reticle Geometry Style
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {reticleStyleList.slice(0, 4).map(st => (
                        <button
                          key={st.id}
                          onClick={() => {
                            setSelectedReticleStyle(st.id);
                            soundManager.playOpticClick();
                          }}
                          className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            selectedReticleStyle === st.id
                              ? 'border-cyan-400 bg-cyan-950/50 text-white shadow-sm'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-[11px] font-mono font-bold text-white block truncate">{st.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CAMOS */}
            {activeTab === 'camo' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Weapon Camo Finish
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {camoList.map(c => {
                    const isSelected = selectedCamo === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCamo(c.id);
                          soundManager.playOpticClick();
                        }}
                        className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                            : 'border-slate-800 bg-slate-950/60 hover:bg-slate-950'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-4 h-4 rounded-full ${c.color} shadow-sm`} />
                          <span className="text-xs font-bold text-white">{c.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{c.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: EQUIPMENT LOADOUT */}
            {activeTab === 'tactical' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 uppercase font-bold">
                  <span>Tactical Utility & Reconnaissance Equipment</span>
                  <span className="text-cyan-400 font-bold">[Q] DEPLOY / QUICK USE</span>
                </div>

                {/* Tactical Item Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tacticalList.map(tId => {
                    const cfg = TACTICAL_EQUIPMENT_REGISTRY[tId];
                    const isSelected = selectedTactical === tId;

                    return (
                      <button
                        key={tId}
                        onClick={() => {
                          setSelectedTactical(tId);
                          soundManager.playTacticalSwitch();
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] text-white'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-cyan-400'}`}>
                              {tId === 'flashbang' && <Sun className="w-4 h-4" />}
                              {tId === 'concussion' && <Zap className="w-4 h-4" />}
                              {tId === 'heartbeat_sensor' && <Radio className="w-4 h-4" />}
                              {tId === 'smoke' && <Cloud className="w-4 h-4" />}
                              {tId === 'motion_sensor' && <Wifi className="w-4 h-4" />}
                            </div>
                            <span className="text-xs font-bold text-white uppercase">{cfg.name}</span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400">
                            CAPACITY ×{cfg.defaultCount}
                          </span>
                        </div>

                        <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider">{cfg.category}</span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{cfg.desc}</p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                          <span>Cooldown: {cfg.throwCooldownSec}s</span>
                          {isSelected && (
                            <span className="text-cyan-400 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> EQUIPPED
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Tactical Deployment Guide Card */}
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono uppercase text-slate-300 font-bold">Tactical Deployment Tip</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Press [Q] in combat to deploy | Press [X] to cycle tactical variants on the fly
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: BALLISTICS */}
            {activeTab === 'specs' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-4">
                  <StatBar label="Base Damage" value={activeCfg.damage} max={140} unit="HP" color="bg-rose-500" />
                  <StatBar label="Fire Rate" value={activeCfg.fireRateRpm} max={1000} unit="RPM" color="bg-cyan-400" />
                  <StatBar label="Muzzle Velocity" value={activeCfg.muzzleVelocity} max={1000} unit="m/s" color="bg-sky-400" />
                  <StatBar label="Recoil Control" value={Math.max(10, 100 - activeCfg.recoilVertical * 600)} max={100} unit="%" color="bg-emerald-400" />
                  <StatBar label="Effective Range" value={activeCfg.damageFalloffStart} max={80} unit="m" color="bg-amber-400" />
                  <StatBar label="Penetration Power" value={activeCfg.penetrationPower} max={3} unit="Tier" color="bg-purple-400" />
                </div>

                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono uppercase text-slate-300 font-bold">Dynamic Recoil Pattern</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {activeCfg.recoilPattern.length} Shot Cycle | {activeCfg.bulletDropRate < 1 ? 'Flat Trajectory' : 'High Arc Gravity'}
                  </div>
                </div>
              </div>
            )}

            {/* Equip Action Button */}
            <button
              onClick={handleEquip}
              className="mt-auto w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Check className="w-5 h-5" /> Equip Weapon, Optic, Camo & Tactical Loadout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBar: React.FC<{ label: string; value: number; max: number; unit?: string; color: string }> = ({ label, value, max, unit = '', color }) => {
  const pct = Math.min(100, Math.max(8, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-bold">
          {Math.round(value)} {unit}
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

