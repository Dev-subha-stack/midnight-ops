import React, { useRef, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Move,
  RotateCcw,
  Sliders,
  ArrowUpDown,
  X,
} from 'lucide-react';
import {
  clampControlConfig,
  cloneMobileLayout,
  getPresetLayout,
  MobileControlId,
  MobileControlItemConfig,
  MobileControlLayoutConfig,
  MobileHudPresetId,
} from '../game/mobile_layout';

interface MobileHudCustomizerProps {
  initialLayout: MobileControlLayoutConfig;
  onSave: (layout: MobileControlLayoutConfig) => void;
  onCancel: () => void;
}

export const MobileHudCustomizer: React.FC<MobileHudCustomizerProps> = ({
  initialLayout,
  onSave,
  onCancel,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<MobileControlLayoutConfig>(() => cloneMobileLayout(initialLayout));
  const [selectedId, setSelectedId] = useState<MobileControlId>('run');
  const [panelDock, setPanelDock] = useState<'top' | 'bottom'>('top');
  const dragStateRef = useRef<{
    id: MobileControlId;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const selectedCtrl = draft.controls[selectedId];
  const hiddenControls = (Object.values(draft.controls) as MobileControlItemConfig[]).filter(c => !c.visible);

  const updateControl = (id: MobileControlId, patch: Partial<MobileControlItemConfig>) => {
    setDraft(prev => ({
      ...prev,
      preset: 'custom',
      controls: {
        ...prev.controls,
        [id]: clampControlConfig({
          ...prev.controls[id],
          ...patch,
        }),
      },
    }));
  };

  const applyPreset = (preset: Exclude<MobileHudPresetId, 'custom'>) => {
    const next = getPresetLayout(preset);
    setDraft(prev => ({
      ...next,
      lookSensitivity: prev.lookSensitivity,
    }));
  };

  const handleControlPointerDown = (id: MobileControlId, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);

    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const ctrl = draft.controls[id];
    const currentPxX = rect.left + (ctrl.xPct / 100) * rect.width;
    const currentPxY = rect.top + (ctrl.yPct / 100) * rect.height;

    dragStateRef.current = {
      id,
      pointerId: e.pointerId,
      offsetX: e.clientX - currentPxX,
      offsetY: e.clientY - currentPxY,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic capture failures
    }
  };

  const handleControlPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const stage = stageRef.current;
    if (!stage) return;

    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    const targetX = e.clientX - drag.offsetX - rect.left;
    const targetY = e.clientY - drag.offsetY - rect.top;

    const xPct = (targetX / Math.max(1, rect.width)) * 100;
    const yPct = (targetY / Math.max(1, rect.height)) * 100;
    updateControl(drag.id, { xPct, yPct });
  };

  const handleControlPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    dragStateRef.current = null;
  };

  return (
    <div
      id="mobile-hud-customizer"
      ref={stageRef}
      className="fixed inset-0 z-50 bg-[#090B0E]/92 backdrop-blur-md text-zinc-100 select-none touch-none overflow-hidden"
    >
      {/* Tactical Calibration Grid */}
      <div className="absolute inset-0 cod-grid-bg pointer-events-none opacity-65" />

      {/* Left Movement Zone Divider (42% screen width boundary hint for Joystick) */}
      <div className="absolute inset-y-0 left-0 w-[42%] border-r border-dashed border-white/10 pointer-events-none flex items-end p-3">
        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
          Joystick Activation Zone (42%)
        </span>
      </div>

      {/* Non-interactive HUD Reference Ghost Zones (Minimap / Vitals / Ammo) */}
      <div className="absolute top-3 left-3 w-28 h-24 rounded-sm border border-dashed border-white/15 bg-white/[0.02] pointer-events-none flex items-center justify-center">
        <span className="text-[9px] font-mono uppercase text-zinc-500">Minimap</span>
      </div>
      <div className="absolute bottom-3 left-3 w-40 h-11 rounded-sm border border-dashed border-white/15 bg-white/[0.02] pointer-events-none flex items-center justify-center">
        <span className="text-[9px] font-mono uppercase text-zinc-500">HP / Armor</span>
      </div>
      <div className="absolute bottom-3 right-3 w-36 h-11 rounded-sm border border-dashed border-white/15 bg-white/[0.02] pointer-events-none flex items-center justify-center">
        <span className="text-[9px] font-mono uppercase text-zinc-500">Ammo</span>
      </div>

      {/* Interactive Draggable Controls Canvas */}
      {(Object.values(draft.controls) as MobileControlItemConfig[]).map(ctrl => {
        if (!ctrl.visible) return null;
        const isSelected = selectedId === ctrl.id;
        const radiusPx = Math.max(22, Math.round(ctrl.baseRadius * ctrl.scale));
        const isDpad = ctrl.id === 'weapon-dpad';
        const isJoystick = ctrl.id === 'move-joystick';

        return (
          <div
            key={ctrl.id}
            data-control-id={ctrl.id}
            onPointerDown={e => handleControlPointerDown(ctrl.id, e)}
            onPointerMove={handleControlPointerMove}
            onPointerUp={handleControlPointerUp}
            onPointerCancel={handleControlPointerUp}
            style={{
              left: `${ctrl.xPct}%`,
              top: `${ctrl.yPct}%`,
              width: `${radiusPx * 2}px`,
              height: `${isDpad ? Math.round(radiusPx * 1.15) : radiusPx * 2}px`,
              opacity: ctrl.opacity,
              borderColor: isSelected ? '#A3E635' : ctrl.color,
              color: ctrl.color,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center border-2 font-mono font-bold cursor-grab active:cursor-grabbing touch-none transition-shadow ${
              isDpad ? 'rounded-md' : 'rounded-full'
            } ${
              isSelected
                ? 'bg-[#172110]/90 ring-2 ring-[#A3E635]/60 shadow-[0_0_24px_rgba(163,230,53,0.45)] z-30'
                : 'bg-[#0C1016]/75 hover:bg-[#131922]/85 z-20'
            }`}
          >
            {isJoystick && (
              <div
                style={{
                  width: `${Math.round(radiusPx * 0.85)}px`,
                  height: `${Math.round(radiusPx * 0.85)}px`,
                }}
                className="rounded-full bg-[#A3E635]/25 border border-[#A3E635]/70 flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-white">{ctrl.shortLabel}</span>
              </div>
            )}
            {ctrl.id === 'fire' && (
              <div
                style={{
                  width: `${Math.round(radiusPx * 1.48)}px`,
                  height: `${Math.round(radiusPx * 1.48)}px`,
                }}
                className="rounded-full bg-red-600/75 border border-red-200/85 flex flex-col items-center justify-center pointer-events-none"
              >
                <span className="text-[10px] font-bold leading-none text-white">{ctrl.shortLabel}</span>
                <span className="text-[8px] leading-none text-red-100/80 mt-0.5">DRAG</span>
              </div>
            )}
            {!isJoystick && ctrl.id !== 'fire' && (
              <span className="text-[10px] leading-none tracking-wider text-zinc-100 pointer-events-none">
                {ctrl.shortLabel}
              </span>
            )}
            {isSelected && (
              <span className="absolute -bottom-5 px-1.5 py-0.5 bg-[#0A0D12] border border-[#A3E635]/70 text-[9px] text-[#A3E635] rounded-sm whitespace-nowrap pointer-events-none tabular-nums">
                {Math.round(ctrl.scale * 100)}%
              </span>
            )}
          </div>
        );
      })}

      {/* Dockable Inspector Panel (Top or Bottom so user can drag controls underneath cleanly) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-2xl bg-[#0D1015]/95 border border-white/15 rounded-sm shadow-2xl p-3 sm:p-4 flex flex-col gap-3 pointer-events-auto cod-chamfer-sm ${
          panelDock === 'top' ? 'top-2.5' : 'bottom-2.5'
        }`}
      >
        {/* Row 1: Title + Dock Toggle + Primary Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#A3E635]" />
            <div>
              <h2 className="font-display text-lg font-extrabold uppercase tracking-wider text-white leading-none">
                Custom HUD Controls
              </h2>
              <p className="text-[10px] font-mono text-zinc-400">
                Drag any button to reposition · Tap to tune size &amp; opacity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPanelDock(d => (d === 'top' ? 'bottom' : 'top'))}
              title="Move toolbar to top or bottom"
              className="min-h-[38px] px-2.5 rounded-sm bg-[#141821] hover:bg-[#1E2430] border border-white/15 text-[10px] font-mono font-bold text-zinc-200 uppercase flex items-center gap-1 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#A3E635]" />
              <span className="hidden sm:inline">{panelDock === 'top' ? 'Dock Bottom' : 'Dock Top'}</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('2-finger')}
              title="Reset to default 2-finger layout"
              className="min-h-[38px] px-2.5 rounded-sm bg-[#141821] hover:bg-[#1E2430] border border-white/15 text-[10px] font-mono font-bold text-zinc-200 uppercase flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="min-h-[38px] px-2.5 rounded-sm bg-[#141821] hover:bg-[#1E2430] border border-white/15 text-[10px] font-mono font-bold text-zinc-300 uppercase flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>

            <button
              id="btn-save-mobile-hud"
              type="button"
              onClick={() => onSave(draft)}
              className="min-h-[38px] px-3.5 rounded-sm bg-[#A3E635] hover:bg-[#BEF264] text-[#090B0E] text-[10px] font-mono font-extrabold uppercase flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Row 2: Free Fire / BGMI Claw Presets + Look Sensitivity */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          <div className="sm:col-span-7 flex items-center gap-1.5">
            {(
              [
                { id: '2-finger', label: '2-Finger Classic' },
                { id: '3-finger', label: '3-Finger Claw' },
                { id: '4-finger', label: '4-Finger Claw' },
              ] as const
            ).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`flex-1 py-1.5 px-2 rounded-sm border text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                  draft.preset === p.id
                    ? 'bg-[#1B2214] border-[#A3E635] text-[#A3E635]'
                    : 'bg-[#11141B] border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="sm:col-span-5 flex items-center gap-2 bg-[#11141B] border border-white/10 rounded-sm px-2.5 py-1.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase whitespace-nowrap">Look Sens</span>
            <input
              type="range"
              min="0.4"
              max="2.5"
              step="0.05"
              value={draft.lookSensitivity}
              onChange={e =>
                setDraft(prev => ({
                  ...prev,
                  lookSensitivity: parseFloat(e.target.value),
                }))
              }
              className="flex-1 accent-[#A3E635] h-1.5 bg-zinc-800 rounded-sm cursor-pointer"
            />
            <span className="text-[10px] font-mono font-bold text-[#A3E635] tabular-nums w-9 text-right">
              {draft.lookSensitivity.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Row 3: Selected Button Tuning (Size, Opacity, Show/Hide) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-[#11141B] border border-white/10 rounded-sm p-2.5">
          <div className="sm:col-span-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Move className="w-3.5 h-3.5 text-[#A3E635] shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-mono font-bold text-white uppercase truncate">
                  {selectedCtrl.label}
                </div>
                <div className="text-[9px] font-mono text-zinc-400 tabular-nums">
                  X:{selectedCtrl.xPct}% · Y:{selectedCtrl.yPct}%
                </div>
              </div>
            </div>

            {selectedCtrl.canHide && (
              <button
                type="button"
                onClick={() => updateControl(selectedId, { visible: !selectedCtrl.visible })}
                className={`px-2 py-1 rounded-sm border text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer shrink-0 ${
                  selectedCtrl.visible
                    ? 'bg-[#182012] border-[#A3E635]/60 text-[#A3E635]'
                    : 'bg-red-950/50 border-red-500/50 text-red-400'
                }`}
              >
                {selectedCtrl.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{selectedCtrl.visible ? 'Shown' : 'Hidden'}</span>
              </button>
            )}
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase shrink-0">Size</span>
            <input
              type="range"
              min="0.6"
              max="1.5"
              step="0.05"
              value={selectedCtrl.scale}
              onChange={e => updateControl(selectedId, { scale: parseFloat(e.target.value) })}
              className="flex-1 accent-[#A3E635] h-1.5 bg-zinc-800 rounded-sm cursor-pointer"
            />
            <span className="text-[10px] font-mono font-bold text-[#A3E635] tabular-nums w-9 text-right">
              {Math.round(selectedCtrl.scale * 100)}%
            </span>
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase shrink-0">Alpha</span>
            <input
              type="range"
              min="0.25"
              max="1"
              step="0.05"
              value={selectedCtrl.opacity}
              onChange={e => updateControl(selectedId, { opacity: parseFloat(e.target.value) })}
              className="flex-1 accent-[#A3E635] h-1.5 bg-zinc-800 rounded-sm cursor-pointer"
            />
            <span className="text-[10px] font-mono font-bold text-[#A3E635] tabular-nums w-9 text-right">
              {Math.round(selectedCtrl.opacity * 100)}%
            </span>
          </div>
        </div>

        {/* Hidden Controls Quick Restore Strip (only appears if user hid one or more buttons) */}
        {hiddenControls.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[9px] font-mono uppercase text-zinc-400 mr-1">Hidden Buttons (Tap to Restore):</span>
            {hiddenControls.map(hc => (
              <button
                key={hc.id}
                type="button"
                onClick={() => {
                  updateControl(hc.id, { visible: true });
                  setSelectedId(hc.id);
                }}
                className="px-2 py-1 rounded-sm bg-[#151A22] hover:bg-[#1E2631] border border-white/15 text-[10px] font-mono font-bold text-zinc-200 uppercase cursor-pointer"
              >
                + {hc.shortLabel}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
