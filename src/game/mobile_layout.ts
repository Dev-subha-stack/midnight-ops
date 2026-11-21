export type MobileControlId =
  | 'move-joystick'
  | 'run'
  | 'fire-left'
  | 'fire'
  | 'ads'
  | 'jump'
  | 'crouch'
  | 'reload'
  | 'melee'
  | 'frag'
  | 'tactical'
  | 'weapon-dpad';

export type MobileHudPresetId = '2-finger' | '3-finger' | '4-finger' | 'custom';

export interface MobileControlItemConfig {
  id: MobileControlId;
  label: string;
  shortLabel: string;
  /** Center X position as percentage of viewport width (0..100) */
  xPct: number;
  /** Center Y position as percentage of viewport height (0..100) */
  yPct: number;
  /** Radius multiplier (0.6..1.5) */
  scale: number;
  /** Opacity (0.25..1.0) */
  opacity: number;
  /** Show or hide secondary controls */
  visible: boolean;
  /** Base radius in px before scale */
  baseRadius: number;
  /** Primary controls like Move & Fire cannot be hidden */
  canHide: boolean;
  /** Accent hex color for preview & ring */
  color: string;
}

export interface MobileControlLayoutConfig {
  preset: MobileHudPresetId;
  lookSensitivity: number;
  controls: Record<MobileControlId, MobileControlItemConfig>;
}

const STORAGE_KEY = 'frontline_ops_mobile_controls_v1';

const BASE_CONTROLS: Record<MobileControlId, MobileControlItemConfig> = {
  'move-joystick': {
    id: 'move-joystick',
    label: 'Move Stick',
    shortLabel: 'MOVE',
    xPct: 14,
    yPct: 74,
    scale: 1.0,
    opacity: 0.85,
    visible: true,
    baseRadius: 50,
    canHide: false,
    color: '#A3E635',
  },
  run: {
    id: 'run',
    label: 'Auto Run / Sprint',
    shortLabel: 'RUN',
    xPct: 14,
    yPct: 50,
    scale: 1.0,
    opacity: 0.9,
    visible: true,
    baseRadius: 23,
    canHide: true,
    color: '#38bdf8',
  },
  'fire-left': {
    id: 'fire-left',
    label: 'Left Fire',
    shortLabel: 'L-FIRE',
    xPct: 7,
    yPct: 35,
    scale: 0.95,
    opacity: 0.86,
    visible: true,
    baseRadius: 24,
    canHide: true,
    color: '#ef4444',
  },
  fire: {
    id: 'fire',
    label: 'Primary Fire',
    shortLabel: 'FIRE',
    xPct: 86,
    yPct: 74,
    scale: 1.05,
    opacity: 0.92,
    visible: true,
    baseRadius: 34,
    canHide: false,
    color: '#ef4444',
  },
  ads: {
    id: 'ads',
    label: 'ADS / Scope',
    shortLabel: 'ADS',
    xPct: 91,
    yPct: 50,
    scale: 1.0,
    opacity: 0.88,
    visible: true,
    baseRadius: 26,
    canHide: true,
    color: '#A3E635',
  },
  jump: {
    id: 'jump',
    label: 'Jump / Vault',
    shortLabel: 'JUMP',
    xPct: 74,
    yPct: 81,
    scale: 1.0,
    opacity: 0.86,
    visible: true,
    baseRadius: 24,
    canHide: true,
    color: '#e4e4e7',
  },
  crouch: {
    id: 'crouch',
    label: 'Crouch / Slide',
    shortLabel: 'SLIDE',
    xPct: 74,
    yPct: 63,
    scale: 1.0,
    opacity: 0.86,
    visible: true,
    baseRadius: 24,
    canHide: true,
    color: '#e4e4e7',
  },
  reload: {
    id: 'reload',
    label: 'Reload',
    shortLabel: 'RLD',
    xPct: 80,
    yPct: 45,
    scale: 0.96,
    opacity: 0.86,
    visible: true,
    baseRadius: 23,
    canHide: true,
    color: '#facc15',
  },
  melee: {
    id: 'melee',
    label: 'Knife / Zoom',
    shortLabel: 'KNIFE',
    xPct: 92,
    yPct: 31,
    scale: 0.92,
    opacity: 0.85,
    visible: true,
    baseRadius: 22,
    canHide: true,
    color: '#38bdf8',
  },
  frag: {
    id: 'frag',
    label: 'Frag Grenade',
    shortLabel: 'FRAG',
    xPct: 63,
    yPct: 82,
    scale: 0.95,
    opacity: 0.86,
    visible: true,
    baseRadius: 22,
    canHide: true,
    color: '#fb923c',
  },
  tactical: {
    id: 'tactical',
    label: 'Tactical Gear',
    shortLabel: 'TAC',
    xPct: 63,
    yPct: 65,
    scale: 0.95,
    opacity: 0.86,
    visible: true,
    baseRadius: 22,
    canHide: true,
    color: '#A3E635',
  },
  'weapon-dpad': {
    id: 'weapon-dpad',
    label: 'Weapon Swap D-Pad',
    shortLabel: 'SWAP',
    xPct: 78,
    yPct: 29,
    scale: 0.95,
    opacity: 0.85,
    visible: true,
    baseRadius: 26,
    canHide: true,
    color: '#A3E635',
  },
};

function cloneControls(): Record<MobileControlId, MobileControlItemConfig> {
  const out = {} as Record<MobileControlId, MobileControlItemConfig>;
  (Object.keys(BASE_CONTROLS) as MobileControlId[]).forEach(id => {
    out[id] = { ...BASE_CONTROLS[id] };
  });
  return out;
}

