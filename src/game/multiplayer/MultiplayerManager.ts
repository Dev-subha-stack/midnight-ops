import * as THREE from 'three';
import Peer, { DataConnection } from 'peerjs';
import { GameMode, WeaponCamo, WeaponType, HitmarkerEvent } from '../../types';
import { ParticleSystem } from '../particles';
import { soundManager } from '../audio';
import { WEAPON_REGISTRY } from '../weapons';
import { ModelFactory } from '../models';

export interface RemotePlayerState {
  id: string;
  name: string;
  platform: 'mobile' | 'pc';
  team: 'allies' | 'axis';
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  weapon: WeaponType;
  camo: WeaponCamo;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  kills: number;
  deaths: number;
  isShooting: boolean;
  isAiming: boolean;
  isSprinting: boolean;
  isTacSprinting: boolean;
  isSliding: boolean;
  isDiving: boolean;
  isTacStance: boolean;
  isMantling: boolean;
  isReloading: boolean;
  isDead: boolean;
  ping: number;
}

export interface NetworkPacket {
  type:
    | 'HOST_WELCOME'
    | 'CLIENT_JOIN'
    | 'STATE_UPDATE'
    | 'SHOOT_EVENT'
    | 'DAMAGE_EVENT'
    | 'KILL_EVENT'
    | 'CHAT_MESSAGE'
    | 'PING'
    | 'PONG';
  senderId: string;
  payload: any;
  timestamp: number;
}

export class RemotePlayerMesh {
  public group: THREE.Group;
  public headMesh: THREE.Mesh;
  public torsoMesh: THREE.Mesh;
  public leftArm: THREE.Mesh;
  public rightArm: THREE.Mesh;
  public leftLeg: THREE.Mesh;
  public rightLeg: THREE.Mesh;
  public weaponMesh: THREE.Group | null = null;
  public muzzleFlashLight: THREE.PointLight;
  public nametagSprite: THREE.Sprite;

  public targetPos: THREE.Vector3 = new THREE.Vector3();
  public targetYaw: number = 0;
  public targetPitch: number = 0;
  public currentYaw: number = 0;
  public currentPitch: number = 0;
  public isShooting: boolean = false;
  public weaponType: WeaponType = 'm4';
  public camo: WeaponCamo = 'standard';
  private walkCycle: number = 0;

