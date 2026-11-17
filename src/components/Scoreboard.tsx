import React from 'react';
import { EnemyBot, PlayerStats } from '../types';
import { Shield, Skull, Timer } from 'lucide-react';

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
  const alliedBots = bots.filter(b => b.team === 'allies');
  const axisBots = bots.filter(b => b.team === 'axis');

  return (
    <div
      id="scoreboard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6 text-zinc-100 select-none pointer-events-none"
    >
      <div className="w-full max-w-4xl bg-[#0D1015]/95 border border-white/10 rounded-sm shadow-2xl p-5 flex flex-col gap-4 cod-chamfer">
        {/* Header Match Status */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A3E635] font-semibold block">
              Tactical Match Roster
            </span>
            <h2 className="font-display text-2xl font-bold uppercase text-white tracking-wider">
              Team Deathmatch · Combat Scoreboard
            </h2>
          </div>

          <div className="flex items-center gap-5 font-mono text-xs tabular-nums">
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 block uppercase">Time Remaining</span>
              <span className="text-base font-bold text-white flex items-center justify-end gap-1.5">
                <Timer className="w-3.5 h-3.5 text-[#A3E635]" /> {formatTime(matchTime)}
              </span>
            </div>
            <div className="h-7 w-[1px] bg-white/10" />
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 block uppercase">Score Limit</span>
              <span className="text-base font-bold text-[#A3E635]">50</span>
            </div>
          </div>
        </div>

        {/* 2 Teams Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Task Force 141 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center bg-[#121922] border border-sky-500/25 px-3.5 py-2 rounded-sm text-sky-300 font-semibold text-xs font-mono">
              <span className="flex items-center gap-2 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-sky-400" /> Task Force 141
              </span>
              <span className="font-display text-xl text-white font-bold tabular-nums">{alliesScore}</span>
            </div>

            <div className="flex flex-col gap-1 text-xs font-mono tabular-nums">
              <div className="grid grid-cols-12 px-3 py-1 text-zinc-500 uppercase text-[10px] tracking-wider">
                <span className="col-span-5">Operator</span>
                <span className="col-span-2 text-center">Kills</span>
                <span className="col-span-2 text-center">Deaths</span>
                <span className="col-span-3 text-right">Score</span>
              </div>

              {/* Player Row */}
              <div className="grid grid-cols-12 px-3 py-2 rounded-sm bg-[#1A2115] border border-[#A3E635]/40 text-white font-bold items-center">
                <span className="col-span-5 text-[#A3E635] truncate">GHOST (YOU)</span>
                <span className="col-span-2 text-center text-white">{stats.kills}</span>
                <span className="col-span-2 text-center text-zinc-400">{stats.deaths}</span>
                <span className="col-span-3 text-right text-[#A3E635]">{stats.score}</span>
              </div>

              {alliedBots.length > 0 ? (
                alliedBots.slice(0, 5).map(b => (
                  <div
                    key={b.id}
                    className="grid grid-cols-12 px-3 py-1.5 rounded-sm bg-[#13171E] border border-white/5 text-zinc-300 items-center"
                  >
                    <span className="col-span-5 truncate text-sky-200">{b.name}</span>
                    <span className="col-span-2 text-center">{b.kills}</span>
                    <span className="col-span-2 text-center text-zinc-500">{b.deaths}</span>
                    <span className="col-span-3 text-right text-zinc-400">{b.kills * 100}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="grid grid-cols-12 px-3 py-1.5 rounded-sm bg-[#13171E] border border-white/5 text-zinc-400 items-center">
                    <span className="col-span-5 text-zinc-300 truncate">Soap MacTavish</span>
                    <span className="col-span-2 text-center">4</span>
                    <span className="col-span-2 text-center text-zinc-500">2</span>
                    <span className="col-span-3 text-right">400</span>
                  </div>
                  <div className="grid grid-cols-12 px-3 py-1.5 rounded-sm bg-[#13171E] border border-white/5 text-zinc-400 items-center">
                    <span className="col-span-5 text-zinc-300 truncate">Captain Price</span>
                    <span className="col-span-2 text-center">3</span>
                    <span className="col-span-2 text-center text-zinc-500">3</span>
                    <span className="col-span-3 text-right">300</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* KORTAC */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center bg-[#1F1315] border border-red-500/25 px-3.5 py-2 rounded-sm text-red-300 font-semibold text-xs font-mono">
              <span className="flex items-center gap-2 uppercase tracking-wider">
                <Skull className="w-3.5 h-3.5 text-red-400" /> KORTAC
              </span>
              <span className="font-display text-xl text-white font-bold tabular-nums">{axisScore}</span>
            </div>

            <div className="flex flex-col gap-1 text-xs font-mono tabular-nums">
              <div className="grid grid-cols-12 px-3 py-1 text-zinc-500 uppercase text-[10px] tracking-wider">
                <span className="col-span-5">Operator</span>
                <span className="col-span-2 text-center">Kills</span>
                <span className="col-span-2 text-center">Deaths</span>
                <span className="col-span-3 text-right">Status</span>
              </div>

              {axisBots.slice(0, 6).map(b => (
                <div
                  key={b.id}
                  className="grid grid-cols-12 px-3 py-1.5 rounded-sm bg-[#13171E] border border-white/5 text-zinc-300 items-center"
                >
                  <span className="col-span-5 text-zinc-200 truncate">{b.name}</span>
                  <span className="col-span-2 text-center">{b.kills}</span>
                  <span className="col-span-2 text-center text-zinc-500">{b.deaths}</span>
                  <span
                    className={`col-span-3 text-right text-[10px] uppercase font-bold ${
                      b.state === 'dead' ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {b.state === 'dead' ? 'KIA' : 'ACTIVE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Strip */}
        <div className="flex justify-between items-center border-t border-white/10 pt-2.5 text-[11px] font-mono text-zinc-400 tabular-nums">
          <div className="flex items-center gap-4">
            <span>
              K/D <b className="text-white">{kdRatio}</b>
            </span>
            <span className="text-zinc-600">·</span>
            <span>
              HEADSHOTS <b className="text-amber-400">{stats.headshots}</b>
            </span>
            <span className="text-zinc-600">·</span>
            <span>
              BEST STREAK <b className="text-[#A3E635]">{stats.highestStreak}</b>
            </span>
          </div>
          <span className="text-zinc-500 uppercase tracking-wider">Release [TAB] to Close</span>
        </div>
      </div>
    </div>
  );
};
