import * as THREE from 'three';
import { ScorestreakItem } from '../types';
import { soundManager } from './audio';
import { ParticleSystem } from './particles';

export class ScorestreakManager {
  public streaks: ScorestreakItem[] = [
    {
      id: 'uav',
      name: 'UAV Radar Sweep',
      cost: 3,
      ready: false,
      icon: 'radar',
      description: 'Scans the combat zone and pings all enemy positions on radar.',
    },
    {
      id: 'airstrike',
      name: 'Precision Airstrike',
      cost: 5,
      ready: false,
      icon: 'plane',
      description: 'Calls in twin strike jets to carpet-bomb designated target zone.',
    },
    {
      id: 'sentry',
      name: 'Automated Sentry Gun',
      cost: 7,
      ready: false,
      icon: 'shield-alert',
      description: 'Deploys a rapid-fire automated perimeter defense turret.',
    },
    {
      id: 'nuke',
      name: 'Tactical Nuke',
      cost: 25,
      ready: false,
      icon: 'flame',
      description: 'Triggers match-ending atomic blast and immediate victory.',
    },
  ];

  public uavActive: boolean = false;
  public uavTimer: number = 0;
  private uavDuration: number = 25.0; // 25s

  private particles: ParticleSystem;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, particles: ParticleSystem) {
    this.scene = scene;
    this.particles = particles;
  }

  public updateStreakProgress(currentStreak: number) {
    this.streaks.forEach(s => {
      if (currentStreak >= s.cost && !s.ready) {
        s.ready = true;
        soundManager.playVoiceCallout(`${s.name} ready for deployment!`);
      }
    });
  }

  public activateStreak(
    id: 'uav' | 'airstrike' | 'sentry' | 'nuke',
    playerPos: THREE.Vector3,
    targetPos?: THREE.Vector3,
    onAirstrikeHit?: (target: THREE.Vector3) => void
  ): boolean {
    const streak = this.streaks.find(s => s.id === id);
    if (!streak || !streak.ready) return false;

    streak.ready = false;

    switch (id) {
      case 'uav': {
        this.uavActive = true;
        this.uavTimer = this.uavDuration;
        soundManager.playVoiceCallout('Friendly UAV in the air, scanning for targets.');
        break;
      }
      case 'airstrike': {
        soundManager.playVoiceCallout('Precision strike inbound on designated coordinates.');
        const strikePos = targetPos || playerPos.clone().add(new THREE.Vector3(0, 0, -25));
        
        // Spawn airstrike jet sequence
        setTimeout(() => {
          this.executeAirstrikePass(strikePos, onAirstrikeHit);
        }, 1800);
        break;
      }
      case 'sentry': {
        soundManager.playVoiceCallout('Sentry gun deployed and guarding sector.');
        break;
      }
      case 'nuke': {
        soundManager.playVoiceCallout('Tactical Nuke ready, countdown initiated!');
        soundManager.playExplosion();
        break;
      }
    }

    return true;
  }

  private executeAirstrikePass(target: THREE.Vector3, onHit?: (pos: THREE.Vector3) => void) {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const impact = target.clone().add(new THREE.Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12));
        this.particles.emitExplosion(impact);
        soundManager.playExplosion();
        if (onHit) onHit(impact);
      }, i * 350);
    }
  }

  public update(dt: number) {
    if (this.uavActive) {
      this.uavTimer -= dt;
      if (this.uavTimer <= 0) {
        this.uavActive = false;
        soundManager.playVoiceCallout('Friendly UAV is bingo fuel, leaving the airspace.');
      }
    }
  }
}
