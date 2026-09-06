import React from 'react';
import { EnemyBot, PlayerStats } from '../types';
import { Shield, Skull, Timer, Crosshair } from 'lucide-react';

interface ScoreboardProps {
  stats: PlayerStats;
  bots: EnemyBot[];
  alliesScore: number;
  axisScore: number;
  matchTime: number;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  stats,
  bots,
  alliesScore,
  axisScore,
  matchTime,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const kdRatio = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);

  return (
    <div id="scoreboard-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6 text-slate-200 select-none pointer-events-none font-sans">
      <div className="w-full max-w-4xl bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl p-5 flex flex-col gap-4">
        {/* Header Match Status */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                OPERATION OVERVIEW
              </span>
              <h2 className="text-xl font-black uppercase text-white tracking-tight">
                Team Deathmatch // 5v5
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Time Remaining</span>
              <span className="text-base font-bold text-cyan-400 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" /> {formatTime(matchTime)}
              </span>
            </div>
            <div className="h-7 w-[1px] bg-slate-800" />
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Score Limit</span>
              <span className="text-base font-bold text-white">50</span>
            </div>
          </div>
        </div>

        {/* 2 Teams Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Allies Team (TF-141) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center bg-sky-950/40 border border-sky-500/30 px-3.5 py-1.5 rounded-lg text-sky-300 font-bold text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-sky-400" /> TASK FORCE 141
              </span>
              <span className="text-base text-sky-400 font-black">{alliesScore}</span>
            </div>

            <div className="flex flex-col gap-1 text-xs font-mono">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-3 py-1 text-slate-500 uppercase text-[9px] font-semibold">
                <span className="col-span-5">OPERATOR</span>
                <span className="col-span-2 text-center">K</span>
                <span className="col-span-2 text-center">D</span>
                <span className="col-span-3 text-right">SCORE</span>
              </div>

              {/* Player Row */}
              <div className="grid grid-cols-12 px-3 py-2 rounded-lg bg-cyan-950/60 border border-cyan-400/50 text-white font-bold items-center shadow-md">
                <span className="col-span-5 text-cyan-300 flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" /> YOU (Ghost)
                </span>
                <span className="col-span-2 text-center font-mono text-cyan-300">{stats.kills}</span>
                <span className="col-span-2 text-center font-mono text-slate-400">{stats.deaths}</span>
                <span className="col-span-3 text-right font-mono text-cyan-400">{stats.score}</span>
              </div>

              {/* Friendly Allied Bots */}
              <div className="grid grid-cols-12 px-3 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-slate-400 items-center">
                <span className="col-span-5 text-slate-300 truncate">Soap MacTavish</span>
                <span className="col-span-2 text-center font-mono text-slate-300">4</span>
                <span className="col-span-2 text-center font-mono text-slate-500">2</span>
                <span className="col-span-3 text-right font-mono text-slate-400">400</span>
              </div>
              <div className="grid grid-cols-12 px-3 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-slate-400 items-center">
                <span className="col-span-5 text-slate-300 truncate">Captain Price</span>
                <span className="col-span-2 text-center font-mono text-slate-300">3</span>
                <span className="col-span-2 text-center font-mono text-slate-500">3</span>
                <span className="col-span-3 text-right font-mono text-slate-400">300</span>
              </div>
            </div>
          </div>

          {/* Axis Team (KORTAC) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center bg-rose-950/40 border border-rose-500/30 px-3.5 py-1.5 rounded-lg text-rose-300 font-bold text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5 text-rose-400" /> KORTAC OPERATIVES
              </span>
              <span className="text-base text-rose-400 font-black">{axisScore}</span>
            </div>

            <div className="flex flex-col gap-1 text-xs font-mono">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-3 py-1 text-slate-500 uppercase text-[9px] font-semibold">
                <span className="col-span-5">OPERATOR</span>
                <span className="col-span-2 text-center">K</span>
                <span className="col-span-2 text-center">D</span>
                <span className="col-span-3 text-right">STATUS</span>
              </div>

              {/* Bot Rows */}
              {bots.slice(0, 4).map(b => (
                <div key={b.id} className="grid grid-cols-12 px-3 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-slate-300 items-center">
                  <span className="col-span-5 text-slate-300 truncate">{b.name}</span>
                  <span className="col-span-2 text-center font-mono text-slate-300">{b.kills}</span>
                  <span className="col-span-2 text-center font-mono text-slate-500">{b.deaths}</span>
                  <span className={`col-span-3 text-right text-[9px] uppercase font-bold font-mono ${b.state === 'dead' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {b.state === 'dead' ? 'DOWN' : 'ACTIVE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info strip */}
        <div className="flex justify-between items-center border-t border-slate-800/80 pt-2 text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>K/D: <b className="text-cyan-400">{kdRatio}</b></span>
            <span>•</span>
            <span>HEADSHOTS: <b className="text-amber-400">{stats.headshots}</b></span>
            <span>•</span>
            <span>STREAK: <b className="text-emerald-400">{stats.highestStreak}</b></span>
          </div>
          <span className="text-slate-400 font-bold uppercase">[RELEASE TAB TO CLOSE]</span>
        </div>
      </div>
    </div>
  );
};
