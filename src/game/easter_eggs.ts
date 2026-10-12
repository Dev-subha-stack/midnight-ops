import * as THREE from 'three';
import { soundManager } from './audio';
import { ParticleSystem } from './particles';
import { EnvironmentManager } from './environment';
import { EliminationAccolade } from '../types';

export interface EasterEggShrine {
  id: 'minecraft' | 'cod' | 'temple_run' | 'halo';
  name: string;
  interactPrompt: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  colliderBox: THREE.Box3;
  isTriggered: boolean;
  onTrigger: () => void;
}

export class EasterEggManager {
  private scene: THREE.Scene;
  private particles: ParticleSystem;
  private environment: EnvironmentManager;

  // 30-Shot Sun Easter Egg State
  public sunHitCount: number = 0;
  public readonly MAX_SUN_HITS: number = 30;
  public isSupernovaTriggered: boolean = false;

  // Map Tributes
  public shrines: EasterEggShrine[] = [];
  public discoveredReferences: Set<string> = new Set();

  // Callbacks
  public onAccoladeEvent: (accolade: EliminationAccolade) => void = () => {};
  public onNotification: (text: string, type: 'ammo' | 'armor' | 'stimpack' | 'tactical') => void = () => {};
  public onSpeedBoost: (durationSec: number, multiplier: number) => void = () => {};
  public onSupernovaVictory: () => void = () => {};

  constructor(scene: THREE.Scene, particles: ParticleSystem, environment: EnvironmentManager) {
    this.scene = scene;
    this.particles = particles;
    this.environment = environment;
  }

  // ==========================================
  // 1. THE 30-SHOT SUN BLAST SUPERNOVA EVENT
  // ==========================================

  public recordSunShot(): { count: number; isSupernova: boolean } {
    if (this.isSupernovaTriggered) {
      return { count: this.sunHitCount, isSupernova: true };
    }

    this.sunHitCount++;
    const current = this.sunHitCount;

    // 1. Procedural Audio Escalation
    soundManager.playSolarHit(current);

    // 2. Solar Corona Visual Pulse
    this.environment.pulseSunHit(current);

    // 3. Telemetry & Accolade Warnings as Critical Thresholds Approach
    if (current === 5) {
      this.onNotification('CELESTIAL ANOMALY // SOLAR RADIATION DETECTED', 'tactical');
    } else if (current === 15) {
      this.onNotification('WARNING: SOLAR CORONA INSTABILITY DETECTED [15/30]', 'tactical');
    } else if (current === 20) {
      this.onNotification('WARNING: SOLAR PLASMA UNSTABLE [20/30]', 'tactical');
    } else if (current === 25) {
      this.onNotification('CRITICAL: SOLAR CORE REACHING SINGULARITY [25/30]', 'tactical');
    } else if (current === 28) {
      this.onNotification('SOLAR MELTDOWN IMMINENT [28/30]', 'tactical');
    } else if (current === 29) {
      this.onNotification('CRITICAL LIMIT // 1 SHOT TO SUPERNOVA [29/30]!', 'tactical');
    }

    // 4. THE 30TH SHOT: CATACLYSMIC SUPERNOVA & INSTANT VICTORY
    if (current >= this.MAX_SUN_HITS && !this.isSupernovaTriggered) {
      this.isSupernovaTriggered = true;

      // Audio: Massive cataclysmic supernova rumble & cosmic shockwave
      soundManager.playSupernovaExplosion();

      // Accolade Event
      this.onAccoladeEvent({
        id: 'solar_supernova_event',
        title: 'SUPERNOVA COLLAPSE!',
        subtext: '30-Shot Solar Destroyer',
        points: 5000,
        icon: 'easter_egg',
        timestamp: Date.now(),
      });

      this.onNotification('SOLAR CORE DETONATED! SUPERNOVA BLOWOUT INITIATED!', 'tactical');

      // Trigger 2.5-second skyward shockwave animation then win match
      this.environment.triggerSupernova(() => {
        this.onSupernovaVictory();
      });

      return { count: 30, isSupernova: true };
    }

    return { count: current, isSupernova: false };
  }

  // ==========================================
  // 2. CLASSIC GAME REFERENCES IN MAP AREAS
  // ==========================================

