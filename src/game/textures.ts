import * as THREE from 'three';
import { ReticleColor, ReticleStyle } from '../types';

// Procedural PBR Texture and Material Generator
// Generates photorealistic high-res textures, normal maps, and roughness maps for weapons, environment, and gear

export class TextureGenerator {
  private static cache: Map<string, THREE.Texture> = new Map();

  // --- ASPHALT / WET CONCRETE ---
  public static createAsphaltTexture(): THREE.Texture {
    const key = 'asphalt_diffuse';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base asphalt gray
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    // Noise grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Cracks & oil stains
    ctx.strokeStyle = '#121417';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Yellow tactical markings
    ctx.fillStyle = '#eab308';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(20, 240, 120, 32);
    ctx.fillRect(360, 240, 120, 32);
    ctx.globalAlpha = 1.0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // --- CORRUGATED SHIPPING CONTAINER ---
  public static createContainerTexture(baseColor: string = '#1e3a8a', numberText: string = 'MIL-OPS 84'): THREE.Texture {
    const key = `container_${baseColor}_${numberText}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base color
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Corrugation vertical ridges
    const ridgeWidth = 32;
    for (let x = 0; x < 512; x += ridgeWidth) {
      const grad = ctx.createLinearGradient(x, 0, x + ridgeWidth, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.4)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.15)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, ridgeWidth, 512);
    }

    // Rust & weathering speckles
    ctx.fillStyle = '#7c2d12';
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 400; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 8 + 2, Math.random() * 12 + 2);
    }
    ctx.globalAlpha = 1.0;

    // Military Stencils & Hazard Stripes
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(numberText, 40, 100);
    ctx.font = 'bold 20px monospace';
    ctx.fillText('MAX GROSS: 30,480 KG', 40, 140);
    ctx.fillText('CAUTION: ARMOR PLATED', 40, 170);

    // Hazard stripe band
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 440, 512, 40);
    ctx.clip();
    for (let i = -100; i < 600; i += 40) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(i, 440, 20, 40);
      ctx.fillStyle = '#111827';
      ctx.fillRect(i + 20, 440, 20, 40);
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // --- METAL GRATING / CATWALK FLOOR ---
  public static createMetalGratingTexture(): THREE.Texture {
    const key = 'metal_grating';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#111827';
    const step = 16;
    for (let x = 0; x < 256; x += step) {
      for (let y = 0; y < 256; y += step) {
        ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // --- CONCRETE WALL TEXTURE ---
  public static createConcreteTexture(): THREE.Texture {
    const key = 'concrete_wall';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 45;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Weathering streaks
    ctx.fillStyle = 'rgba(30, 35, 45, 0.15)';
    for (let x = 0; x < 512; x += 40) {
      ctx.fillRect(x + Math.random() * 20, 0, Math.random() * 15 + 5, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // --- WEAPON CAMO TEXTURES ---
  public static createWeaponCamoTexture(camo: 'standard' | 'damascus' | 'gold' | 'woodland' | 'carbon' | 'obsidian'): THREE.Texture {
    const key = `camo_${camo}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    switch (camo) {
      case 'obsidian': {
        // Deep obsidian glossy black with subtle crystalline prismatic facet reflections
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 40; i++) {
          const x = (i * 37) % 512;
          const y = (i * 53) % 512;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 40, y + 25);
          ctx.lineTo(x + 20, y + 60);
          ctx.closePath();
          ctx.stroke();
        }
        break;
      }
      case 'damascus': {
        // Iridescent wave Damascus steel pattern with blue, purple and silver lines
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 4) {
          const hue = (y * 2) % 360;
          ctx.strokeStyle = `hsla(${hue}, 85%, 65%, 0.4)`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x < 512; x += 20) {
            const dy = Math.sin(x * 0.05 + y * 0.1) * 15 + Math.cos(x * 0.02) * 10;
            ctx.lineTo(x, y + dy);
          }
          ctx.stroke();
        }
        break;
      }
      case 'gold': {
        // Pure Gold with intricate geometric luxury engraving
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(0.3, '#fbbf24');
        grad.addColorStop(0.7, '#d97706');
        grad.addColorStop(1, '#b45309');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        for (let x = 0; x < 512; x += 32) {
          for (let y = 0; y < 512; y += 32) {
            ctx.strokeRect(x + 4, y + 4, 24, 24);
            ctx.beginPath();
            ctx.arc(x + 16, y + 16, 6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        break;
      }
      case 'carbon': {
        // 2x2 Twill Carbon Fiber weave
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, 512, 512);
        const size = 8;
        for (let x = 0; x < 512; x += size * 2) {
          for (let y = 0; y < 512; y += size * 2) {
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(x, y, size, size);
            ctx.fillRect(x + size, y + size, size, size);
            ctx.fillStyle = '#374151';
            ctx.fillRect(x + size, y, size, size);
            ctx.fillRect(x, y + size, size, size);
          }
        }
        break;
      }
      case 'woodland': {
        // Digital tactical woodland camo (greens, tans, blacks)
        ctx.fillStyle = '#365314';
        ctx.fillRect(0, 0, 512, 512);
        const colors = ['#14532d', '#713f12', '#1c1917', '#4d7c0f'];
        for (let i = 0; i < 300; i++) {
          ctx.fillStyle = colors[i % colors.length];
          const px = Math.floor(Math.random() * 32) * 16;
          const py = Math.floor(Math.random() * 32) * 16;
          const pw = (Math.floor(Math.random() * 4) + 1) * 16;
          const ph = (Math.floor(Math.random() * 4) + 1) * 16;
          ctx.fillRect(px, py, pw, ph);
        }
        break;
      }
      case 'standard':
      default: {
        // Matte Tactical Black Cerakote Gunmetal
        ctx.fillStyle = '#1e2024';
        ctx.fillRect(0, 0, 512, 512);
        // Subtle micro-brushing
        ctx.strokeStyle = '#2d3139';
        ctx.lineWidth = 1;
        for (let y = 0; y < 512; y += 3) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(512, y);
          ctx.stroke();
        }
        break;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // --- AAA HIGH-FIDELITY GUNMETAL RECEIVER TEXTURE ---
  public static createGunMetalTexture(weaponType: string = 'm4'): THREE.Texture {
    const key = `gunmetal_receiver_${weaponType}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Anodized Parkerized Steel Base
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#1c1e22');
    grad.addColorStop(0.5, '#23272d');
    grad.addColorStop(1, '#181a1d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Micro-abrasion horizontal brushing
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < 512; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Edge bevel highlights & seam lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 492, 492);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 512);
    ctx.moveTo(384, 0);
    ctx.lineTo(384, 512);
    ctx.stroke();

    // Laser-engraved markings & Caliber stencils
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.font = 'bold 15px monospace';

    if (weaponType === 'm4') {
      ctx.fillText('CAL. 5.56x45mm NATO', 24, 64);
      ctx.fillText('MOD: M4A1 CARBINE', 24, 88);
      ctx.fillText('SER: US-894102-K', 24, 112);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('AUTO', 420, 220);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('SEMI', 420, 250);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('SAFE', 420, 280);
    } else if (weaponType === 'mp5') {
      ctx.fillText('CAL. 9x19mm PARA', 24, 64);
      ctx.fillText('HK LACHMANN SUB', 24, 88);
      ctx.fillText('MADE IN GERMANY', 24, 112);
    } else if (weaponType === 'sniper') {
      ctx.fillText('CAL. .50 BMG (12.7x99mm)', 24, 64);
      ctx.fillText('AX-50 PRECISION CHASSIS', 24, 88);
      ctx.fillText('MAX RANGE: 2200M', 24, 112);
    } else if (weaponType === 'shotgun') {
      ctx.fillText('12 GAUGE 2-3/4" OR 3"', 24, 64);
      ctx.fillText('MODEL 680 BREACHER', 24, 88);
      ctx.fillText('TACTICAL PATROL BARREL', 24, 112);
    } else {
      ctx.fillText('DESERT EAGLE PISTOL', 24, 64);
      ctx.fillText('.50 ACTION EXPRESS', 24, 88);
      ctx.fillText('MAGNUM RESEARCH INC.', 24, 112);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // --- TACTICAL POLYMER STIPPLING TEXTURE (GRIPS / STOCKS / PMAGS) ---
  public static createPolymerStippleTexture(): THREE.Texture {
    const key = 'polymer_stipple';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Matte composite base
    ctx.fillStyle = '#1b1d22';
    ctx.fillRect(0, 0, 256, 256);

    // Stippled dimple noise
    for (let x = 0; x < 256; x += 4) {
      for (let y = 0; y < 256; y += 4) {
        const offset = (Math.random() - 0.5) * 2;
        const brightness = Math.random() * 40;
        ctx.fillStyle = `rgb(${25 + brightness}, ${27 + brightness}, ${32 + brightness})`;
        ctx.beginPath();
        ctx.arc(x + 2 + offset, y + 2 + offset, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    this.cache.set(key, texture);
    return texture;
  }

  // --- STAMPED STEEL MAGAZINE TEXTURE ---
  public static createSteelMagTexture(): THREE.Texture {
    const key = 'steel_mag';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Stamped gunmetal blue-black
    ctx.fillStyle = '#16181b';
    ctx.fillRect(0, 0, 256, 512);

    // Stamped vertical ribs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(32, 20, 12, 472);
    ctx.fillRect(112, 20, 12, 472);
    ctx.fillRect(212, 20, 12, 472);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(44, 20, 8, 472);
    ctx.fillRect(124, 20, 8, 472);
    ctx.fillRect(224, 20, 8, 472);

    // Round witness inspection holes with brass cartridge glimpses
    for (let y = 100; y < 450; y += 60) {
      ctx.fillStyle = '#0a0a0c';
      ctx.beginPath();
      ctx.arc(170, y, 9, 0, Math.PI * 2);
      ctx.fill();

      // Brass bullet reflection inside hole
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(170, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '10px monospace';
      ctx.fillText(`${(y - 40) / 10}`, 130, y + 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // --- RED EXPLOSIVE BARREL TEXTURE ---
  public static createExplosiveBarrelTexture(): THREE.Texture {
    const key = 'explosive_barrel';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 512, 512);

    // Weathering & ribs
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 100, 512, 20);
    ctx.fillRect(0, 240, 512, 20);
    ctx.fillRect(0, 380, 512, 20);

    // Flammable symbol & Warning text
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(256, 160);
    ctx.lineTo(310, 230);
    ctx.lineTo(202, 230);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FLAMMABLE', 256, 310);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('EXPLOSIVE HAZARD', 256, 345);

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // --- HOLOGRAPHIC RED DOT RETICLE ---
  public static createHoloSightTexture(color: string = '#ef4444'): THREE.Texture {
    return this.createReticleTexture(color === '#22c55e' ? 'green' : color === '#f59e0b' ? 'amber' : color === '#06b6d4' ? 'cyan' : 'red', 'mildot_circle');
  }

  public static createReticleTexture(
    color: ReticleColor = 'red',
    style: ReticleStyle = 'dot'
  ): THREE.Texture {
    const key = `reticle_${color}_${style}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 256);

    const cx = 128;
    const cy = 128;

    const colorHex = color === 'green' ? '#22c55e' : color === 'amber' ? '#f59e0b' : color === 'cyan' ? '#06b6d4' : '#ef4444';
    const glowRgba = color === 'green' ? 'rgba(34, 197, 94, ' : color === 'amber' ? 'rgba(245, 158, 11, ' : color === 'cyan' ? 'rgba(6, 182, 212, ' : 'rgba(239, 68, 68, ';

    if (style === 'mildot_circle' || style === 'holo_ring') {
      // 68-MOA Halo with 4 quadrant ticks
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 72, cy); ctx.lineTo(cx - 52, cy);
      ctx.moveTo(cx + 52, cy); ctx.lineTo(cx + 72, cy);
      ctx.moveTo(cx, cy - 72); ctx.lineTo(cx, cy - 52);
      ctx.moveTo(cx, cy + 52); ctx.lineTo(cx, cy + 72);
      ctx.stroke();

      // Center 1-MOA dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'chevron') {
      // Illuminated Tactical Arrowhead Chevron
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx + 12, cy + 10);
      ctx.lineTo(cx + 7, cy + 10);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx - 7, cy + 10);
      ctx.lineTo(cx - 12, cy + 10);
      ctx.closePath();
      ctx.fill();
    } else if (style === 'cross') {
      // Hairline crosshairs with open center
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy); ctx.lineTo(cx - 8, cy);
      ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 50, cy);
      ctx.moveTo(cx, cy - 50); ctx.lineTo(cx, cy - 8);
      ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 50);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 't_post') {
      // German T-Post
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 70, cy); ctx.lineTo(cx - 10, cy);
      ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 70, cy);
      ctx.moveTo(cx, cy + 70); ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Precision 2-MOA dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
      grad.addColorStop(0, glowRgba + '0.9)');
      grad.addColorStop(1, glowRgba + '0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // --- TACTICAL SKY ENVIRONMENT DOME ---
  public static createSkyTexture(): THREE.Texture {
    const key = 'tactical_sky';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dramatic tactical twilight sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0f172a'); // Deep navy night
    grad.addColorStop(0.4, '#1e293b'); // Slate blue
    grad.addColorStop(0.7, '#334155'); // Dusk mist
    grad.addColorStop(0.95, '#ea580c'); // Sunset orange horizon glow
    grad.addColorStop(1, '#7c2d12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Glowing sun / moon flare
    const sunGrad = ctx.createRadialGradient(512, 400, 10, 512, 400, 200);
    sunGrad.addColorStop(0, 'rgba(255, 237, 213, 0.9)');
    sunGrad.addColorStop(0.2, 'rgba(251, 146, 60, 0.6)');
    sunGrad.addColorStop(0.6, 'rgba(234, 88, 12, 0.2)');
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Distant mountain silhouette
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(0, 512);
    for (let x = 0; x <= 1024; x += 32) {
      const my = 460 - Math.sin(x * 0.015) * 40 - Math.cos(x * 0.04) * 20;
      ctx.lineTo(x, my);
    }
    ctx.lineTo(1024, 512);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // --- AAA TACTICAL OPERATOR UNIFORM CAMO (MULTICAM / SHADOW / SPEC-OPS) ---
  public static createOperatorUniformTexture(variant: 'allies_multicam' | 'axis_shadow' | 'spec_ops' | 'desert_tan'): THREE.Texture {
    const key = `operator_uniform_${variant}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base tone
    let baseColor = '#1e293b';
    let palette = ['#334155', '#475569', '#0f172a', '#1e293b'];

    if (variant === 'allies_multicam') {
      baseColor = '#3b4233'; // Olive drab / Multicam base
      palette = ['#282c20', '#4a4f3b', '#5c634c', '#6d5a43', '#1e2017'];
    } else if (variant === 'axis_shadow') {
      baseColor = '#18181b'; // Charcoal Black Shadow Corp
      palette = ['#27272a', '#3f3f46', '#09090b', '#18181b', '#52525b'];
    } else if (variant === 'spec_ops') {
      baseColor = '#0f172a'; // Deep Navy Spec Ops
      palette = ['#1e293b', '#334155', '#020617', '#1e1b4b', '#0369a1'];
    } else if (variant === 'desert_tan') {
      baseColor = '#785938'; // Coyote / Desert Tan
      palette = ['#92704c', '#573d23', '#a88968', '#44301c', '#c2a688'];
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Procedural Organic Camouflage Blobs & Fractal Noise
    for (let i = 0; i < 450; i++) {
      ctx.fillStyle = palette[i % palette.length];
      const cx = Math.random() * 512;
      const cy = Math.random() * 512;
      const rx = Math.random() * 32 + 10;
      const ry = Math.random() * 24 + 8;
      const rot = Math.random() * Math.PI;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }

    // Micro Ripstop Fabric Grid & Stitching weave
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    const gridStep = 8;
    for (let x = 0; x < 512; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // High frequency thread noise grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // --- BALLISTIC CORDURA PLATE CARRIER & MOLLE WEBBING TEXTURE ---
  public static createPlateCarrierTexture(variant: 'black' | 'tan' | 'multicam' = 'black'): THREE.Texture {
    const key = `plate_carrier_${variant}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const baseColor = variant === 'tan' ? '#573d23' : variant === 'multicam' ? '#2e3324' : '#141416';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Ballistic Weave 1000D Cordura Texture
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 30;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // MOLLE / PALS Webbing Strips with Bartack Heavy-Duty Stitching
    const stripHeight = 32;
    const spacing = 48;
    for (let y = 30; y < 480; y += spacing) {
      // Dark webbing strap
      ctx.fillStyle = variant === 'tan' ? '#3d2b19' : 'rgba(10, 10, 12, 0.9)';
      ctx.fillRect(20, y, 472, stripHeight);

      // Strap edge highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(20, y, 472, 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(20, y + stripHeight - 2, 472, 2);

      // Vertical Bartack Stitches every 38px
      for (let x = 40; x < 490; x += 38) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(x, y - 2, 4, stripHeight + 4);
        ctx.fillStyle = '#f59e0b'; // Amber thread
        ctx.fillRect(x + 1, y, 2, stripHeight);
      }
    }

    // Top Velcro Loop Panel for Morale Patches
    ctx.fillStyle = 'rgba(30, 30, 35, 0.95)';
    ctx.fillRect(100, 15, 312, 60);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 15, 312, 60);

    // Task Force / Infrared Flag Patch Stencil
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('TF-141 [IR-IFF]', 120, 52);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // --- TACTICAL COMBAT GLOVES TEXTURE (MECHANIX / OAKLEY STYLE) ---
  public static createTacticalGloveTexture(): THREE.Texture {
    const key = 'tactical_gloves_pbr';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Carbon / Deep charcoal base
    ctx.fillStyle = '#1e2024';
    ctx.fillRect(0, 0, 512, 512);

    // Breathable TrekDry Mesh Pattern
    ctx.strokeStyle = 'rgba(45, 50, 60, 0.8)';
    ctx.lineWidth = 2;
    for (let x = 0; x < 512; x += 12) {
      for (let y = 0; y < 512; y += 12) {
        ctx.strokeRect(x, y, 10, 10);
      }
    }

    // Synthetic Leather Palm Reinforcement & Micro-Grip Friction Ribs
    ctx.fillStyle = '#111215';
    ctx.fillRect(50, 200, 412, 280);

    // Rubber Grip Tread Texturing
    ctx.fillStyle = '#292524';
    for (let y = 220; y < 460; y += 20) {
      for (let x = 70; x < 440; x += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Molded TPR Knuckle Armor Plate & Logo
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(80, 50, 352, 100);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(84, 54, 344, 92);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('TACTICAL-OPS // TPR', 110, 108);

    // Double Stitching Lines
    ctx.strokeStyle = '#d97706'; // Kevlar yellow thread
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(70, 40, 372, 120);
    ctx.strokeRect(40, 190, 432, 300);
    ctx.setLineDash([]);

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // --- FIRST-PERSON OPERATOR SMARTWATCH DISPLAY ---
  public static createSmartWatchTexture(timeStr: string = '10:42:15', bpm: number = 118): THREE.Texture {
    const key = `smartwatch_${timeStr}_${bpm}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // OLED Dark Screen
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, 256, 256);

    // Outer Circular Glow & Bezel Ring
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 128, 118, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle HUD Scanline
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 256, 2);
    }

    // Tactical Compass Direction Ring
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', 128, 30);
    ctx.fillText('E', 230, 134);
    ctx.fillText('S', 128, 240);
    ctx.fillText('W', 26, 134);

    // Heartbeat Pulse Rate
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`♥ ${bpm} BPM`, 128, 75);

    // Digital Tactical Clock
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(timeStr, 128, 125);

    // GPS & Network Status
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('SAT-SYNC [TF-141]', 128, 160);
    ctx.fillText('GRID: 43.19° N, 12.04° E', 128, 182);

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // --- BALLISTIC TRAINING DUMMY & MANNEQUIN TARGET TEXTURE ---
  public static createTrainingDummyTexture(): THREE.Texture {
    const key = 'training_dummy_pbr';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Ballistic polymer dummy tan/slate color
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 512, 512);

    // High contrast target scoring concentric circles
    const cx = 256;
    const cy = 256;

    // Rings from 10 to 5
    const rings = [
      { r: 210, score: '5', stroke: '#64748b', fill: 'rgba(30, 41, 59, 0.6)' },
      { r: 160, score: '7', stroke: '#94a3b8', fill: 'rgba(51, 65, 85, 0.7)' },
      { r: 110, score: '9', stroke: '#cbd5e1', fill: 'rgba(71, 85, 105, 0.8)' },
      { r: 60, score: '10', stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.85)' },
      { r: 25, score: 'X', stroke: '#ffffff', fill: '#ffffff' },
    ];

    rings.forEach(ring => {
      ctx.fillStyle = ring.fill;
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ring.stroke;
      ctx.lineWidth = 3;
      ctx.stroke();

      if (ring.score !== 'X') {
        ctx.fillStyle = ring.stroke;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ring.score, cx, cy - ring.r + 24);
        ctx.fillText(ring.score, cx, cy + ring.r - 10);
      }
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 220, cy);
    ctx.lineTo(cx + 220, cy);
    ctx.moveTo(cx, cy - 220);
    ctx.lineTo(cx, cy + 220);
    ctx.stroke();

    // Tactical Target Stencil
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TARGET ID: T-800 BALLISTIC DUMMY', 30, 40);
    ctx.fillText('ZONE: TACTICAL VITALS / THORAX', 30, 65);

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // --- SUPER EXTREME: HIGH-FREQUENCY MICRO-DETAIL TANGENT NORMAL MAP ---
  // Generates tactile micro-surface perturbations (machining grain, aggregate concrete, metallic scratches)
  public static createMicroDetailNormalMap(): THREE.Texture {
    const key = 'micro_detail_normal_map';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Height field synthesis
    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        // Fine grain noise
        const grain = (Math.random() - 0.5) * 0.45;
        // Brushed mechanical striations
        const striation = Math.sin(x * 1.2 + Math.cos(y * 0.6) * 3.5) * 0.22;
        // Periodic subtle pockmarks / concrete pores
        const pore = ((x * 13) ^ (y * 17)) % 97 < 3 ? -0.4 : 0;
        heights[idx] = grain + striation + pore;
      }
    }

    // Sobel / Central difference tangent normal computation
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    const scale = 2.8;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const left = heights[y * size + ((x - 1 + size) % size)];
        const right = heights[y * size + ((x + 1) % size)];
        const up = heights[((y - 1 + size) % size) * size + x];
        const down = heights[((y + 1) % size) * size + x];

        const dx = (right - left) * scale;
        const dy = (down - up) * scale;
        const dz = 1.0;
        const len = Math.hypot(dx, dy, dz);

        const nx = -dx / len;
        const ny = -dy / len;
        const nz = dz / len;

        const pIdx = (y * size + x) * 4;
        d[pIdx] = Math.round((nx * 0.5 + 0.5) * 255);
        d[pIdx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        d[pIdx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        d[pIdx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(24, 24);
    this.cache.set(key, texture);
    return texture;
  }

  // --- SUPER EXTREME: RAY-TRACED HDR 360° EQUIRECTANGULAR ENVIRONMENT MAP ---
  // Provides photorealistic ray-traced reflections on metal weapons, scopes, wet ground, and vehicles
  public static createHDREquirectangularTexture(
    timeOfDay: 'day' | 'noon' | 'sunset' | 'night' = 'noon',
    sunColorHex: number = 0xffedd5,
    skyColorHex: number = 0x38bdf8,
    sunPos: [number, number, number] = [20, 75, -20]
  ): THREE.Texture {
    const key = `hdr_env_${timeOfDay}_${sunColorHex.toString(16)}_${skyColorHex.toString(16)}_${sunPos.join('_')}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const w = 1024;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const horizonY = h * 0.52;

    // 1. SKY DOME GRADIENT (Zenith to Horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    if (timeOfDay === 'sunset') {
      skyGrad.addColorStop(0.0, '#1e1b4b'); // Deep indigo zenith
      skyGrad.addColorStop(0.4, '#831843'); // Crimson magenta upper
      skyGrad.addColorStop(0.7, '#c2410c'); // Radiant amber
      skyGrad.addColorStop(0.95, '#fbbf24'); // Golden horizon band
      skyGrad.addColorStop(1.0, '#fed7aa'); // Bright horizon glow
    } else if (timeOfDay === 'night') {
      skyGrad.addColorStop(0.0, '#020617'); // Pitch zenith
      skyGrad.addColorStop(0.5, '#0f172a'); // Midnight navy
      skyGrad.addColorStop(0.85, '#1e293b'); // Cool slate
      skyGrad.addColorStop(1.0, '#334155'); // Distant moonlit horizon
    } else {
      // Day
      skyGrad.addColorStop(0.0, '#0369a1'); // Deep cerulean zenith
      skyGrad.addColorStop(0.45, '#38bdf8'); // Sky blue
      skyGrad.addColorStop(0.85, '#bae6fd'); // Light atmospheric haze
      skyGrad.addColorStop(1.0, '#f1f5f9'); // Radiant white-blue horizon
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY);

    // 2. DIRECTIONAL SUN / MOON BALANCED SPECULAR DISC
    const sunDir = new THREE.Vector3(...sunPos).normalize();
    const azimuth = Math.atan2(sunDir.z, sunDir.x);
    const u = ((azimuth + Math.PI) / (2 * Math.PI) + 1.0) % 1.0;
    const sunX = Math.round(u * w);
    const elevation = Math.asin(Math.max(-0.95, Math.min(0.95, sunDir.y)));
    const v = 0.5 - (elevation / Math.PI);
    const sunY = Math.max(25, Math.min(h * 0.48, Math.round(v * h)));

    const sunRadius = timeOfDay === 'sunset' ? 24 : timeOfDay === 'night' ? 16 : 22;

    // Smooth, photorealistic solar corona (controlled radius to prevent contrast blowouts)
    const coronaGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunRadius * 2.2);
    if (timeOfDay === 'night') {
      coronaGrad.addColorStop(0.0, 'rgba(224, 242, 254, 0.85)');
      coronaGrad.addColorStop(0.35, 'rgba(186, 230, 253, 0.35)');
      coronaGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else if (timeOfDay === 'sunset') {
      coronaGrad.addColorStop(0.0, 'rgba(255, 247, 237, 0.85)');
      coronaGrad.addColorStop(0.25, 'rgba(254, 215, 170, 0.5)');
      coronaGrad.addColorStop(0.65, 'rgba(249, 115, 22, 0.2)');
      coronaGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else {
      coronaGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
      coronaGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.45)');
      coronaGrad.addColorStop(0.65, 'rgba(186, 230, 253, 0.15)');
      coronaGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Specular core / Moon surface
    if (timeOfDay === 'night') {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius * 0.75, 0, Math.PI * 2);
      ctx.fill();
      // Lunar crater spots
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.beginPath();
      ctx.arc(sunX - sunRadius * 0.25, sunY - sunRadius * 0.2, sunRadius * 0.22, 0, Math.PI * 2);
      ctx.arc(sunX + sunRadius * 0.2, sunY + sunRadius * 0.15, sunRadius * 0.18, 0, Math.PI * 2);
      ctx.arc(sunX - sunRadius * 0.1, sunY + sunRadius * 0.28, sunRadius * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. HORIZON HAZE & SILHOUETTE PROFILE
    const horizonBand = ctx.createLinearGradient(0, horizonY - 18, 0, horizonY + 12);
    horizonBand.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizonBand.addColorStop(0.6, timeOfDay === 'sunset' ? 'rgba(251, 146, 60, 0.4)' : 'rgba(224, 242, 254, 0.35)');
    horizonBand.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = horizonBand;
    ctx.fillRect(0, horizonY - 18, w, 30);

    // Distant tactical terrain silhouette along horizon
    ctx.fillStyle = timeOfDay === 'night' ? '#1e293b' : timeOfDay === 'sunset' ? '#431407' : '#334155';
    ctx.globalAlpha = 0.35;
    for (let x = 0; x < w; x += 18) {
      const bldH = ((x * 37) % 25) + 4;
      ctx.fillRect(x, horizonY - bldH, 15, bldH + 4);
    }
    ctx.globalAlpha = 1.0;

    // 4. TERRAIN / AMBIENT GROUND BOUNCE HALF (Horizon to Nadir)
    // Soft, realistic tones prevent pitch-black shadow cutoffs in PBR materials
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    if (timeOfDay === 'sunset') {
      groundGrad.addColorStop(0.0, '#582a1d'); // Warm sunset soil
      groundGrad.addColorStop(0.4, '#431407');
      groundGrad.addColorStop(1.0, '#2e1208');
    } else if (timeOfDay === 'night') {
      groundGrad.addColorStop(0.0, '#1e293b'); // Cool night ambient
      groundGrad.addColorStop(0.4, '#151d2c');
      groundGrad.addColorStop(1.0, '#0f172a');
    } else {
      groundGrad.addColorStop(0.0, '#525f70'); // Natural soft asphalt / concrete bounce
      groundGrad.addColorStop(0.3, '#434d5b');
      groundGrad.addColorStop(1.0, '#333d48');
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Subtle specular ground glint
    const puddleGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    puddleGrad.addColorStop(0.0, timeOfDay === 'sunset' ? 'rgba(251, 146, 60, 0.25)' : 'rgba(224, 242, 254, 0.2)');
    puddleGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = puddleGrad;
    ctx.fillRect(sunX - 100, horizonY, 200, (h - horizonY) * 0.5);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    this.cache.set(key, texture);
    return texture;
  }
}

