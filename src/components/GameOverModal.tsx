import React, { useEffect } from 'react';
import { PlayerStats } from '../types';
import { Trophy, Flame, Skull, Crosshair, Target, RotateCcw, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  victory: boolean;
  stats: PlayerStats;
  onPlayAgain: () => void;
  onReturnToHome?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  victory,
  stats,
  onPlayAgain,
  onReturnToHome,
}) => {
  useEffect(() => {
    if (victory) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#06b6d4', '#eab308'],
      });
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        onPlayAgain();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [victory, onPlayAgain]);

  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);

  return (
    <div id="gameover-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-6 text-slate-200 select-none font-sans">
      <div className="w-full max-w-lg bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center gap-5 text-center">
        {/* Banner */}
        <div className="flex flex-col items-center gap-2">
          {victory ? (
            <div className="w-14 h-14 rounded-full bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.3)]">
              <Trophy className="w-7 h-7" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/50 flex items-center justify-center text-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.3)]">
              <Skull className="w-7 h-7" />
            </div>
          )}

          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
            MISSION DEBRIEFING
          </span>
          <h1 className={`text-4xl font-black uppercase tracking-tight ${victory ? 'text-cyan-400' : 'text-rose-500'}`}>
            {victory ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <p className="text-xs text-slate-400 max-w-sm">
            {victory
              ? 'Target zone secured. All hostiles eliminated with high combat efficiency.'
              : 'Hostile forces held the perimeter. Regroup for tactical reassignment.'}
          </p>
        </div>

        {/* Combat Performance Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
          <StatBox label="ELIMS" value={stats.kills} icon={<Skull className="w-3.5 h-3.5 text-rose-400" />} />
          <StatBox label="K/D" value={kd} icon={<Target className="w-3.5 h-3.5 text-cyan-400" />} />
          <StatBox label="HEADSHOTS" value={stats.headshots} icon={<Crosshair className="w-3.5 h-3.5 text-emerald-400" />} />
          <StatBox label="MAX STREAK" value={stats.highestStreak} icon={<Flame className="w-3.5 h-3.5 text-amber-400" />} />
        </div>

        {/* Score Card */}
        <div className="w-full bg-slate-900/30 p-3 rounded-lg border border-slate-800/80 flex justify-between items-center px-4 font-mono">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Combat Score</span>
          <span className="text-xl font-black text-cyan-400">{stats.score} PTS</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow hover:shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <RotateCcw className="w-4 h-4" /> Deploy Again [ENTER]
          </button>

          {onReturnToHome && (
            <button
              onClick={onReturnToHome}
              className="py-3 px-5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Home className="w-4 h-4 text-slate-400" /> Lobby
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex flex-col items-center gap-1 p-2 bg-slate-950/60 rounded-lg border border-slate-800/70">
    <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400 uppercase font-bold">
      {icon} {label}
    </div>
    <span className="text-xl font-black font-mono text-white">{value}</span>
  </div>
);