  public buildMapEasterEggs(mapType: 'bermuda' | 'outpost') {
    // Clear any previous shrines
    this.clearShrines();

    if (mapType === 'bermuda') {
      // 1. MINECRAFT DIAMOND ORE - Hidden in Pochinok warehouse nook
      const mcPos = new THREE.Vector3(28, 0.5, 34);
      this.createMinecraftShrine(mcPos);

      // 2. CALL OF DUTY MYSTERY BOX - Hidden in Clocktower perimeter courtyard
      const codPos = new THREE.Vector3(-36, 0.38, -26);
      this.createCoDMysteryBoxShrine(codPos);

      // 3. TEMPLE RUN GOLDEN IDOL - Nestled in ancient coastal boulders / ruins
      const trPos = new THREE.Vector3(-44, 0.45, 32);
      this.createTempleRunIdolShrine(trPos);

      // 4. HALO SPARTAN-117 PLINTH - Perched atop Bimi Sakti base platform
      const haloPos = new THREE.Vector3(12, 0.4, -40);
      this.createHaloSpartanShrine(haloPos);
    } else {
      // Outpost Map Positions
      const mcPos = new THREE.Vector3(-34, 0.5, 24);
      this.createMinecraftShrine(mcPos);

      const codPos = new THREE.Vector3(38, 0.38, -32);
      this.createCoDMysteryBoxShrine(codPos);

      const trPos = new THREE.Vector3(26, 0.45, 36);
      this.createTempleRunIdolShrine(trPos);

      const haloPos = new THREE.Vector3(-28, 0.4, -28);
      this.createHaloSpartanShrine(haloPos);
    }
  }

