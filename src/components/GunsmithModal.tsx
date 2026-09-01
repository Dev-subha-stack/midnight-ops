import React from 'react';
import { WeaponCamo, WeaponType } from '../types';
import { WEAPON_REGISTRY } from '../game/weapons';
import { Sparkles, Check, X, ShieldAlert, Target, Crosshair, Wind } from 'lucide-react';
import { soundManager } from '../game/audio';

interface GunsmithModalProps {
  currentWeapon: WeaponType;
  currentCamo: WeaponCamo;
  onSelectWeapon: (weapon: WeaponType, camo: WeaponCamo) => void;
  onClose: () => void;
}

export const GunsmithModal: React.FC<GunsmithModalProps> = ({
  currentWeapon,
  currentCamo,
  onSelectWeapon,
  onClose,
}) => {
  const [selectedWeapon, setSelectedWeapon] = React.useState<WeaponType>(currentWeapon);
  const [selectedCamo, setSelectedCamo] = React.useState<WeaponCamo>(currentCamo);

  const weaponList: WeaponType[] = ['m4', 'mp5', 'sniper', 'shotgun', 'deagle'];
  const camoList: { id: WeaponCamo; name: string; color: string; desc: string }[] = [
    { id: 'standard', name: 'Tactical Cerakote', color: 'bg-zinc-800', desc: 'Military matte black finish' },
    { id: 'damascus', name: 'Damascus Steel', color: 'bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600', desc: 'Iridescent layered tempered steel' },
    { id: 'gold', name: '24K Pure Gold', color: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-600', desc: 'Prestige mastercraft engraving' },
    { id: 'carbon', name: 'Carbon Fiber', color: 'bg-zinc-900 border border-zinc-700', desc: 'Lightweight twill weave composite' },
    { id: 'woodland', name: 'Digital Woodland', color: 'bg-gradient-to-r from-lime-800 via-emerald-900 to-stone-800', desc: 'Special forces camouflage' },
  ];

  const activeCfg = WEAPON_REGISTRY[selectedWeapon];

  const handleEquip = () => {
    soundManager.playReload(selectedWeapon, 'cock');
    onSelectWeapon(selectedWeapon, selectedCamo);
    onClose();
  };

  return (
    <div id="gunsmith-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6 text-slate-200 select-none">
      <div className="relative w-full max-w-5xl bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-mono font-bold">Armory & Loadouts</span>
            <h2 className="text-3xl font-black tracking-tight text-white uppercase">Gunsmith Customizer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body 2-Column */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left: Weapon Selection List */}
          <div className="md:col-span-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Select Firearm</span>
            {weaponList.map(wId => {
              const cfg = WEAPON_REGISTRY[wId];
              const isSelected = selectedWeapon === wId;
              return (
                <button
                  key={wId}
                  onClick={() => {
                    setSelectedWeapon(wId);
                    soundManager.playRadioChirp();
                  }}
                  className={`flex flex-col p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
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

          {/* Right: Weapon Details, Stats & Camo Picker */}
          <div className="md:col-span-8 flex flex-col gap-6 bg-slate-900/40 p-6 rounded-xl border border-slate-800">
            {/* Active Weapon Showcase Header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">{activeCfg.category}</span>
                <h3 className="text-2xl font-black uppercase text-white">{activeCfg.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block font-mono">CALIBER / MAG</span>
                <span className="text-lg font-bold font-mono text-white">{activeCfg.magSize} Rounds</span>
              </div>
            </div>

            {/* Weapon Ballistic Stats Progress Bars */}
            <div className="grid grid-cols-2 gap-4">
              <StatBar label="Base Damage" value={activeCfg.damage} max={140} unit="HP" color="bg-rose-500" />
              <StatBar label="Fire Rate" value={activeCfg.fireRateRpm} max={1000} unit="RPM" color="bg-cyan-400" />
              <StatBar label="Muzzle Velocity" value={activeCfg.muzzleVelocity} max={1000} unit="m/s" color="bg-sky-400" />
              <StatBar label="Recoil Control" value={Math.max(10, 100 - activeCfg.recoilVertical * 600)} max={100} unit="%" color="bg-emerald-400" />
              <StatBar label="Effective Range" value={activeCfg.damageFalloffStart} max={80} unit="m" color="bg-amber-400" />
              <StatBar label="Penetration Power" value={activeCfg.penetrationPower} max={3} unit="Tier" color="bg-purple-400" />
            </div>

            {/* Recoil Curve Pattern Visualizer */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono uppercase text-slate-300 font-bold">Dynamic Recoil Pattern</span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                {activeCfg.recoilPattern.length} Shot Cycle | {activeCfg.bulletDropRate < 1 ? 'Flat Trajectory' : 'High Arc Gravity'}
              </div>
            </div>

            {/* Camo Selector */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
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
                        soundManager.playRadioChirp();
                      }}
                      className={`flex flex-col p-3 rounded-lg border text-left transition-all cursor-pointer ${
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

            {/* Equip Action Button */}
            <button
              onClick={handleEquip}
              className="mt-auto w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Check className="w-5 h-5" /> Equip Weapon & Camo
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