  constructor(scene: THREE.Scene, id: string, name: string, team: 'allies' | 'axis') {
    this.group = new THREE.Group();
    this.group.name = `remote_player_${id}`;

    const uniformColor = team === 'allies' ? 0x2e3842 : 0x3d352e;
    const vestColor = team === 'allies' ? 0x1a2129 : 0x29211a;

    const uniformMat = new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.8 });
    const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.7, metalness: 0.2 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc49a75, roughness: 0.6 });

    // Torso
    this.torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.35), vestMat);
    this.torsoMesh.position.y = 1.05;
    this.torsoMesh.castShadow = true;
    this.group.add(this.torsoMesh);

    // Head + Helmet
    this.headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skinMat);
    this.headMesh.position.y = 1.62;
    this.headMesh.castShadow = true;

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.34), uniformMat);
    helmet.position.y = 0.1;
    this.headMesh.add(helmet);

    // NVG / Goggles
    const goggles = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.9 })
    );
    goggles.position.set(0, 0.02, -0.16);
    this.headMesh.add(goggles);

    this.group.add(this.headMesh);

    // Arms
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), uniformMat);
    this.leftArm.position.set(-0.36, 1.05, 0);
    this.leftArm.castShadow = true;

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), uniformMat);
    this.rightArm.position.set(0.36, 1.05, 0);
    this.rightArm.castShadow = true;

    this.group.add(this.leftArm, this.rightArm);

    // Legs
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), uniformMat);
    this.leftLeg.position.set(-0.16, 0.38, 0);
    this.leftLeg.castShadow = true;

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), uniformMat);
    this.rightLeg.position.set(0.16, 0.38, 0);
    this.rightLeg.castShadow = true;

    this.group.add(this.leftLeg, this.rightLeg);

    // Muzzle Flash Dynamic Light
    this.muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 10);
    this.muzzleFlashLight.position.set(0.2, 1.2, -0.8);
    this.group.add(this.muzzleFlashLight);

    // Overhead Nametag Sprite
    this.nametagSprite = this.createNametagSprite(name, team);
    this.nametagSprite.position.set(0, 2.15, 0);
    this.group.add(this.nametagSprite);

    this.updateWeaponMesh('m4', 'standard');
    scene.add(this.group);
  }

  private createNametagSprite(name: string, team: 'allies' | 'axis'): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.roundRect(10, 10, 236, 44, 8);
    ctx.fill();

    ctx.strokeStyle = team === 'allies' ? 'rgba(56, 189, 248, 0.8)' : 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = team === 'allies' ? '#38bdf8' : '#f87171';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.4, 0.35, 1);
    return sprite;
  }

  public updateWeaponMesh(weapon: WeaponType, camo: WeaponCamo) {
    if (this.weaponMesh) {
      this.group.remove(this.weaponMesh);
    }
    this.weaponType = weapon;
    this.camo = camo;
    this.weaponMesh = ModelFactory.createWeaponMesh(weapon, camo, 'reflex_dot', 'red', 'dot');
    this.weaponMesh.scale.set(0.7, 0.7, 0.7);
    this.weaponMesh.position.set(0.2, 1.05, -0.35);
    this.weaponMesh.rotation.y = Math.PI;
    this.group.add(this.weaponMesh);
  }

  public update(dt: number, state: RemotePlayerState) {
    // Interpolate position
    this.targetPos.set(state.position.x, state.position.y, state.position.z);
    this.group.position.lerp(this.targetPos, Math.min(1, dt * 18));

    // Interpolate rotation
    this.targetYaw = state.yaw;
    this.targetPitch = state.pitch;
    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, Math.min(1, dt * 20));
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, Math.min(1, dt * 20));

    this.group.rotation.y = this.currentYaw + Math.PI;
    this.headMesh.rotation.x = -this.currentPitch;

    // Weapon sync
    if (this.weaponType !== state.weapon || this.camo !== state.camo) {
      this.updateWeaponMesh(state.weapon, state.camo);
    }

    // Dynamic Animation Walk Cycle
    const speed = Math.hypot(state.velocity.x, state.velocity.z);
    if (speed > 0.4 && !state.isDead) {
      this.walkCycle += dt * (state.isTacSprinting ? 16 : state.isSprinting ? 12 : 8);
      const legSwing = Math.sin(this.walkCycle) * (state.isTacSprinting ? 0.75 : 0.45);
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
      this.leftArm.rotation.x = -legSwing * 0.6;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
    }

    // Muzzle Flash
    if (state.isShooting) {
      this.muzzleFlashLight.intensity = 4.0;
    } else {
      this.muzzleFlashLight.intensity = 0;
    }

    // Death collapse
    if (state.isDead) {
      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, Math.PI / 2, dt * 8);
      this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.2, dt * 8);
    } else {
      this.group.rotation.x = 0;
    }
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.group);
  }
}

export class MultiplayerManager {
  public peer: Peer | null = null;
  public isHost: boolean = false;
  public roomId: string = '';
  public localPlayerId: string = '';
  public localPlayerName: string = 'Operator';
  public platform: 'mobile' | 'pc' = 'pc';
  public isConnected: boolean = false;

  private connections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;
  public remotePlayers: Map<string, RemotePlayerState> = new Map();
  public remotePlayerMeshes: Map<string, RemotePlayerMesh> = new Map();

  public scene: THREE.Scene | null = null;
  public particles: ParticleSystem | null = null;

  public onPlayerJoined?: (player: RemotePlayerState) => void;
  public onPlayerLeft?: (id: string) => void;
  public onMatchSync?: (data: any) => void;
  public onRemoteShoot?: (data: { playerId: string; origin: THREE.Vector3; dir: THREE.Vector3; weapon: WeaponType }) => void;
  public onRemoteDamage?: (damage: number, isHeadshot: boolean, attackerName: string) => void;
  public onChatMessage?: (sender: string, text: string) => void;
  public onStatusChange?: (status: string) => void;

  constructor(platform: 'mobile' | 'pc' = 'pc') {
    this.platform = platform;
    this.localPlayerId = `op_${Math.random().toString(36).substring(2, 8)}`;
  }

  public setSceneAndParticles(scene: THREE.Scene, particles: ParticleSystem) {
    this.scene = scene;
    this.particles = particles;
  }

  // Generate a friendly 5-character room code
  public static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // --- HOST A NEW LAN / ONLINE ROOM ---
  public hostRoom(roomCode: string = MultiplayerManager.generateRoomCode(), playerName: string = 'Host'): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.roomId = roomCode.toUpperCase().trim();
      this.localPlayerName = playerName;
      const peerId = `frontline-room-${this.roomId}`;

      this.peer = new Peer(peerId, {
        debug: 1,
      });

      this.peer.on('open', id => {
        this.isConnected = true;
        this.onStatusChange?.(`Room hosted: [${this.roomId}] - Waiting for players`);
        resolve(this.roomId);
      });

