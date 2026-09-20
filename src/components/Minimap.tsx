import React, { useEffect, useRef } from 'react';
import { BattleRoyaleState, EnemyBot } from '../types';

interface MinimapProps {
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  bots: EnemyBot[];
  uavActive: boolean;
  battleRoyaleState?: BattleRoyaleState | null;
  shape?: 'circular' | 'square';
}

export const Minimap: React.FC<MinimapProps> = ({
  playerPos,
  playerYaw,
  bots,
  uavActive,
  battleRoyaleState,
  shape = 'circular',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sweepAngleRef = useRef<number>(0);

  const isSquare = shape === 'square';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radarRadius = cx - 8;

    // Advance sweep angle
    sweepAngleRef.current = (sweepAngleRef.current + (uavActive ? 0.08 : 0.04)) % (Math.PI * 2);
    const sweep = sweepAngleRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    if (isSquare) {
      // Modern Warfare / Warzone Square Radar Boundary
      const pad = 6;
      const cornerRadius = 10;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, cornerRadius);
      } else {
        ctx.rect(pad, pad, width - pad * 2, height - pad * 2);
      }
      ctx.fillStyle = 'rgba(8, 12, 18, 0.94)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = uavActive ? 'rgba(56, 189, 248, 0.95)' : 'rgba(71, 85, 105, 0.85)';
      ctx.stroke();
      ctx.clip();

      // Tactical Square Grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      const step = (width - pad * 2) / 4;
      for (let i = 1; i < 4; i++) {
        const p = pad + i * step;
        ctx.beginPath();
        ctx.moveTo(p, pad);
        ctx.lineTo(p, height - pad);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pad, p);
        ctx.lineTo(width - pad, p);
        ctx.stroke();
      }

      // Concentric Range Rings inside Square
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.55)';
      [0.4, 0.75, 1.0].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, radarRadius * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis cross lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.beginPath();
      ctx.moveTo(cx, pad);
      ctx.lineTo(cx, height - pad);
      ctx.moveTo(pad, cy);
      ctx.lineTo(width - pad, cy);
      ctx.stroke();
    } else {
      // Classic 360 Radial Circular Radar
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 15, 22, 0.92)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = uavActive ? 'rgba(56, 189, 248, 0.95)' : 'rgba(71, 85, 105, 0.85)';
      ctx.stroke();
      ctx.clip();

      // Concentric Range Rings
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.lineWidth = 1;
      [0.35, 0.7, 1.0].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, radarRadius * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshair Grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - radarRadius);
      ctx.lineTo(cx, cy + radarRadius);
      ctx.moveTo(cx - radarRadius, cy);
      ctx.lineTo(cx + radarRadius, cy);
      ctx.stroke();
    }

    // Rotating Radar Sweep Fan Beam (Call of Duty UAV Sweep)
    const sweepRadius = isSquare ? radarRadius * 1.35 : radarRadius;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, sweepRadius);
    gradient.addColorStop(0, uavActive ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.16)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, sweepRadius, sweep - 0.45, sweep);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Leading sweep ray line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep) * sweepRadius, cy + Math.sin(sweep) * sweepRadius);
    ctx.strokeStyle = uavActive ? 'rgba(56, 189, 248, 0.95)' : 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Adaptive scale: 92m range in Battle Royale, 42m in TDM
    const mapRange = battleRoyaleState ? 92 : 42;
    const mapScale = radarRadius / mapRange;

    // Helper to test if point is inside radar bounds
    const isInsideBounds = (bx: number, by: number, padOffset: number = 4) => {
      if (isSquare) {
        return (
          Math.abs(bx - cx) <= radarRadius + 2 - padOffset &&
          Math.abs(by - cy) <= radarRadius + 2 - padOffset
        );
      }
      return Math.hypot(bx - cx, by - cy) <= radarRadius - padOffset;
    };

    // Draw Battle Royale Safe Zone Circles & Danger Zone
    if (battleRoyaleState) {
      const cos = Math.cos(playerYaw);
      const sin = Math.sin(playerYaw);

      // Free Fire Red Danger Zone (Airstrike Bombardment)
      if (battleRoyaleState.dangerZone) {
        const dzDx = battleRoyaleState.dangerZone.center.x - playerPos.x;
        const dzDz = battleRoyaleState.dangerZone.center.z - playerPos.z;
        const dzRx = dzDx * cos - dzDz * sin;
        const dzRy = dzDx * sin + dzDz * cos;
        const dzScreenX = cx + dzRx * mapScale;
        const dzScreenY = cy + dzRy * mapScale;
        const dzScreenR = battleRoyaleState.dangerZone.radius * mapScale;

        ctx.save();
        ctx.beginPath();
        ctx.arc(dzScreenX, dzScreenY, dzScreenR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.restore();
      }

      // Current Safe Zone (Blue ring)
      const cDx = battleRoyaleState.circleCenter.x - playerPos.x;
      const cDz = battleRoyaleState.circleCenter.z - playerPos.z;
      const cRx = cDx * cos - cDz * sin;
      const cRy = cDx * sin + cDz * cos;
      const circleScreenX = cx + cRx * mapScale;
      const circleScreenY = cy + cRy * mapScale;
      const circleScreenR = battleRoyaleState.circleRadius * mapScale;

      ctx.save();
      ctx.beginPath();
      ctx.arc(circleScreenX, circleScreenY, circleScreenR, 0, Math.PI * 2);
      ctx.strokeStyle = battleRoyaleState.isShrinking ? 'rgba(239, 68, 68, 0.95)' : 'rgba(56, 189, 248, 0.88)';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Next Safe Zone (Dotted white ring)
      const nextDx = battleRoyaleState.nextCircleCenter.x - playerPos.x;
      const nextDz = battleRoyaleState.nextCircleCenter.z - playerPos.z;
      const nextRx = nextDx * cos - nextDz * sin;
      const nextRy = nextDx * sin + nextDz * cos;
      const nextX = cx + nextRx * mapScale;
      const nextY = cy + nextRy * mapScale;
      const nextR = battleRoyaleState.nextCircleRadius * mapScale;

      ctx.beginPath();
      ctx.arc(nextX, nextY, nextR, 0, Math.PI * 2);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // POI Town labels when on Bermuda map
      const bermudaPois = [
        { name: 'PEAK', x: 0, z: 0 },
        { name: 'CLOCK', x: -55, z: 28 },
        { name: 'FACTORY', x: 50, z: -35 },
        { name: 'SHIPYARD', x: -35, z: -55 },
        { name: 'HANGAR', x: 45, z: 45 },
      ];

      ctx.save();
      ctx.font = 'bold 7px sans-serif';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      bermudaPois.forEach(poi => {
        const pDx = poi.x - playerPos.x;
        const pDz = poi.z - playerPos.z;
        const pRx = pDx * cos - pDz * sin;
        const pRy = pDx * sin + pDz * cos;
        const pX = cx + pRx * mapScale;
        const pY = cy + pRy * mapScale;
        if (isInsideBounds(pX, pY, 12)) {
          ctx.fillText(poi.name, pX, pY);
        }
      });
      ctx.restore();

      // Airdrop Crate Blip on Minimap
      if (battleRoyaleState.airdropPosition && !battleRoyaleState.airdropPosition.isLooted) {
        const adDx = battleRoyaleState.airdropPosition.x - playerPos.x;
        const adDz = battleRoyaleState.airdropPosition.z - playerPos.z;
        const adRx = adDx * cos - adDz * sin;
        const adRy = adDx * sin + adDz * cos;
        const adX = cx + adRx * mapScale;
        const adY = cy + adRy * mapScale;
        if (isInsideBounds(adX, adY, 4)) {
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(adX, adY, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Draw Bot blips: Allies (Cyan) vs Enemies (Red)
    bots.forEach(bot => {
      if (bot.state === 'dead') return;
      const isAlly = bot.team === 'allies';

      // Axis enemies only visible if scanned by radar / firing / direct LoS
      if (!isAlly && !bot.isVisibleToPlayer && !bot.spottedByRadar && !uavActive) {
        return;
      }

      const dx = bot.position.x - playerPos.x;
      const dz = bot.position.z - playerPos.z;
      const dy = bot.position.y - playerPos.y;

      // Rotate by player yaw so top of radar is player facing direction
      const cos = Math.cos(playerYaw);
      const sin = Math.sin(playerYaw);
      const rx = dx * cos - dz * sin;
      const ry = dx * sin + dz * cos;

      const blipX = cx + rx * mapScale;
      const blipY = cy + ry * mapScale;

      if (isInsideBounds(blipX, blipY, 4)) {
        // Tactical cover / suppression / flanking aura
        if (bot.isSuppressed) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 6.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)'; // Yellow suppression halo
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (bot.isFlanking) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 6.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)'; // Rose/Purple flanking aura
          ctx.setLineDash([2, 2]);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (bot.isCrouchedInCover || bot.isPeekingCover) {
          ctx.strokeStyle = isAlly ? 'rgba(56, 189, 248, 0.7)' : 'rgba(239, 68, 68, 0.7)';
          ctx.strokeRect(blipX - 5, blipY - 5, 10, 10);
        }

        ctx.beginPath();
        ctx.arc(blipX, blipY, isAlly ? 4.0 : (uavActive ? 4.5 : 3.5), 0, Math.PI * 2);
        ctx.fillStyle = isAlly ? '#06b6d4' : '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Elevation indicator chevrons (COD style above/below indicators)
        if (dy > 1.8) {
          ctx.beginPath();
          ctx.moveTo(blipX - 3, blipY - 5);
          ctx.lineTo(blipX, blipY - 8);
          ctx.lineTo(blipX + 3, blipY - 5);
          ctx.strokeStyle = isAlly ? '#67e8f9' : '#fca5a5';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (dy < -1.8) {
          ctx.beginPath();
          ctx.moveTo(blipX - 3, blipY + 5);
          ctx.lineTo(blipX, blipY + 8);
          ctx.lineTo(blipX + 3, blipY + 5);
          ctx.strokeStyle = isAlly ? '#67e8f9' : '#fca5a5';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    });

    // Draw Player Chevron (Center pointing Up in Cyan / Blue)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Draw North (N) Pointer along radar perimeter
    const northAngle = -playerYaw - Math.PI / 2;
    const nx = cx + Math.cos(northAngle) * (radarRadius - 7);
    const ny = cy + Math.sin(northAngle) * (radarRadius - 7);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);

    ctx.restore();
  }, [playerPos, playerYaw, bots, uavActive, battleRoyaleState, isSquare]);

  return (
    <div
      className={`relative overflow-hidden shadow-2xl border-2 border-slate-700/90 bg-black/90 backdrop-blur-xl transition-all duration-300 ${
        isSquare ? 'w-40 h-40 rounded-xl' : 'w-36 h-36 rounded-full'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={isSquare ? 160 : 144}
        height={isSquare ? 160 : 144}
        className="w-full h-full block"
      />

      {/* Tactical Corner Brackets for Square Style */}
      {isSquare && (
        <>
          <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />
          <div className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-500 pointer-events-none font-bold">
            GRID // 04
          </div>
        </>
      )}

      {uavActive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-sky-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase animate-pulse shadow-md font-mono">
          UAV ACTIVE
        </div>
      )}
    </div>
  );
};
