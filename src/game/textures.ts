import * as THREE from 'three';

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
  public static createWeaponCamoTexture(camo: 'standard' | 'damascus' | 'gold' | 'woodland' | 'carbon'): THREE.Texture {
    const key = `camo_${camo}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    switch (camo) {
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
  public static createHoloSightTexture(): THREE.Texture {
    const key = 'holo_reticle';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 256);

    const cx = 128;
    const cy = 128;

    // Glowing outer ring
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.stroke();

    // Cross ticks
    ctx.beginPath();
    ctx.moveTo(cx - 72, cy);
    ctx.lineTo(cx - 56, cy);
    ctx.moveTo(cx + 56, cy);
    ctx.lineTo(cx + 72, cy);
    ctx.moveTo(cx, cy - 72);
    ctx.lineTo(cx, cy - 56);
    ctx.moveTo(cx, cy + 56);
    ctx.lineTo(cx, cy + 72);
    ctx.stroke();

    // Center bright dot
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Glow effect
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
    grad.addColorStop(0, 'rgba(255, 50, 50, 0.9)');
    grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

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
}
