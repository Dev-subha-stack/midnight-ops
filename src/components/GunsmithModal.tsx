import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OpticType, ReticleColor, ReticleStyle, TacticalType, WeaponCamo, WeaponType, OperatorCamo } from '../types';
import { OPTIC_REGISTRY, TACTICAL_EQUIPMENT_REGISTRY, WEAPON_REGISTRY } from '../game/weapons';
import {
  Check,
  X,
  Target,
  Crosshair,
  ZoomIn,
  Palette,
  Radio,
  ShieldAlert,
  User,
  Shield,
  Upload,
  RefreshCw,
  Box,
  CheckCircle,
  AlertCircle,
  Compass,
  Download,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { soundManager } from '../game/audio';
import { CharacterModelLoader } from '../game/character_loader';
import { ModelFactory } from '../game/models';

interface GunsmithModalProps {
  currentWeapon: WeaponType;
  currentCamo: WeaponCamo;
  currentOptic?: OpticType;
  currentReticleColor?: ReticleColor;
  currentReticleStyle?: ReticleStyle;
  currentTactical?: TacticalType;
  currentOperatorCamo?: OperatorCamo;
  onSelectWeapon: (
    weapon: WeaponType,
    camo: WeaponCamo,
    optic?: OpticType,
    reticleColor?: ReticleColor,
    reticleStyle?: ReticleStyle,
    tactical?: TacticalType,
    operatorCamo?: OperatorCamo
  ) => void;
  onSelectTactical?: (tactical: TacticalType) => void;
  onSelectOperatorCamo?: (operatorCamo: OperatorCamo) => void;
  onClose: () => void;
}

export const GunsmithModal: React.FC<GunsmithModalProps> = ({
  currentWeapon,
  currentCamo,
  currentOptic = 'holo_553',
  currentReticleColor = 'red',
  currentReticleStyle = 'holo_ring',
  currentTactical = 'smoke',
  currentOperatorCamo = 'allies_multicam',
  onSelectWeapon,
  onSelectTactical,
  onSelectOperatorCamo,
  onClose,
}) => {
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>(currentWeapon);
  const [selectedCamo, setSelectedCamo] = useState<WeaponCamo>(currentCamo);
  const [selectedOptic, setSelectedOptic] = useState<OpticType>(currentOptic);
  const [selectedReticleColor, setSelectedReticleColor] = useState<ReticleColor>(currentReticleColor);
  const [selectedReticleStyle, setSelectedReticleStyle] = useState<ReticleStyle>(currentReticleStyle);
  const [selectedTactical, setSelectedTactical] = useState<TacticalType>(currentTactical);
  const [selectedOperatorCamo, setSelectedOperatorCamo] = useState<OperatorCamo>(currentOperatorCamo);

  const [activeTab, setActiveTab] = useState<'specs' | 'optics' | 'camo' | 'tactical' | 'operator'>('operator');

  const [customModelUrl, setCustomModelUrl] = useState('');
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelFeedback, setModelFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [activeModelName, setActiveModelName] = useState(CharacterModelLoader.getActiveModelName());
  const [modelRevision, setModelRevision] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const weaponList: WeaponType[] = ['m4', 'ak47', 'scar', 'mp5', 'vector', 'shotgun', 'sniper', 'deagle'];
  const camoList: { id: WeaponCamo; name: string; swatch: string; desc: string }[] = [
    { id: 'standard', name: 'Tactical Cerakote', swatch: 'bg-zinc-800', desc: 'Matte carbon black receiver coating' },
    { id: 'damascus', name: 'Damascus Steel', swatch: 'bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600', desc: 'Tempered layered cobalt finish' },
    { id: 'gold', name: '24K Gold Leaf', swatch: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-600', desc: 'Prestige mastercraft engraving' },
    { id: 'carbon', name: 'Carbon Composite', swatch: 'bg-zinc-900 border border-zinc-600', desc: 'Lightweight twill weave finish' },
    { id: 'woodland', name: 'Digital Woodland', swatch: 'bg-gradient-to-r from-lime-800 via-emerald-900 to-stone-800', desc: 'Special operations field camo' },
  ];

  const operatorCamoList: { id: OperatorCamo; name: string; faction: string; desc: string }[] = [
    {
      id: 'allies_multicam',
      name: 'Task Force MultiCam',
      faction: 'TF-141 NATO',
      desc: 'Crye G3 field pattern, JPC 2.0 plate carrier & IR strobe.',
    },
    {
      id: 'axis_shadow',
      name: 'Shadow Company',
      faction: 'NIGHT OPS',
      desc: 'Charcoal ballistic nylon, matte ceramic plates & crimson ID.',
    },
    {
      id: 'spec_ops',
      name: 'Urban Wolf CQB',
      faction: 'DIRECT ACTION',
      desc: 'Low-vis wolf grey combat uniform & reinforced knuckle gloves.',
    },
    {
      id: 'desert_tan',
      name: 'Arid Coyote Recon',
      faction: 'DESERT OPS',
      desc: 'High-heat khaki rig, dust-sealed goggles & coyote battle belt.',
    },
  ];

  const opticList: OpticType[] = ['iron_sight', 'red_dot_micro', 'holo_553', 'acog_4x', 'sniper_variable', 'thermal_ir'];
  const tacticalList: TacticalType[] = ['flashbang', 'concussion', 'heartbeat_sensor', 'smoke', 'motion_sensor'];

  const reticleColorList: { id: ReticleColor; name: string; hex: string }[] = [
    { id: 'red', name: 'Crimson Red', hex: '#ef4444' },
    { id: 'green', name: 'NVG Lime', hex: '#a3e635' },
    { id: 'amber', name: 'Tactical Amber', hex: '#f59e0b' },
    { id: 'cyan', name: 'Ice Cyan', hex: '#38bdf8' },
  ];

  const reticleStyleList: { id: ReticleStyle; name: string }[] = [
    { id: 'dot', name: '1 MOA Precision Dot' },
    { id: 'holo_ring', name: '68 MOA Holo Ring' },
    { id: 'cross', name: 'Duplex Crosshair' },
    { id: 'chevron', name: 'Tactical Chevron' },
  ];

  const activeCfg = WEAPON_REGISTRY[selectedWeapon];
  const activeOpticCfg = OPTIC_REGISTRY[selectedOptic];
  const activeTacticalCfg = TACTICAL_EQUIPMENT_REGISTRY[selectedTactical];

  useEffect(() => {
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
    onSelectWeapon(
      selectedWeapon,
      selectedCamo,
      selectedOptic,
      selectedReticleColor,
      selectedReticleStyle,
      selectedTactical,
      selectedOperatorCamo
    );
    onSelectTactical?.(selectedTactical);
    onSelectOperatorCamo?.(selectedOperatorCamo);
    onClose();
  };

  const handleLoadCustomModelUrl = async (urlToLoad?: string) => {
    const targetUrl = urlToLoad || customModelUrl;
    if (!targetUrl.trim()) {
      setModelFeedback({ type: 'error', msg: 'Provide a direct .GLB or .GLTF URL to import.' });
      return;
    }

    setIsLoadingModel(true);
    setModelFeedback(null);
    soundManager.playOpticClick();

    try {
      const model = await CharacterModelLoader.loadModel(targetUrl);
      if (model) {
        const name = CharacterModelLoader.getActiveModelName();
        setActiveModelName(name);
        setModelFeedback({
          type: 'success',
          msg: `Loaded "${name}" and normalized rig to 1.80m combat scale.`,
        });
        soundManager.playHaloChantAndParty();
      } else {
        setModelFeedback({
          type: 'error',
          msg: 'Failed to parse 3D GLTF asset. Verify URL is CORS-accessible and ends in .glb or .gltf.',
        });
      }
    } catch (err) {
      setModelFeedback({
        type: 'error',
        msg: `Loading error: ${err instanceof Error ? err.message : 'Network error'}`,
      });
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingModel(true);
    setModelFeedback(null);
    soundManager.playOpticClick();

    try {
      const model = await CharacterModelLoader.loadModel(file);
      if (model) {
        const name = CharacterModelLoader.getActiveModelName();
        setActiveModelName(name);
        setModelFeedback({
          type: 'success',
          msg: `Local 3D asset "${file.name}" mounted to character rig.`,
        });
        soundManager.playHaloChantAndParty();
      } else {
        setModelFeedback({
          type: 'error',
          msg: 'Invalid 3D file. Upload a binary .glb or .gltf character rig.',
        });
      }
    } catch (err) {
      setModelFeedback({
        type: 'error',
        msg: `File error: ${err instanceof Error ? err.message : 'Invalid file'}`,
      });
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleResetToProcedural = () => {
    CharacterModelLoader.removeCustomModel();
    setActiveModelName('Procedural Tier-1 Operator');
    setModelFeedback({
      type: 'success',
      msg: 'Reverted to Procedural Tier-1 Operator rig.',
    });
    soundManager.playOpticClick();
  };

  return (
    <div
      id="gunsmith-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 text-zinc-100 select-none overflow-y-auto"
    >
      <div className="relative w-full max-w-6xl bg-[#0C0F14]/98 border border-white/10 rounded-sm shadow-2xl p-5 sm:p-6 flex flex-col gap-4 my-auto max-h-[94vh] cod-chamfer">
        {/* Top Armory Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#161B22] border border-white/10 flex items-center justify-center text-[#A3E635]">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#A3E635] font-semibold block">
                Weapons Bench · Operator Locker
              </span>
              <h2 className="font-display text-3xl font-extrabold uppercase text-white tracking-wider leading-none mt-0.5">
                Gunsmith Armory
              </h2>
            </div>
          </div>

          {/* Horizontal Tab Strip */}
          <div className="flex items-center gap-1 bg-[#12161C] p-1 rounded-sm border border-white/10 overflow-x-auto">
            {[
              { id: 'operator', label: 'Operator 3D', icon: User },
              { id: 'optics', label: 'Optics', icon: ZoomIn },
              { id: 'camo', label: 'Camo', icon: Palette },
              { id: 'tactical', label: 'Equipment', icon: Radio },
              { id: 'specs', label: 'Ballistics', icon: Target },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#A3E635] text-[#090B0E]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-sm bg-[#151921] border border-white/10 hover:bg-[#1E242E] transition-colors text-zinc-400 hover:text-white cursor-pointer shrink-0"
            title="Close [ESC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main 12-Col Bench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto pr-1">
          {/* Left 4 Cols: Platform Roster */}
          <div className="lg:col-span-4 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px] font-mono uppercase text-zinc-400 pb-1">
              <span>Firearm Platforms</span>
              <span className="text-[#A3E635] tabular-nums">{weaponList.length} AVAILABLE</span>
            </div>
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
                  className={`flex flex-col px-3.5 py-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#192014] border-[#A3E635] text-white'
                      : 'bg-[#12161C] border-white/8 text-zinc-400 hover:bg-[#171C24] hover:text-zinc-100'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-display text-lg font-bold uppercase tracking-wide text-white leading-none">
                      {cfg.name}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-mono font-semibold ${
                        isSelected ? 'text-[#A3E635]' : 'text-zinc-500'
                      }`}
                    >
                      {cfg.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1 font-mono tabular-nums">
                    {cfg.fireRateRpm} RPM · {cfg.magSize} RND MAG · {cfg.damage} DMG
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right 8 Cols: Active Bench */}
          <div className="lg:col-span-8 flex flex-col gap-4 bg-[#11151B] p-4 sm:p-5 rounded-sm border border-white/10">
            {/* Active Firearm Header */}
            <div className="flex flex-wrap justify-between items-baseline border-b border-white/10 pb-2.5 gap-2">
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-2xl font-extrabold uppercase text-white tracking-wider">
                  {activeCfg.name}
                </h3>
                <span className="text-xs font-mono text-[#A3E635] uppercase">
                  {activeCfg.category}
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 uppercase tabular-nums">
                Optic: <b className="text-zinc-200">{activeOpticCfg.name}</b> · Finish:{' '}
                <b className="text-amber-400">{selectedCamo}</b>
              </span>
            </div>

            {/* TAB: OPERATOR & 3D SKETCHFAB RIG */}
            {activeTab === 'operator' && (
              <div className="flex flex-col gap-4">
                <OperatorPreviewCanvas
                  camo={selectedOperatorCamo}
                  weapon={selectedWeapon}
                  activeModelName={activeModelName}
                  modelRevision={modelRevision}
                />

                {/* Uniform / Faction Presets */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                    <span>Operator Camouflage Pattern</span>
                    <span className="text-[#A3E635]">{selectedOperatorCamo.replace('_', ' ')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {operatorCamoList.map(op => {
                      const isSelected = selectedOperatorCamo === op.id;
                      return (
                        <button
                          key={op.id}
                          onClick={() => {
                            setSelectedOperatorCamo(op.id);
                            soundManager.playOpticClick();
                          }}
                          className={`p-3 rounded-sm border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-[#192014] border-[#A3E635] text-white'
                              : 'bg-[#0C0E13] border-white/10 text-zinc-300 hover:border-white/25'
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-bold text-xs text-white flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-[#A3E635]" />
                              {op.name}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase">{op.faction}</span>
                          </div>
                          <span className="text-[11px] text-zinc-400 leading-snug">{op.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sketchfab & Custom GLB Rig Hub */}
                <div className="bg-[#0B0D11] p-4 rounded-sm border border-white/10 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-[#A3E635]" /> Sketchfab 3D Character & GLTF Importer
                      </h4>
                      <span className="text-[11px] text-zinc-400">
                        Equip pre-rigged soldiers or import custom .GLB/.GLTF models for all bots & player proxy.
                      </span>
                    </div>

                    <a
                      href="https://sketchfab.com/search?features=downloadable&q=soldier&type=models"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-sm bg-[#151921] hover:bg-[#1E242E] border border-white/10 text-zinc-200 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <Globe className="w-3.5 h-3.5 text-[#A3E635]" />
                      <span>Browse Sketchfab</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  </div>

                  {modelFeedback && (
                    <div
                      className={`p-2.5 rounded-sm border text-xs flex items-center gap-2 ${
                        modelFeedback.type === 'success'
                          ? 'bg-[#172112] border-[#A3E635]/40 text-lime-200'
                          : 'bg-[#241214] border-red-500/40 text-red-200'
                      }`}
                    >
                      {modelFeedback.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 shrink-0 text-[#A3E635]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      )}
                      <span>{modelFeedback.msg}</span>
                    </div>
                  )}

                  {/* Preset Models */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CharacterModelLoader.PRESET_MODELS.map(preset => {
                      const isCurrentActive =
                        activeModelName === preset.name ||
                        CharacterModelLoader.getActiveCustomModelUrl() === preset.url;
                      return (
                        <div
                          key={preset.id}
                          className={`p-2.5 rounded-sm border flex flex-col justify-between gap-2 transition-all ${
                            isCurrentActive
                              ? 'bg-[#182013] border-[#A3E635] text-white'
                              : 'bg-[#12161C] border-white/10 text-zinc-300'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-bold text-xs text-white block">{preset.name}</span>
                              <span className="text-[10px] text-zinc-400 line-clamp-1">{preset.description}</span>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase shrink-0">
                              {preset.badge}
                            </span>
                          </div>

                          <div className="flex justify-between items-center pt-1.5 border-t border-white/10">
                            <span className="text-[10px] font-mono text-zinc-500">{preset.author}</span>
                            <button
                              onClick={() => {
                                setCustomModelUrl(preset.url);
                                handleLoadCustomModelUrl(preset.url);
                              }}
                              disabled={isLoadingModel || isCurrentActive}
                              className={`px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                                isCurrentActive
                                  ? 'bg-[#A3E635] text-[#090B0E]'
                                  : 'bg-[#1C222B] hover:bg-[#262E3A] text-zinc-200 border border-white/10'
                              }`}
                            >
                              {isCurrentActive ? 'Equipped' : 'Equip Model'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* URL + File Importer */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Paste direct .glb or .gltf model URL..."
                        value={customModelUrl}
                        onChange={e => setCustomModelUrl(e.target.value)}
                        className="flex-1 bg-[#12161C] border border-white/15 rounded-sm px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A3E635] font-mono"
                      />
                      <button
                        onClick={() => handleLoadCustomModelUrl()}
                        disabled={isLoadingModel}
                        className="px-3.5 py-2 bg-[#A3E635] hover:bg-[#BEF264] disabled:opacity-50 text-[#090B0E] text-xs font-bold font-mono rounded-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 uppercase whitespace-nowrap"
                      >
                        {isLoadingModel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        <span>Fetch URL</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoadingModel}
                        className="px-3.5 py-2 bg-[#1A1F27] hover:bg-[#232A35] disabled:opacity-50 text-white text-xs font-bold font-mono rounded-sm border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 uppercase whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload .GLB</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".glb,.gltf"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>

                    {CharacterModelLoader.hasCustomModel() && (
                      <div className="flex items-center justify-end gap-4 text-[11px] font-mono">
                        <button
                          onClick={() => {
                            CharacterModelLoader.flipActiveModel180();
                            setModelRevision(r => r + 1);
                            setModelFeedback({
                              type: 'success',
                              msg: `Rotated "${CharacterModelLoader.getActiveModelName()}" 180° around Y axis.`,
                            });
                            soundManager.playOpticClick();
                          }}
                          className="text-[#A3E635] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Flip Facing 180°
                        </button>
                        <button
                          onClick={handleResetToProcedural}
                          className="text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Reset Procedural
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: OPTICS */}
            {activeTab === 'optics' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                    <span>Sights & Magnified Scopes</span>
                    <span className="text-[#A3E635] tabular-nums">{activeOpticCfg.magnification}x ZOOM</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                          className={`p-3 rounded-sm border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isSelected
                              ? 'border-[#A3E635] bg-[#192014] text-white'
                              : 'border-white/10 bg-[#0C0E13] text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white truncate">{cfg.name}</span>
                            <span className="text-[10px] font-mono text-[#A3E635] tabular-nums">{cfg.magnification}X</span>
                          </div>
                          <span className="text-[11px] text-zinc-400 line-clamp-2 leading-tight">{cfg.description}</span>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/10 tabular-nums">
                            <span>ADS {Math.round(cfg.adsSpeedMultiplier * 100)}%</span>
                            <span>·</span>
                            <span>SWAY {Math.round(cfg.swayMultiplier * 100)}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">Reticle Illumination</span>
                    <div className="grid grid-cols-2 gap-2">
                      {reticleColorList.map(c => {
                        const isSelected = selectedReticleColor === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedReticleColor(c.id);
                              soundManager.playOpticClick();
                            }}
                            className={`p-2 rounded-sm border text-left transition-all flex items-center gap-2 cursor-pointer ${
                              isSelected
                                ? 'border-[#A3E635] bg-[#192014] text-white font-bold'
                                : 'border-white/10 bg-[#0C0E13] text-zinc-400 hover:border-white/25'
                            }`}
                          >
                            <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: c.hex }} />
                            <span className="text-xs">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">Reticle Geometry</span>
                    <div className="grid grid-cols-2 gap-2">
                      {reticleStyleList.map(s => {
                        const isSelected = selectedReticleStyle === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              setSelectedReticleStyle(s.id);
                              soundManager.playOpticClick();
                            }}
                            className={`p-2 rounded-sm border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#A3E635] bg-[#192014] text-white font-bold'
                                : 'border-white/10 bg-[#0C0E13] text-zinc-400 hover:border-white/25'
                            }`}
                          >
                            <span className="text-xs truncate block">{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CAMO */}
            {activeTab === 'camo' && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">Weapon Coating & Camouflage</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {camoList.map(c => {
                    const isSelected = selectedCamo === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCamo(c.id);
                          soundManager.playOpticClick();
                        }}
                        className={`p-3 rounded-sm border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                          isSelected
                            ? 'border-[#A3E635] bg-[#192014] text-white'
                            : 'border-white/10 bg-[#0C0E13] text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-sm ${c.swatch} shrink-0`} />
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-white">{c.name}</span>
                          <span className="text-xs text-zinc-400">{c.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: TACTICAL */}
            {activeTab === 'tactical' && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                  <span>Tactical Equipment</span>
                  <span className="text-[#A3E635]">EQUIPPED: {activeTacticalCfg.name.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {tacticalList.map(tId => {
                    const cfg = TACTICAL_EQUIPMENT_REGISTRY[tId];
                    const isSelected = selectedTactical === tId;
                    return (
                      <button
                        key={tId}
                        onClick={() => {
                          setSelectedTactical(tId);
                          soundManager.playOpticClick();
                        }}
                        className={`p-3 rounded-sm border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          isSelected
                            ? 'border-[#A3E635] bg-[#192014] text-white'
                            : 'border-white/10 bg-[#0C0E13] text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-white">{cfg.name}</span>
                          <span className="text-[10px] font-mono text-[#A3E635] tabular-nums">{cfg.defaultCount}x</span>
                        </div>
                        <span className="text-xs text-zinc-400 leading-snug">{cfg.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="bg-[#0B0D11] p-3 rounded-sm border border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-2 text-zinc-300 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-[#A3E635]" /> Field Keybinds
                  </span>
                  <span>[Q] Deploy Tactical · [X] Cycle Variant</span>
                </div>
              </div>
            )}

            {/* TAB: BALLISTICS */}
            {activeTab === 'specs' && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatBar label="Base Damage" value={activeCfg.damage} max={140} unit="HP" />
                  <StatBar label="Fire Rate" value={activeCfg.fireRateRpm} max={1000} unit="RPM" />
                  <StatBar label="Muzzle Velocity" value={activeCfg.muzzleVelocity} max={1000} unit="m/s" />
                  <StatBar label="Recoil Control" value={Math.max(10, 100 - activeCfg.recoilVertical * 600)} max={100} unit="%" />
                  <StatBar label="Effective Range" value={activeCfg.damageFalloffStart} max={80} unit="m" />
                  <StatBar label="Penetration" value={activeCfg.penetrationPower} max={3} unit="Tier" />
                </div>

                <div className="bg-[#0B0D11] p-3 rounded-sm border border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400 tabular-nums">
                  <span className="text-zinc-200 font-semibold uppercase">Ballistic Profile</span>
                  <span>
                    {activeCfg.recoilPattern.length}-Shot Recoil Cycle ·{' '}
                    {activeCfg.bulletDropRate < 1 ? 'Flat Trajectory' : 'High Arc Gravity'}
                  </span>
                </div>
              </div>
            )}

            {/* Primary Equip CTA */}
            <button
              onClick={handleEquip}
              className="mt-auto w-full py-3.5 bg-[#A3E635] hover:bg-[#BEF264] text-[#090B0E] font-bold text-xs uppercase tracking-[0.18em] rounded-sm cod-chamfer-sm transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Check className="w-4 h-4" /> Equip Loadout & Operator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OperatorPreviewCanvas: React.FC<{
  camo: OperatorCamo;
  weapon: WeaponType;
  activeModelName: string;
  modelRevision: number;
}> = ({ camo, weapon, activeModelName, modelRevision }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);
  const rotationYRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 1.15, 2.7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xf1f5f9, 2.4);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xa3e635, 1.6);
    rimLight.position.set(-2, 2, -2);
    scene.add(rimLight);

    const platformGeo = new THREE.CylinderGeometry(0.65, 0.7, 0.04, 32);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x11151c,
      roughness: 0.35,
      metalness: 0.85,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.02;
    platform.receiveShadow = true;
    scene.add(platform);

    const platformRing = new THREE.Mesh(
      new THREE.RingGeometry(0.63, 0.66, 32),
      new THREE.MeshBasicMaterial({ color: 0xa3e635, side: THREE.DoubleSide })
    );
    platformRing.rotation.x = -Math.PI / 2;
    platformRing.position.y = 0.001;
    scene.add(platformRing);

    const charGroup = new THREE.Group();
    scene.add(charGroup);

    let mixer: THREE.AnimationMixer | null = null;
    const clock = new THREE.Clock();

    const team = camo === 'axis_shadow' ? 'axis' : 'allies';
    const archetype = camo === 'spec_ops' ? 'flanker' : camo === 'desert_tan' ? 'sniper' : 'assault';
    const operatorMesh = ModelFactory.createBotMesh(team, archetype, weapon);
    charGroup.add(operatorMesh);
    if (operatorMesh.userData.animations && operatorMesh.userData.animations.length > 0) {
      mixer = new THREE.AnimationMixer(operatorMesh);
      const clips = operatorMesh.userData.animations as THREE.AnimationClip[];
      const idleClip =
        clips.find((a) => a.name.toLowerCase().includes('idle')) ||
        clips.find((a) => a.name.toLowerCase().includes('tpose')) ||
        clips.find((a) => !/dance|samba/i.test(a.name));
      if (idleClip) {
        mixer.clipAction(idleClip).play();
      }
    }

    let animId: number;
    let autoRotate = true;

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseXRef.current = e.clientX;
      autoRotate = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - prevMouseXRef.current;
      rotationYRef.current += deltaX * 0.015;
      prevMouseXRef.current = e.clientX;
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      setTimeout(() => {
        autoRotate = true;
      }, 1500);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (autoRotate) {
        rotationYRef.current += 0.008;
      }
      charGroup.rotation.y = rotationYRef.current;
      if (mixer) {
        mixer.update(delta);
      }
      ModelFactory.alignHandWeaponSocket(operatorMesh, 0, 0, {
        stance: 'ready',
        weaponType: weapon,
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (mixer) {
        mixer.stopAllAction();
      }
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [camo, weapon, activeModelName, modelRevision]);

  return (
    <div className="relative w-full h-60 rounded-sm bg-gradient-to-b from-[#131720] to-[#0A0C10] border border-white/10 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2.5 left-3 flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
        <Compass className="w-3.5 h-3.5 text-[#A3E635]" />
        <span>DRAG TO ROTATE OPERATOR</span>
      </div>
      <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-zinc-400 uppercase">
        RIG: <b className="text-zinc-200">{activeModelName}</b>
      </div>
    </div>
  );
};

const StatBar: React.FC<{ label: string; value: number; max: number; unit?: string }> = ({ label, value, max, unit = '' }) => {
  const pct = Math.min(100, Math.max(8, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1.5 tabular-nums">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-zinc-400 uppercase">{label}</span>
        <span className="text-white font-bold">
          {Math.round(value)} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-[#090B0E] rounded-xs overflow-hidden border border-white/10">
        <div className="h-full bg-[#A3E635]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
