import React, { useEffect } from 'react';
import { PlayerStats } from '../types';
import { Trophy, Flame, Skull, Crosshair, Target, RotateCcw, Home, Sun } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  victory: boolean;
  stats: PlayerStats;
  easterEgg?: string | null;
  onPlayAgain: () => void;
  onReturnToHome?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  victory,
  stats,
  easterEgg,
  onPlayAgain,
  onReturnToHome,
}) => {
  const isSolarSupernova = easterEgg === 'solar_supernova';

  useEffect(() => {
    if (victory) {
      if (isSolarSupernova) {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#f59e0b', '#f97316', '#a3e635', '#fbbf24', '#ffffff'],
        });
      } else {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a3e635', '#38bdf8', '#eab308'],
        });
      }
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        onPlayAgain();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [victory, isSolarSupernova, onPlayAgain]);

  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);

  return (
    <div
      id="gameover-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 text-zinc-100 select-none"
    >
      <div
        className={`w-full max-w-lg bg-[#0D1015]/95 rounded-sm shadow-2xl p-6 sm:p-8 flex flex-col items-center gap-5 text-center cod-chamfer border ${
          isSolarSupernova ? 'border-amber-500/70' : victory ? 'border-[#A3E635]/40' : 'border-red-500/35'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className={`w-14 h-14 rounded-sm flex items-center justify-center border ${
              isSolarSupernova
                ? 'bg-amber-500/15 border-amber-400/60 text-amber-400'
                : victory
                ? 'bg-[#A3E635]/15 border-[#A3E635]/50 text-[#A3E635]'
                : 'bg-red-500/15 border-red-500/50 text-red-400'
            }`}
          >
            {isSolarSupernova ? (
              <Sun className="w-8 h-8" />
            ) : victory ? (
              <Trophy className="w-7 h-7" />
            ) : (
              <Skull className="w-7 h-7" />
            )}
          </div>

          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400 font-semibold">
            {isSolarSupernova ? 'Classified Easter Egg · 30-Shot Solar Destroyer' : 'After Action Report'}
          </span>

          <h1
            className={`font-display text-5xl font-extrabold uppercase tracking-wider leading-none ${
              isSolarSupernova ? 'text-amber-400' : victory ? 'text-[#A3E635]' : 'text-red-500'
            }`}
          >
            {isSolarSupernova ? 'Supernova Victory' : victory ? 'Victory' : 'Defeat'}
          </h1>

          <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
            {isSolarSupernova
              ? 'Direct high-caliber fire triggered a solar core collapse, neutralizing all hostile forces.'
              : victory
              ? 'Objective secured. Hostile combatants neutralized.'
              : 'Hostile squad controlled the sector. Regroup and redeploy.'}
          </p>
        </div>

        {/* Performance Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
          <StatBox label="Elims" value={stats.kills} icon={<Skull className="w-3.5 h-3.5 text-red-400" />} />
          <StatBox label="K/D" value={kd} icon={<Target className="w-3.5 h-3.5 text-[#A3E635]" />} />
          <StatBox label="Headshots" value={stats.headshots} icon={<Crosshair className="w-3.5 h-3.5 text-sky-400" />} />
          <StatBox label="Streak" value={stats.highestStreak} icon={<Flame className="w-3.5 h-3.5 text-amber-400" />} />
        </div>

        {/* Total Combat Score */}
        <div className="w-full bg-[#13171E] p-3.5 rounded-sm border border-white/10 flex justify-between items-center px-4 font-mono tabular-nums">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Match Score</span>
          <span className="font-display text-2xl font-bold text-[#A3E635]">{stats.score} PTS</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 bg-[#A3E635] hover:bg-[#BEF264] text-[#090B0E] font-bold text-xs uppercase tracking-widest rounded-sm cod-chamfer-sm transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <RotateCcw className="w-4 h-4" /> Redeploy [ENTER]
          </button>

          {onReturnToHome && (
            <button
              onClick={onReturnToHome}
              className="py-3 px-5 bg-[#151921] hover:bg-[#1E242E] text-zinc-200 font-semibold text-xs uppercase tracking-wider rounded-sm border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Home className="w-4 h-4 text-zinc-400" /> Return to HQ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex flex-col items-center gap-1 p-2.5 bg-[#13171E] rounded-sm border border-white/10 tabular-nums">
    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase font-semibold">
      {icon} {label}
    </div>
    <span className="font-display text-2xl font-bold text-white leading-none">{value}</span>
  </div>
);
