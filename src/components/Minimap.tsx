import React, { useEffect, useRef } from 'react';
import { EnemyBot } from '../types';

interface MinimapProps {
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  bots: EnemyBot[];
  uavActive: boolean;
}

export const Minimap: React.FC<MinimapProps> = ({ playerPos, playerYaw, bots, uavActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sweepAngleRef = useRef<number>(0);

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

    // Advance sweep angle
    sweepAngleRef.current = (sweepAngleRef.current + (uavActive ? 0.08 : 0.04)) % (Math.PI * 2);
    const sweep = sweepAngleRef.current;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background circle
    ctx.save();
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

    // Rotating Radar Sweep Fan Beam (Call of Duty UAV Sweep)
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarRadius);
    gradient.addColorStop(0, uavActive ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.15)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radarRadius, sweep - 0.45, sweep);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Sweep leading line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep) * radarRadius, cy + Math.sin(sweep) * radarRadius);
    ctx.strokeStyle = uavActive ? 'rgba(56, 189, 248, 0.9)' : 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Scale: 42 meters to radar radius
    const mapScale = radarRadius / 42;

    // Draw Enemy Bot blips
    bots.forEach(bot => {
      if (bot.state === 'dead') return;

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

      const dist = Math.hypot(rx, ry);
      if (dist <= radarRadius - 4) {
        // Red threat blip with glowing ring
        ctx.beginPath();
        ctx.arc(blipX, blipY, uavActive ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Elevation indicator chevrons (COD style above/below indicators)
        if (dy > 1.8) {
          // Above player (up chevron)
          ctx.beginPath();
          ctx.moveTo(blipX - 3, blipY - 5);
          ctx.lineTo(blipX, blipY - 8);
          ctx.lineTo(blipX + 3, blipY - 5);
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (dy < -1.8) {
          // Below player (down chevron)
          ctx.beginPath();
          ctx.moveTo(blipX - 3, blipY + 5);
          ctx.lineTo(blipX, blipY + 8);
          ctx.lineTo(blipX + 3, blipY + 5);
          ctx.strokeStyle = '#fca5a5';
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
  }, [playerPos, playerYaw, bots, uavActive]);

  return (
    <div className="relative w-36 h-36 rounded-full overflow-hidden shadow-2xl border-2 border-slate-700/90 bg-black/90 backdrop-blur-xl">
      <canvas ref={canvasRef} width={144} height={144} className="w-full h-full block" />
      {uavActive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-sky-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase animate-pulse shadow-md font-mono">
          UAV ACTIVE
        </div>
      )}
    </div>
  );
};