export function clampControlConfig(item: MobileControlItemConfig): MobileControlItemConfig {
  const minX = item.id === 'move-joystick' ? 6 : 4;
  const maxX = item.id === 'move-joystick' ? 37 : 96;
  return {
    ...item,
    xPct: Math.round(Math.max(minX, Math.min(maxX, item.xPct)) * 10) / 10,
    yPct: Math.round(Math.max(10, Math.min(91, item.yPct)) * 10) / 10,
    scale: Math.round(Math.max(0.6, Math.min(1.5, item.scale)) * 100) / 100,
    opacity: Math.round(Math.max(0.25, Math.min(1.0, item.opacity)) * 100) / 100,
    visible: item.canHide ? Boolean(item.visible) : true,
  };
}

export function getPresetLayout(preset: Exclude<MobileHudPresetId, 'custom'>): MobileControlLayoutConfig {
  const controls = cloneControls();

  if (preset === '3-finger') {
    // BGMI / Free Fire 3-finger claw: Left Index shoots at top-left, Run lock sits above joystick
    controls['fire-left'] = { ...controls['fire-left'], xPct: 17, yPct: 24, scale: 1.18, opacity: 0.92, visible: true };
    controls.run = { ...controls.run, xPct: 12, yPct: 50, scale: 1.0, visible: true };
    controls['move-joystick'] = { ...controls['move-joystick'], xPct: 14, yPct: 75, scale: 0.96 };
    controls.ads = { ...controls.ads, xPct: 90, yPct: 48, scale: 1.05 };
    controls.crouch = { ...controls.crouch, xPct: 76, yPct: 60 };
    controls.jump = { ...controls.jump, xPct: 76, yPct: 79 };
  } else if (preset === '4-finger') {
    // 4-finger Pro Claw: Left Index = Fire, Right Index = ADS + Jump, Thumbs = Move/Run + Look/Slide
    controls['fire-left'] = { ...controls['fire-left'], xPct: 17, yPct: 24, scale: 1.2, opacity: 0.92, visible: true };
    controls.ads = { ...controls.ads, xPct: 83, yPct: 24, scale: 1.15, opacity: 0.92, visible: true };
    controls.jump = { ...controls.jump, xPct: 70, yPct: 24, scale: 1.04, opacity: 0.9, visible: true };
    controls['weapon-dpad'] = { ...controls['weapon-dpad'], xPct: 56, yPct: 24, scale: 0.92 };
    controls.melee = { ...controls.melee, xPct: 93, yPct: 38, scale: 0.9 };
    controls.reload = { ...controls.reload, xPct: 90, yPct: 54, scale: 0.96 };
    controls.fire = { ...controls.fire, xPct: 86, yPct: 76, scale: 1.0 };
    controls.crouch = { ...controls.crouch, xPct: 74, yPct: 76, scale: 1.05 };
    controls.tactical = { ...controls.tactical, xPct: 63, yPct: 65, scale: 0.92 };
    controls.frag = { ...controls.frag, xPct: 63, yPct: 82, scale: 0.92 };
    controls.run = { ...controls.run, xPct: 13, yPct: 50, scale: 1.0 };
    controls['move-joystick'] = { ...controls['move-joystick'], xPct: 14, yPct: 75, scale: 0.95 };
  }

  (Object.keys(controls) as MobileControlId[]).forEach(id => {
    controls[id] = clampControlConfig(controls[id]);
  });

  return {
    preset,
    lookSensitivity: 1.0,
    controls,
  };
}

export function cloneMobileLayout(config: MobileControlLayoutConfig): MobileControlLayoutConfig {
  const controls = {} as Record<MobileControlId, MobileControlItemConfig>;
  (Object.keys(BASE_CONTROLS) as MobileControlId[]).forEach(id => {
    const src = config.controls[id] || BASE_CONTROLS[id];
    controls[id] = clampControlConfig({ ...BASE_CONTROLS[id], ...src });
  });
  return {
    preset: config.preset,
    lookSensitivity: Math.max(0.4, Math.min(2.5, config.lookSensitivity || 1.0)),
    controls,
  };
}

export function loadMobileLayout(): MobileControlLayoutConfig {
  const fallback = getPresetLayout('2-finger');
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<MobileControlLayoutConfig>;
    if (!parsed || typeof parsed !== 'object' || !parsed.controls) return fallback;

    const mergedControls = cloneControls();
    (Object.keys(BASE_CONTROLS) as MobileControlId[]).forEach(id => {
      const savedItem = parsed.controls?.[id];
      if (savedItem && typeof savedItem === 'object') {
        mergedControls[id] = clampControlConfig({
          ...BASE_CONTROLS[id],
          ...savedItem,
          id,
        });
      }
    });

    const preset: MobileHudPresetId =
      parsed.preset === '2-finger' ||
      parsed.preset === '3-finger' ||
      parsed.preset === '4-finger' ||
      parsed.preset === 'custom'
        ? parsed.preset
        : 'custom';

    return {
      preset,
      lookSensitivity: Math.max(0.4, Math.min(2.5, Number(parsed.lookSensitivity) || 1.0)),
      controls: mergedControls,
    };
  } catch {
    return fallback;
  }
}

export function saveMobileLayout(config: MobileControlLayoutConfig): MobileControlLayoutConfig {
  const sanitized = cloneMobileLayout(config);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Ignore quota errors
    }
  }
  return sanitized;
}

export function resetMobileLayout(preset: Exclude<MobileHudPresetId, 'custom'> = '2-finger'): MobileControlLayoutConfig {
  return saveMobileLayout(getPresetLayout(preset));
}
