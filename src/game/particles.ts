import * as THREE from 'three';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  gravity?: number;
  rotation?: number;
  rotSpeed?: number;
}

export interface BulletTracer {
  start: THREE.Vector3;
  end: THREE.Vector3;
  current: THREE.Vector3;
  speed: number;
  progress: number;
  mesh: THREE.Line;
}

export class ParticleSystem {
  public scene: THREE.Scene;
  private particles: Particle[] = [];
  private tracers: BulletTracer[] = [];
  private shellCasings: { mesh: THREE.Mesh; velocity: THREE.Vector3; rotVel: THREE.Vector3; life: number }[] = [];

  private pointsGeo: THREE.BufferGeometry;
  private pointsMat: THREE.PointsMaterial;
  private pointsMesh: THREE.Points;
  private maxParticles: number = 2000;

  private posArray: Float32Array;
  private colorArray: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.posArray = new Float32Array(this.maxParticles * 3);
    this.colorArray = new Float32Array(this.maxParticles * 3);

    this.pointsGeo = new THREE.BufferGeometry();
    this.pointsGeo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
    this.pointsGeo.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 3));

    // Particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,200,100,0.8)');
    grad.addColorStop(1, 'rgba(255,100,50,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const pTex = new THREE.CanvasTexture(canvas);

    this.pointsMat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      map: pTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.pointsGeo, this.pointsMat);
    this.scene.add(this.pointsMesh);
  }

  // --- MUZZLE FLASH FX ---
  public emitMuzzleFlash(pos: THREE.Vector3, dir: THREE.Vector3) {
    // Muzzle sparks
    for (let i = 0; i < 8; i++) {
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      );
      const vel = dir.clone().add(spread).multiplyScalar(Math.random() * 8 + 4);
      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: new THREE.Color(1, 0.8, 0.2),
        size: 0.25,
        alpha: 1.0,
        maxLife: 0.08,
        life: 0.08,
        gravity: 0,
      });
    }

    // Smoke puff
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0)),
        velocity: dir.clone().multiplyScalar(1.2).add(new THREE.Vector3(0, 0.8, 0)),
        color: new THREE.Color(0.6, 0.6, 0.65),
        size: 0.45,
        alpha: 0.5,
        maxLife: 0.4,
        life: 0.4,
        gravity: -0.2,
      });
    }
  }

  // --- BULLET TRACER (CALIBER & VELOCITY SPECIFIC) ---
  public spawnBulletTracer(start: THREE.Vector3, end: THREE.Vector3, weaponType: string = 'm4') {
    let color = 0xfef08a;
    let speed = 200;
    let lineWidth = 2;

    switch (weaponType) {
      case 'sniper':
        color = 0xfbbf24; // Radiant high-energy .50 BMG gold beam
        speed = 340;
        lineWidth = 3;
        break;
      case 'm4':
        color = 0xa3e635; // 5.56 NATO high-visibility luminous green-yellow
        speed = 260;
        lineWidth = 2;
        break;
      case 'mp5':
        color = 0xfef08a; // 9mm bright white-yellow streak
        speed = 180;
        lineWidth = 2;
        break;
      case 'shotgun':
        color = 0xf87171; // 12GA fiery red/orange buckshot streak
        speed = 150;
        lineWidth = 2;
        break;
      case 'deagle':
        color = 0xf97316; // .50 AE intense fiery orange tracer
        speed = 210;
        lineWidth = 3;
        break;
    }

    const geo = new THREE.BufferGeometry().setFromPoints([start, start.clone()]);
    const mat = new THREE.LineBasicMaterial({
      color,
      linewidth: lineWidth,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.tracers.push({
      start: start.clone(),
      end: end.clone(),
      current: start.clone(),
      speed,
      progress: 0,
      mesh: line,
    });
  }

  // --- WALL / OBJECT IMPACT IMPACT PARTICLES (SPARKS & DUST) ---
  public emitImpactSparks(pos: THREE.Vector3, normal: THREE.Vector3) {
    for (let i = 0; i < 14; i++) {
      const reflect = normal.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      )).normalize().multiplyScalar(Math.random() * 9 + 3);

      this.particles.push({
        position: pos.clone(),
        velocity: reflect,
        color: new THREE.Color(1, 0.75, 0.2),
        size: 0.18,
        alpha: 1.0,
        maxLife: 0.25,
        life: 0.25,
        gravity: 9.8,
      });
    }

    // Concrete dust
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        position: pos.clone(),
        velocity: normal.clone().multiplyScalar(1.5).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.5, (Math.random() - 0.5) * 1.5)),
        color: new THREE.Color(0.7, 0.7, 0.7),
        size: 0.5,
        alpha: 0.6,
        maxLife: 0.6,
        life: 0.6,
        gravity: 0.5,
      });
    }
  }

  // --- BLOOD SPLATTER PARTICLES ---
  public emitBloodSplatter(pos: THREE.Vector3, dir: THREE.Vector3, isHeadshot: boolean = false) {
    const count = isHeadshot ? 28 : 14;
    for (let i = 0; i < count; i++) {
      const vel = dir.clone().multiplyScalar(2).add(new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3,
        (Math.random() - 0.5) * 4
      ));

      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: new THREE.Color(0.85, 0.05, 0.05),
        size: isHeadshot ? 0.35 : 0.22,
        alpha: 0.9,
        maxLife: 0.45,
        life: 0.45,
        gravity: 12.0,
      });
    }
  }

  // --- EXPLOSION FIREBALL & SMOKE ---
  public emitExplosion(pos: THREE.Vector3, scale: number = 1.0) {
    // Fiery blast core
    for (let i = 0; i < Math.floor(60 * scale); i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 18 * scale,
        (Math.random() * 14 + 2) * scale,
        (Math.random() - 0.5) * 18 * scale
      );
      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: new THREE.Color(1.0, Math.random() * 0.6 + 0.3, 0.1),
        size: (Math.random() * 0.8 + 0.5) * scale,
        alpha: 1.0,
        maxLife: 0.6,
        life: 0.6,
        gravity: 4.0,
      });
    }

    // Heavy Black & Gray Smoke Cloud
    for (let i = 0; i < Math.floor(30 * scale); i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6 * scale,
        (Math.random() * 8 + 3) * scale,
        (Math.random() - 0.5) * 6 * scale
      );
      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: new THREE.Color(0.18, 0.18, 0.2),
        size: (Math.random() * 1.5 + 1.0) * scale,
        alpha: 0.8,
        maxLife: 1.4,
        life: 1.4,
        gravity: -1.0, // Rising
      });
    }
  }

  // --- VOLUMETRIC TACTICAL SMOKE GRENADE BILLOWING PUFFS ---
  public emitSmokeCloudPuff(pos: THREE.Vector3, radius: number = 3.5, color: THREE.Color = new THREE.Color(0.85, 0.88, 0.9)) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const pPos = pos.clone().add(new THREE.Vector3(
        Math.cos(angle) * dist,
        Math.random() * 2.2 + 0.2,
        Math.sin(angle) * dist
      ));

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        Math.random() * 0.6 + 0.2,
        (Math.random() - 0.5) * 1.2
      );

      this.particles.push({
        position: pPos,
        velocity: vel,
        color: color.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.1),
        size: Math.random() * 2.5 + 2.0,
        alpha: 0.85,
        maxLife: 3.5 + Math.random() * 1.5,
        life: 3.5 + Math.random() * 1.5,
        gravity: -0.05,
      });
    }
  }

  // --- MOTION SENSOR RADAR SONAR RING EMISSION ---
  public emitSensorWave(pos: THREE.Vector3, currentRadius: number) {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const ringPos = pos.clone().add(new THREE.Vector3(
        Math.cos(angle) * currentRadius,
        0.15,
        Math.sin(angle) * currentRadius
      ));

      this.particles.push({
        position: ringPos,
        velocity: new THREE.Vector3(Math.cos(angle) * 2.0, 0.1, Math.sin(angle) * 2.0),
        color: new THREE.Color(0.1, 0.9, 0.7),
        size: 0.22,
        alpha: 0.8,
        maxLife: 0.35,
        life: 0.35,
        gravity: 0,
      });
    }
  }

  // --- TACTICAL KNIFE SLASH EFFECT ---
  public emitKnifeSlashEffect(pos: THREE.Vector3, forward: THREE.Vector3) {
    for (let i = 0; i < 18; i++) {
      const vel = forward.clone().multiplyScalar(4).add(new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3
      ));
      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: new THREE.Color(0.2, 0.85, 1.0),
        size: 0.22,
        alpha: 0.95,
        maxLife: 0.2,
        life: 0.2,
        gravity: 0,
      });
    }
  }

  // --- SUPPLY PICKUP AURA BURST ---
  public emitSupplyPickup(pos: THREE.Vector3, colorHex: number) {
    const col = new THREE.Color(colorHex);
    for (let i = 0; i < 24; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 4
      );
      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: col,
        size: 0.3,
        alpha: 1.0,
        maxLife: 0.5,
        life: 0.5,
        gravity: 2.0,
      });
    }
  }

  // --- AUTHENTIC BRASS & SHOTSHELL CASING EJECTION ---
  public emitShellCasing(pos: THREE.Vector3, rightDir: THREE.Vector3, weaponType: string = 'm4') {
    let mesh: THREE.Mesh;

    if (weaponType === 'shotgun') {
      // 12-Gauge Red Plastic Hull with Brass Head
      const geo = new THREE.CylinderGeometry(0.012, 0.012, 0.065, 10);
      geo.rotateZ(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.1 });
      mesh = new THREE.Mesh(geo, mat);
    } else if (weaponType === 'sniper') {
      // Massive .50 BMG Heavy Casing
      const geo = new THREE.CylinderGeometry(0.015, 0.015, 0.095, 10);
      geo.rotateZ(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.18 });
      mesh = new THREE.Mesh(geo, mat);
    } else if (weaponType === 'mp5') {
      // Compact 9x19mm Parabellum Brass
      const geo = new THREE.CylinderGeometry(0.007, 0.007, 0.024, 8);
      geo.rotateZ(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.22 });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      // 5.56x45mm NATO Bottleneck Brass or .50 AE
      const geo = new THREE.CylinderGeometry(0.008, 0.008, 0.038, 8);
      geo.rotateZ(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.92, roughness: 0.2 });
      mesh = new THREE.Mesh(geo, mat);
    }

    mesh.position.copy(pos);
    this.scene.add(mesh);

    const lateralForce = weaponType === 'sniper' ? 4.2 : weaponType === 'shotgun' ? 3.0 : 2.5;
    const vel = rightDir.clone().multiplyScalar(Math.random() * 1.5 + lateralForce).add(new THREE.Vector3(0, Math.random() * 1.5 + 2.0, 0));
    const rotVel = new THREE.Vector3(Math.random() * 24 - 12, Math.random() * 24 - 12, Math.random() * 24 - 12);

    this.shellCasings.push({ mesh, velocity: vel, rotVel, life: 3.5 });
  }

  // --- FRAME UPDATE ---
  public update(dt: number) {
    // 1. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.gravity) {
        p.velocity.y -= p.gravity * dt;
      }
      p.position.addScaledVector(p.velocity, dt);
    }

    // Update GPU Buffer
    let idx = 0;
    const len = Math.min(this.particles.length, this.maxParticles);
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      const alphaRatio = p.life / p.maxLife;

      this.posArray[idx * 3] = p.position.x;
      this.posArray[idx * 3 + 1] = p.position.y;
      this.posArray[idx * 3 + 2] = p.position.z;

      this.colorArray[idx * 3] = p.color.r * alphaRatio;
      this.colorArray[idx * 3 + 1] = p.color.g * alphaRatio;
      this.colorArray[idx * 3 + 2] = p.color.b * alphaRatio;
      idx++;
    }

    // Zero out unused
    for (let i = idx; i < this.maxParticles; i++) {
      this.posArray[i * 3] = 0;
      this.posArray[i * 3 + 1] = -9999;
      this.posArray[i * 3 + 2] = 0;
    }

    this.pointsGeo.attributes.position.needsUpdate = true;
    this.pointsGeo.attributes.color.needsUpdate = true;

    // 2. Update Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      const distTotal = t.start.distanceTo(t.end);
      t.progress += (t.speed * dt) / Math.max(1, distTotal);

      if (t.progress >= 1) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        (t.mesh.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
        continue;
      }

      const head = t.start.clone().lerp(t.end, Math.min(1, t.progress));
      const tail = t.start.clone().lerp(t.end, Math.max(0, t.progress - 0.2));
      const positions = new Float32Array([tail.x, tail.y, tail.z, head.x, head.y, head.z]);
      t.mesh.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }

    // 3. Update Shell Casings
    for (let i = this.shellCasings.length - 1; i >= 0; i--) {
      const sc = this.shellCasings[i];
      sc.life -= dt;
      if (sc.life <= 0) {
        this.scene.remove(sc.mesh);
        sc.mesh.geometry.dispose();
        (sc.mesh.material as THREE.Material).dispose();
        this.shellCasings.splice(i, 1);
        continue;
      }

      sc.velocity.y -= 9.8 * dt;
      sc.mesh.position.addScaledVector(sc.velocity, dt);
      sc.mesh.rotation.x += sc.rotVel.x * dt;
      sc.mesh.rotation.y += sc.rotVel.y * dt;
      sc.mesh.rotation.z += sc.rotVel.z * dt;

      // Floor bounce
      if (sc.mesh.position.y <= 0.03) {
        sc.mesh.position.y = 0.03;
        sc.velocity.y = -sc.velocity.y * 0.4;
        sc.velocity.x *= 0.6;
        sc.velocity.z *= 0.6;
      }
    }
  }
}
