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
  shape = 'square',
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
    const radarRadius = cx - 6;

    sweepAngleRef.current = (sweepAngleRef.current + (uavActive ? 0.08 : 0.035)) % (Math.PI * 2);
    const sweep = sweepAngleRef.current;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    if (isSquare) {
      const pad = 4;
      ctx.beginPath();
      ctx.rect(pad, pad, width - pad * 2, height - pad * 2);
      ctx.fillStyle = 'rgba(10, 12, 16, 0.92)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = uavActive ? 'rgba(163, 230, 53, 0.8)' : 'rgba(255, 255, 255, 0.14)';
      ctx.stroke();
      ctx.clip();

      // Tactical Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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

      // Range Rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      [0.4, 0.75].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, radarRadius * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Center Axis Hairlines
      ctx.strokeStyle = 'rgba(163, 230, 53, 0.12)';
      ctx.beginPath();
      ctx.moveTo(cx, pad);
      ctx.lineTo(cx, height - pad);
      ctx.moveTo(pad, cy);
      ctx.lineTo(width - pad, cy);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 12, 16, 0.92)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = uavActive ? 'rgba(163, 230, 53, 0.85)' : 'rgba(255, 255, 255, 0.16)';
      ctx.stroke();
      ctx.clip();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      [0.35, 0.7, 1.0].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, radarRadius * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.strokeStyle = 'rgba(163, 230, 53, 0.14)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - radarRadius);
      ctx.lineTo(cx, cy + radarRadius);
      ctx.moveTo(cx - radarRadius, cy);
      ctx.lineTo(cx + radarRadius, cy);
      ctx.stroke();
    }

    // UAV / Radar Sweep Beam
    const sweepRadius = isSquare ? radarRadius * 1.42 : radarRadius;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, sweepRadius);
    gradient.addColorStop(0, uavActive ? 'rgba(163, 230, 53, 0.28)' : 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(163, 230, 53, 0.0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, sweepRadius, sweep - 0.4, sweep);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep) * sweepRadius, cy + Math.sin(sweep) * sweepRadius);
    ctx.strokeStyle = uavActive ? 'rgba(163, 230, 53, 0.9)' : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.restore();

    const mapRange = battleRoyaleState ? 92 : 42;
    const mapScale = radarRadius / mapRange;

    const isInsideBounds = (bx: number, by: number, padOffset: number = 4) => {
      if (isSquare) {
        return (
          Math.abs(bx - cx) <= radarRadius + 2 - padOffset &&
          Math.abs(by - cy) <= radarRadius + 2 - padOffset
        );
      }
      return Math.hypot(bx - cx, by - cy) <= radarRadius - padOffset;
    };

    if (battleRoyaleState) {
      const cos = Math.cos(playerYaw);
      const sin = Math.sin(playerYaw);

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
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.restore();
      }

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
      ctx.lineWidth = 2;
      ctx.stroke();

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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.restore();

      const bermudaPois = [
        { name: 'PEAK', x: 0, z: 0 },
        { name: 'CLOCK', x: -55, z: 28 },
        { name: 'FACTORY', x: 50, z: -35 },
        { name: 'SHIPYARD', x: -35, z: -55 },
        { name: 'HANGAR', x: 45, z: 45 },
      ];

      ctx.save();
      ctx.font = '600 7px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
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

      if (battleRoyaleState.airdropPosition && !battleRoyaleState.airdropPosition.isLooted) {
        const adDx = battleRoyaleState.airdropPosition.x - playerPos.x;
        const adDz = battleRoyaleState.airdropPosition.z - playerPos.z;
        const adRx = adDx * cos - adDz * sin;
        const adRy = adDx * sin + adDz * cos;
        const adX = cx + adRx * mapScale;
        const adY = cy + adRy * mapScale;
        if (isInsideBounds(adX, adY, 4)) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(adX - 3.5, adY - 3.5, 7, 7);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(adX - 3.5, adY - 3.5, 7, 7);
        }
      }
    }

    // Bot blips
    bots.forEach(bot => {
      if (bot.state === 'dead') return;
      const isAlly = bot.team === 'allies';

      if (!isAlly && !bot.isVisibleToPlayer && !bot.spottedByRadar && !uavActive) {
        return;
      }

      const dx = bot.position.x - playerPos.x;
      const dz = bot.position.z - playerPos.z;
      const dy = bot.position.y - playerPos.y;

      const cos = Math.cos(playerYaw);
      const sin = Math.sin(playerYaw);
      const rx = dx * cos - dz * sin;
      const ry = dx * sin + dz * cos;

      const blipX = cx + rx * mapScale;
      const blipY = cy + ry * mapScale;

      if (isInsideBounds(blipX, blipY, 4)) {
        if (bot.isSuppressed) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.85)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (bot.isFlanking) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.setLineDash([2, 2]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(blipX, blipY, isAlly ? 3.5 : uavActive ? 4 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isAlly ? '#38bdf8' : '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#090b0e';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (dy > 1.8) {
          ctx.beginPath();
          ctx.moveTo(blipX - 2.5, blipY - 5);
          ctx.lineTo(blipX, blipY - 7.5);
          ctx.lineTo(blipX + 2.5, blipY - 5);
          ctx.strokeStyle = isAlly ? '#7dd3fc' : '#fca5a5';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (dy < -1.8) {
          ctx.beginPath();
          ctx.moveTo(blipX - 2.5, blipY + 5);
          ctx.lineTo(blipX, blipY + 7.5);
          ctx.lineTo(blipX + 2.5, blipY + 5);
          ctx.strokeStyle = isAlly ? '#7dd3fc' : '#fca5a5';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    });

    // Player Chevron (MW3 White / Lime Arrow)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fillStyle = '#a3e635';
    ctx.fill();
    ctx.strokeStyle = '#090b0e';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // North Indicator
    const northAngle = -playerYaw - Math.PI / 2;
    const nx = cx + Math.cos(northAngle) * (radarRadius - 8);
    const ny = cy + Math.sin(northAngle) * (radarRadius - 8);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);

    ctx.restore();
  }, [playerPos, playerYaw, bots, uavActive, battleRoyaleState, isSquare]);

  return (
    <div
      className={`relative overflow-hidden bg-[#0A0C10]/90 border border-white/15 backdrop-blur-md transition-all ${
        isSquare ? 'w-40 h-40 rounded-sm' : 'w-36 h-36 rounded-full'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={isSquare ? 160 : 144}
        height={isSquare ? 160 : 144}
        className="w-full h-full block"
      />

      {isSquare && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#A3E635] pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#A3E635] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#A3E635] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#A3E635] pointer-events-none" />
          <div className="absolute bottom-1 left-1.5 text-[8px] font-mono text-zinc-400 tracking-wider pointer-events-none uppercase tabular-nums">
            SEC-B4
          </div>
        </>
      )}

      {uavActive && (
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-[#A3E635] text-[#090B0E] text-[9px] font-mono font-bold px-1.5 py-0.5 tracking-widest uppercase">
          UAV ONLINE
        </div>
      )}
    </div>
  );
};