  // A. MINECRAFT DIAMOND ORE SHRINE
  private createMinecraftShrine(pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Procedural 16x16 pixelated stone + cyan diamond texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Stone background
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 4) {
      for (let y = 0; y < 64; y += 4) {
        const shade = Math.random() > 0.5 ? '#475569' : '#64748b';
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, 4, 4);
      }
    }

    // Glowing cyan diamond ore flecks
    const diamondPixels = [
      [8, 12], [12, 12], [8, 16],
      [36, 8], [40, 8], [40, 12],
      [20, 36], [24, 36], [24, 40],
      [44, 44], [48, 44], [48, 48],
      [16, 24], [28, 20]
    ];
    diamondPixels.forEach(([px, py]) => {
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(px, py, 6, 6);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(px + 2, py + 2, 3, 3);
    });

    const oreTex = new THREE.CanvasTexture(canvas);
    oreTex.magFilter = THREE.NearestFilter; // Authentic pixelated look
    oreTex.minFilter = THREE.NearestFilter;

    const oreGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const oreMat = new THREE.MeshStandardMaterial({
      map: oreTex,
      roughness: 0.85,
      metalness: 0.15,
    });
    const oreMesh = new THREE.Mesh(oreGeo, oreMat);
    oreMesh.castShadow = true;
    oreMesh.receiveShadow = true;
    group.add(oreMesh);

    // Subtle cyan aura pointlight
    const aura = new THREE.PointLight(0x06b6d4, 1.2, 4);
    aura.position.set(0, 0.5, 0);
    group.add(aura);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);

    const shrine: EasterEggShrine = {
      id: 'minecraft',
      name: 'Diamond Ore Block (Minecraft)',
      interactPrompt: 'INSPECT DIAMOND ORE [MINECRAFT]',
      position: pos,
      mesh: group,
      colliderBox: box,
      isTriggered: false,
      onTrigger: () => {
        if (shrine.isTriggered) return;
        shrine.isTriggered = true;
        this.discoveredReferences.add('minecraft');

        // Audio: Block break & iconic XP ding!
        soundManager.playMinecraftBlockBreak();
        setTimeout(() => soundManager.playMinecraftDing(), 160);

        // Spawn 3D tumbling voxel debris cubes
        for (let i = 0; i < 16; i++) {
          const voxelGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
          const voxelMat = new THREE.MeshStandardMaterial({
            color: i % 3 === 0 ? 0x06b6d4 : 0x475569,
            roughness: 0.8,
          });
          const voxelMesh = new THREE.Mesh(voxelGeo, voxelMat);
          voxelMesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.6, (Math.random() - 0.5) * 0.6));
          this.scene.add(voxelMesh);

          this.particles.debrisParticles.push({
            mesh: voxelMesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 8 + 3, (Math.random() - 0.5) * 9),
            rotVel: new THREE.Vector3(Math.random() * 12 - 6, Math.random() * 12 - 6, Math.random() * 12 - 6),
            life: 3.5,
            maxLife: 3.5,
            isCeramic: false,
          });
        }

        // Remove block mesh and leave tiny floating diamond gem
        this.scene.remove(group);

        // Accolade
        this.onAccoladeEvent({
          id: 'minecraft_accolade',
          title: 'ACHIEVEMENT GET!',
          subtext: 'Diamonds! (Minecraft Tribute)',
          points: 500,
          icon: 'easter_egg',
          timestamp: Date.now(),
        });
        this.onNotification('ACHIEVEMENT UNLOCKED: "DIAMONDS!" // +500 PTS', 'ammo');
      },
    };

    this.shrines.push(shrine);
  }

  // B. CALL OF DUTY MYSTERY BOX & TEDDY BEAR SHRINE
  private createCoDMysteryBoxShrine(pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Weathered wooden box
    const boxGeo = new THREE.BoxGeometry(1.8, 0.7, 0.8);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.9,
      metalness: 0.1,
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    group.add(boxMesh);

    // Brass corner braces & locks
    const trimGeo = new THREE.BoxGeometry(1.85, 0.08, 0.85);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.4,
      metalness: 0.85,
    });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.y = 0.28;
    group.add(trimMesh);

    // Glowing question marks billboard on top
    const qCanvas = document.createElement('canvas');
    qCanvas.width = 128;
    qCanvas.height = 64;
    const qCtx = qCanvas.getContext('2d')!;
    qCtx.fillStyle = '#000000';
    qCtx.fillRect(0, 0, 128, 64);
    qCtx.font = 'bold 42px monospace';
    qCtx.fillStyle = '#fbbf24';
    qCtx.textAlign = 'center';
    qCtx.fillText('? ?', 64, 48);

    const qTex = new THREE.CanvasTexture(qCanvas);
    const qGeo = new THREE.PlaneGeometry(1.0, 0.5);
    const qMat = new THREE.MeshBasicMaterial({
      map: qTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const qMesh = new THREE.Mesh(qGeo, qMat);
    qMesh.rotation.x = -Math.PI / 2;
    qMesh.position.y = 0.36;
    group.add(qMesh);

    // Miniature brown Teddy Bear sitting on the box
    const bearGroup = new THREE.Group();
    bearGroup.position.set(0.6, 0.5, 0.1);

    const bearMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const bearBody = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), bearMat);
    const bearHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), bearMat);
    bearHead.position.y = 0.16;

    const bearEarL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), bearMat);
    bearEarL.position.set(-0.08, 0.23, 0);
    const bearEarR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), bearMat);
    bearEarR.position.set(0.08, 0.23, 0);

    bearGroup.add(bearBody, bearHead, bearEarL, bearEarR);
    group.add(bearGroup);

    // Amber aura pointlight
    const aura = new THREE.PointLight(0xf59e0b, 1.4, 5);
    aura.position.set(0, 0.8, 0);
    group.add(aura);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);

    const shrine: EasterEggShrine = {
      id: 'cod',
      name: 'Mystery Box (Call of Duty)',
      interactPrompt: 'OPEN MYSTERY BOX [CALL OF DUTY]',
      position: pos,
      mesh: group,
      colliderBox: box,
      isTriggered: false,
      onTrigger: () => {
        if (shrine.isTriggered) return;
        shrine.isTriggered = true;
        this.discoveredReferences.add('cod');

        // Audio: Mystery box jingle + hitmarker chime + tactical nuke siren!
        soundManager.playMysteryBoxJingle();
        setTimeout(() => soundManager.playNukeSiren(), 1400);

        // Vertical Mystery Light Beam ascending into skybox
        const beamGeo = new THREE.CylinderGeometry(0.18, 0.25, 90, 16);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.copy(pos).add(new THREE.Vector3(0, 45, 0));
        this.scene.add(beam);

        // Disappear beam after 3.5s
        setTimeout(() => {
          this.scene.remove(beam);
          beamGeo.dispose();
          beamMat.dispose();
        }, 3500);

        // Grant full tactical speed surge (10 seconds)
        this.onSpeedBoost(10, 1.35);

        // Accolade
        this.onAccoladeEvent({
          id: 'cod_accolade',
          title: 'TACTICAL NUKE READY!',
          subtext: 'Mystery Box (Call of Duty Tribute)',
          points: 500,
          icon: 'easter_egg',
          timestamp: Date.now(),
        });
        this.onNotification('MYSTERY BOX UNLOCKED: ADRENALINE SURGE + MAX AMMO!', 'stimpack');
      },
    };

    this.shrines.push(shrine);
  }

  // C. TEMPLE RUN GOLDEN IDOL SHRINE
  private createTempleRunIdolShrine(pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Ancient stone pedestal
    const pedGeo = new THREE.CylinderGeometry(0.45, 0.6, 0.8, 8);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.95,
      metalness: 0.05,
    });
    const pedMesh = new THREE.Mesh(pedGeo, pedMat);
    pedMesh.position.y = 0.4;
    pedMesh.castShadow = true;
    pedMesh.receiveShadow = true;
    group.add(pedMesh);

    // Gleaming Golden Demon Idol
    const idolMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.95,
      roughness: 0.18,
    });
    const idolBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.35, 8), idolMat);
    idolBody.position.y = 0.95;

    const idolHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), idolMat);
    idolHead.position.y = 1.2;

    // Glowing ruby demon eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
    eyeL.position.set(-0.07, 1.23, 0.15);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
    eyeR.position.set(0.07, 1.23, 0.15);

    // Golden Crown/Horns
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 6), idolMat);
    crown.position.y = 1.42;

    group.add(idolBody, idolHead, eyeL, eyeR, crown);

    // Warm golden idol radiance
    const aura = new THREE.PointLight(0xfbbf24, 1.8, 6);
    aura.position.set(0, 1.2, 0);
    group.add(aura);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);

    const shrine: EasterEggShrine = {
      id: 'temple_run',
      name: 'Golden Demon Idol (Temple Run)',
      interactPrompt: 'GRAB GOLDEN IDOL [TEMPLE RUN]',
      position: pos,
      mesh: group,
      colliderBox: box,
      isTriggered: false,
      onTrigger: () => {
        if (shrine.isTriggered) return;
        shrine.isTriggered = true;
        this.discoveredReferences.add('temple_run');

        // Audio: Demonic monkey screech and tribal drums
        soundManager.playTempleRunScreech();

        // Spawn burst of spinning gold coin sparkle particles
        for (let i = 0; i < 20; i++) {
          const coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 10);
          const coinMat = new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            metalness: 0.9,
            roughness: 0.2,
          });
          const coinMesh = new THREE.Mesh(coinGeo, coinMat);
          coinMesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.2, (Math.random() - 0.5) * 0.5));
          this.scene.add(coinMesh);

          this.particles.debrisParticles.push({
            mesh: coinMesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 7 + 3, (Math.random() - 0.5) * 8),
            rotVel: new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10),
            life: 3.0,
            maxLife: 3.0,
            isCeramic: false,
          });
        }

        // Grant 12-second sprint adrenaline boost
        this.onSpeedBoost(12, 1.45);

        // Accolade
        this.onAccoladeEvent({
          id: 'temple_run_accolade',
          title: 'IDOL SECURED!',
          subtext: 'Escape the Demon Monkeys! (Temple Run)',
          points: 500,
          icon: 'easter_egg',
          timestamp: Date.now(),
        });
        this.onNotification('GOLDEN IDOL SECURED: ESCAPE THE MONKEYS! // +45% SPRINT SPEED', 'stimpack');
      },
    };

    this.shrines.push(shrine);
  }

  // D. HALO MASTER CHIEF SPARTAN-117 & ENERGY SWORD SHRINE
  private createHaloSpartanShrine(pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Futuristic carbon UNSC plinth
    const plinthGeo = new THREE.BoxGeometry(0.9, 0.85, 0.9);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.8,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.425;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Master Chief Olive Drab Helmet
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x3f6212, // Iconic olive green
      roughness: 0.6,
      metalness: 0.4,
    });
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 0.38), helmetMat);
    helmet.position.set(0, 1.05, 0);

    // Gold Reflective Visor
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.1,
      metalness: 0.95,
    });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.12), visorMat);
    visor.position.set(0, 1.05, 0.16);

    // Dual Glowing Cyan Plasma Energy Sword Blades
    const swordMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const bladeL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.75, 4), swordMat);
    bladeL.position.set(-0.25, 1.25, 0);
    bladeL.rotation.z = -0.35;

    const bladeR = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.75, 4), swordMat);
    bladeR.position.set(0.25, 1.25, 0);
    bladeR.rotation.z = 0.35;

    group.add(helmet, visor, bladeL, bladeR);

    // Cyan plasma aura light
    const aura = new THREE.PointLight(0x38bdf8, 2.0, 6);
    aura.position.set(0, 1.2, 0);
    group.add(aura);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);

    const shrine: EasterEggShrine = {
      id: 'halo',
      name: 'Spartan-117 Reclaimer Plinth (Halo)',
      interactPrompt: 'INSPECT SPARTAN-117 [HALO]',
      position: pos,
      mesh: group,
      colliderBox: box,
      isTriggered: false,
      onTrigger: () => {
        if (shrine.isTriggered) return;
        shrine.isTriggered = true;
        this.discoveredReferences.add('halo');

        // Audio: Halo Gregorian chant + Grunt Birthday Party confetti cheer ("YAAAY!")
        soundManager.playHaloChantAndParty();

        // Spawn colorful multi-hue confetti ribbons in all directions
        const confettiColors = [0x38bdf8, 0xf43f5e, 0x10b981, 0xfbbf24, 0xa855f7];
        for (let i = 0; i < 30; i++) {
          const confGeo = new THREE.PlaneGeometry(0.08, 0.08);
          const confMat = new THREE.MeshBasicMaterial({
            color: confettiColors[i % confettiColors.length],
            side: THREE.DoubleSide,
          });
          const confMesh = new THREE.Mesh(confGeo, confMat);
          confMesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.2, (Math.random() - 0.5) * 0.5));
          this.scene.add(confMesh);

          this.particles.debrisParticles.push({
            mesh: confMesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 9 + 4, (Math.random() - 0.5) * 10),
            rotVel: new THREE.Vector3(Math.random() * 24 - 12, Math.random() * 24 - 12, Math.random() * 24 - 12),
            life: 3.8,
            maxLife: 3.8,
            isCeramic: false,
          });
        }

        // Accolade
        this.onAccoladeEvent({
          id: 'halo_accolade',
          title: 'KILLING SPREE // 117!',
          subtext: 'Combat Evolved (Halo Tribute)',
          points: 500,
          icon: 'easter_egg',
          timestamp: Date.now(),
        });
        this.onNotification('SPARTAN-117 RECLAIMER // COMBAT EVOLVED! +500 PTS', 'armor');
      },
    };

    this.shrines.push(shrine);
  }

  // ==========================================
  // 3. COLLISION & PROXIMITY DETECTION
  // ==========================================

  // Check if a bullet hit an easter egg shrine
  public checkBulletHit(point: THREE.Vector3): boolean {
    for (const shrine of this.shrines) {
      if (!shrine.isTriggered && shrine.colliderBox.containsPoint(point)) {
        shrine.onTrigger();
        return true;
      }
    }
    return false;
  }

  // Check proximity for interaction prompt
  public getNearbyShrine(playerPos: THREE.Vector3, maxDistance: number = 2.8): EasterEggShrine | null {
    for (const shrine of this.shrines) {
      if (!shrine.isTriggered && shrine.position.distanceTo(playerPos) <= maxDistance) {
        return shrine;
      }
    }
    return null;
  }

  public clearShrines() {
    this.shrines.forEach(s => {
      this.scene.remove(s.mesh);
    });
    this.shrines = [];
  }

  public destroy() {
    this.clearShrines();
  }
}