      this.peer.on('connection', conn => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', err => {
        console.error('PeerJS Host Error:', err);
        this.onStatusChange?.(`Error hosting room: ${err.type}`);
        reject(err);
      });
    });
  }

  // --- JOIN AN EXISTING ROOM ---
  public joinRoom(roomCode: string, playerName: string = 'Guest'): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.roomId = roomCode.toUpperCase().trim();
      this.localPlayerName = playerName;
      const hostPeerId = `frontline-room-${this.roomId}`;
      const myPeerId = `frontline-client-${this.localPlayerId}`;

      this.peer = new Peer(myPeerId, {
        debug: 1,
      });

      this.peer.on('open', () => {
        const conn = this.peer!.connect(hostPeerId, {
          reliable: true,
          metadata: {
            name: this.localPlayerName,
            platform: this.platform,
          },
        });

        conn.on('open', () => {
          this.hostConnection = conn;
          this.isConnected = true;
          this.onStatusChange?.(`Connected to room: [${this.roomId}]`);

          // Send Join Announcement
          this.sendPacket(conn, {
            type: 'CLIENT_JOIN',
            senderId: this.localPlayerId,
            timestamp: Date.now(),
            payload: {
              name: this.localPlayerName,
              platform: this.platform,
            },
          });

          resolve(true);
        });

        conn.on('data', data => {
          this.handlePacket(data as NetworkPacket, conn);
        });

        conn.on('close', () => {
          this.isConnected = false;
          this.onStatusChange?.('Disconnected from host');
        });

        conn.on('error', err => {
          console.error('Connection to Host error:', err);
          this.onStatusChange?.(`Failed to connect: ${err}`);
          reject(err);
        });
      });

      this.peer.on('error', err => {
        console.error('PeerJS Client Error:', err);
        this.onStatusChange?.(`Join failed: ${err.type}`);
        reject(err);
      });
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.onStatusChange?.(`New player connected: ${conn.peer}`);

      // Send Welcome & Current Match Info
      this.sendPacket(conn, {
        type: 'HOST_WELCOME',
        senderId: this.localPlayerId,
        timestamp: Date.now(),
        payload: {
          roomId: this.roomId,
          hostName: this.localPlayerName,
        },
      });
    });

    conn.on('data', data => {
      const packet = data as NetworkPacket;
      this.handlePacket(packet, conn);

      // If Host, relay packet to all other connected clients
      if (this.isHost) {
        this.broadcastPacketExcept(packet, conn.peer);
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      // Remove remote player
      const playerId = Array.from(this.remotePlayers.keys()).find(k => conn.peer.includes(k));
      if (playerId) {
        this.removeRemotePlayer(playerId);
      }
    });
  }

  private handlePacket(packet: NetworkPacket, fromConn: DataConnection) {
    switch (packet.type) {
      case 'CLIENT_JOIN': {
        const payload = packet.payload;
        const newPlayer: RemotePlayerState = {
          id: packet.senderId,
          name: payload.name || 'Soldier',
          platform: payload.platform || 'pc',
          team: 'axis',
          position: { x: 0, y: 1.7, z: -20 },
          velocity: { x: 0, y: 0, z: 0 },
          yaw: 0,
          pitch: 0,
          weapon: 'm4',
          camo: 'standard',
          health: 100,
          maxHealth: 100,
          armor: 100,
          maxArmor: 100,
          kills: 0,
          deaths: 0,
          isShooting: false,
          isAiming: false,
          isSprinting: false,
          isTacSprinting: false,
          isSliding: false,
          isDiving: false,
          isTacStance: false,
          isMantling: false,
          isReloading: false,
          isDead: false,
          ping: 15,
        };

        this.remotePlayers.set(packet.senderId, newPlayer);
        this.spawnRemotePlayerMesh(newPlayer);
        this.onPlayerJoined?.(newPlayer);
        soundManager.playSlideCancel();
        break;
      }

      case 'STATE_UPDATE': {
        const state = packet.payload as RemotePlayerState;
        if (!this.remotePlayers.has(packet.senderId)) {
          this.remotePlayers.set(packet.senderId, state);
          this.spawnRemotePlayerMesh(state);
        } else {
          this.remotePlayers.set(packet.senderId, state);
        }
        break;
      }

      case 'SHOOT_EVENT': {
        const { origin, dir, weapon } = packet.payload;
        if (this.particles && origin && dir) {
          const vOrigin = new THREE.Vector3(origin.x, origin.y, origin.z);
          const vDir = new THREE.Vector3(dir.x, dir.y, dir.z);
          this.particles.emitTracer(vOrigin, vDir, 80);
          soundManager.playWeaponFire(weapon || 'm4', false, false, false, 0.8, vOrigin);
        }
        this.onRemoteShoot?.({
          playerId: packet.senderId,
          origin: new THREE.Vector3(origin.x, origin.y, origin.z),
          dir: new THREE.Vector3(dir.x, dir.y, dir.z),
          weapon,
        });
        break;
      }

      case 'DAMAGE_EVENT': {
        if (packet.payload.targetId === this.localPlayerId) {
          this.onRemoteDamage?.(packet.payload.damage, packet.payload.isHeadshot, packet.payload.attackerName);
        }
        break;
      }

      case 'CHAT_MESSAGE': {
        this.onChatMessage?.(packet.payload.sender, packet.payload.text);
        break;
      }
    }
  }

  private spawnRemotePlayerMesh(state: RemotePlayerState) {
    if (!this.scene) return;
    if (this.remotePlayerMeshes.has(state.id)) return;

    const mesh = new RemotePlayerMesh(this.scene, state.id, state.name, state.team);
    this.remotePlayerMeshes.set(state.id, mesh);
  }

  private removeRemotePlayer(id: string) {
    const mesh = this.remotePlayerMeshes.get(id);
    if (mesh && this.scene) {
      mesh.destroy(this.scene);
      this.remotePlayerMeshes.delete(id);
    }
    this.remotePlayers.delete(id);
    this.onPlayerLeft?.(id);
  }

  // Broadcast local player state every frame/tick
  public broadcastLocalState(state: Partial<RemotePlayerState>) {
    if (!this.isConnected) return;

    const fullState: RemotePlayerState = {
      id: this.localPlayerId,
      name: this.localPlayerName,
      platform: this.platform,
      team: 'allies',
      position: state.position || { x: 0, y: 1.7, z: 0 },
      velocity: state.velocity || { x: 0, y: 0, z: 0 },
      yaw: state.yaw || 0,
      pitch: state.pitch || 0,
      weapon: state.weapon || 'm4',
      camo: state.camo || 'standard',
      health: state.health || 100,
      maxHealth: state.maxHealth || 100,
      armor: state.armor || 100,
      maxArmor: state.maxArmor || 100,
      kills: state.kills || 0,
      deaths: state.deaths || 0,
      isShooting: Boolean(state.isShooting),
      isAiming: Boolean(state.isAiming),
      isSprinting: Boolean(state.isSprinting),
      isTacSprinting: Boolean(state.isTacSprinting),
      isSliding: Boolean(state.isSliding),
      isDiving: Boolean(state.isDiving),
      isTacStance: Boolean(state.isTacStance),
      isMantling: Boolean(state.isMantling),
      isReloading: Boolean(state.isReloading),
      isDead: Boolean(state.isDead),
      ping: 12,
    };

    const packet: NetworkPacket = {
      type: 'STATE_UPDATE',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      payload: fullState,
    };

    this.broadcastPacket(packet);
  }

  public broadcastShoot(origin: THREE.Vector3, dir: THREE.Vector3, weapon: WeaponType) {
    this.broadcastPacket({
      type: 'SHOOT_EVENT',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      payload: {
        origin: { x: origin.x, y: origin.y, z: origin.z },
        dir: { x: dir.x, y: dir.y, z: dir.z },
        weapon,
      },
    });
  }

  public sendDamageToPlayer(targetId: string, damage: number, isHeadshot: boolean) {
    this.broadcastPacket({
      type: 'DAMAGE_EVENT',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      payload: {
        targetId,
        damage,
        isHeadshot,
        attackerName: this.localPlayerName,
      },
    });
  }

  public sendChatMessage(text: string) {
    this.broadcastPacket({
      type: 'CHAT_MESSAGE',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      payload: {
        sender: this.localPlayerName,
        text,
      },
    });
  }

  private sendPacket(conn: DataConnection, packet: NetworkPacket) {
    if (conn.open) {
      conn.send(packet);
    }
  }

  private broadcastPacket(packet: NetworkPacket) {
    if (this.isHost) {
      this.connections.forEach(conn => {
        if (conn.open) conn.send(packet);
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(packet);
    }
  }

  private broadcastPacketExcept(packet: NetworkPacket, exceptPeerId: string) {
    this.connections.forEach((conn, peerId) => {
      if (peerId !== exceptPeerId && conn.open) {
        conn.send(packet);
      }
    });
  }

  public update(dt: number) {
    this.remotePlayers.forEach((state, id) => {
      const mesh = this.remotePlayerMeshes.get(id);
      if (mesh) {
        mesh.update(dt, state);
      }
    });
  }

  public disconnect() {
    this.connections.forEach(c => c.close());
    this.connections.clear();
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.remotePlayerMeshes.forEach(m => {
      if (this.scene) m.destroy(this.scene);
    });
    this.remotePlayerMeshes.clear();
    this.remotePlayers.clear();
    this.isConnected = false;
  }
}
