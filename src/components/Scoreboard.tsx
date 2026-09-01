import React from 'react';
import { EnemyBot, PlayerStats } from '../types';

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

  return (
    <div id="scoreboard-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 text-slate-200 select-none pointer-events-none">
      <div className="w-full max-w-4xl bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-6">
        {/* Header Match Status */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">Team Deathmatch</span>
            <h2 className="text-2xl font-black uppercase text-white">Tactical Scoreboard</h2>
          </div>
          <div className="flex items-center gap-6 font-mono">
            <div className="text-center">
              <span className="text-xs text-slate-500 block">TIME REMAINING</span>
              <span className="text-xl font-bold text-cyan-400">{formatTime(matchTime)}</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-500 block">SCORE LIMIT</span>
              <span className="text-xl font-bold text-white">50</span>
            </div>
          </div>
        </div>

        {/* 2 Teams Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Allies Team */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-cyan-950/50 border border-cyan-500/30 px-4 py-2 rounded-lg text-cyan-300 font-bold text-sm font-mono">
              <span>ALLIED FORCES</span>
              <span className="text-lg text-cyan-400">{alliesScore}</span>
            </div>

            <div className="flex flex-col gap-1 text-xs font-mono">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-3 py-1 text-slate-500 uppercase text-[10px] font-semibold">
                <span className="col-span-5">OPERATOR</span>
                <span className="col-span-2 text-center">K</span>
                <span className="col-span-2 text-center">D</span>
                <span className="col-span-3 text-right">SCORE</span>
              </div>

              {/* Player Row */}
              <div className="grid grid-cols-12 px-3 py-2.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-white font-bold items-center shadow-md">
                <span className="col-span-5 text-cyan-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" /> YOU (Player)
                </span>
                <span className="col-span-2 text-center font-mono text-cyan-300">{stats.kills}</span>
                <span className="col-span-2 text-center font-mono text-slate-400">{stats.deaths}</span>
                <span className="col-span-3 text-right font-mono text-cyan-400">{stats.score}</span>
              </div>
            </div>
          </div>

          {/* Axis Team */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-rose-950/50 border border-rose-500/30 px-4 py-2 rounded-lg text-rose-300 font-bold text-sm font-mono">
              <span>AXIS FORCES</span>
              <span className="text-lg text-rose-400">{axisScore}</span>
            </div>

            <div className="flex flex-col gap-1 text-xs font-mono">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-3 py-1 text-slate-500 uppercase text-[10px] font-semibold">
                <span className="col-span-5">OPERATOR</span>
                <span className="col-span-2 text-center">K</span>
                <span className="col-span-2 text-center">D</span>
                <span className="col-span-3 text-right">STATUS</span>
              </div>

              {/* Bot Rows */}
              {bots.slice(0, 5).map(b => (
                <div key={b.id} className="grid grid-cols-12 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800/80 text-slate-300 items-center">
                  <span className="col-span-5 text-slate-300">{b.name}</span>
                  <span className="col-span-2 text-center font-mono">{b.kills}</span>
                  <span className="col-span-2 text-center font-mono text-slate-500">{b.deaths}</span>
                  <span className={`col-span-3 text-right text-[10px] uppercase font-bold ${b.state === 'dead' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {b.state === 'dead' ? 'RESPAWNING' : 'COMBAT'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
