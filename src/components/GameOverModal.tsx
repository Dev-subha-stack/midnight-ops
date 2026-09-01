import React, { useEffect } from 'react';
import { PlayerStats } from '../types';
import { Trophy, Flame, Skull, Crosshair, Target, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  victory: boolean;
  stats: PlayerStats;
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  victory,
  stats,
  onPlayAgain,
}) => {
  useEffect(() => {
    if (victory) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#eab308', '#3b82f6', '#10b981'],
      });
    }
  }, [victory]);

  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 48;
  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);

  return (
    <div id="gameover-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6 text-slate-200 select-none">
      <div className="w-full max-w-xl bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-6 text-center">
        {/* Banner */}
        <div className="flex flex-col items-center gap-2">
          {victory ? (
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
              <Trophy className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]">
              <Skull className="w-8 h-8" />
            </div>
          )}

          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">Operation Concluded</span>
          <h1 className={`text-5xl font-black uppercase tracking-tight ${victory ? 'text-cyan-400' : 'text-rose-500'}`}>
            {victory ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <p className="text-sm text-slate-400 max-w-md">
            {victory
              ? 'Target zone secured. All hostiles eliminated with high combat efficiency.'
              : 'Hostile forces overwhelmed the perimeter. Regroup for tactical reassignment.'}
          </p>
        </div>

        {/* Combat Performance Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <StatBox label="ELIMINATIONS" value={stats.kills} icon={<Skull className="w-4 h-4 text-rose-400" />} />
          <StatBox label="K/D RATIO" value={kd} icon={<Target className="w-4 h-4 text-cyan-400" />} />
          <StatBox label="HEADSHOTS" value={stats.headshots} icon={<Crosshair className="w-4 h-4 text-emerald-400" />} />
          <StatBox label="HIGH STREAK" value={stats.highestStreak} icon={<Flame className="w-4 h-4 text-amber-400" />} />
        </div>

        {/* Score & XP */}
        <div className="w-full bg-slate-900/30 p-4 rounded-xl border border-slate-800/80 flex justify-between items-center px-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Total Combat Score</span>
          <span className="text-2xl font-black font-mono text-cyan-400">{stats.score} PTS</span>
        </div>

        {/* Play Again Button */}
        <button
          onClick={onPlayAgain}
          className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-base uppercase tracking-widest rounded-xl transition-all shadow-xl hover:shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer font-mono"
        >
          <RotateCcw className="w-5 h-5" /> Deploy Again
        </button>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex flex-col items-center gap-1 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 uppercase">
      {icon} {label}
    </div>
    <span className="text-2xl font-black font-mono text-white">{value}</span>
  </div>
);
