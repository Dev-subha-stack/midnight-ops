import React from 'react';
import { KillFeedItem } from '../types';
import { Crosshair, Skull, Flame, ShieldAlert, Zap } from 'lucide-react';

interface KillfeedProps {
  items: KillFeedItem[];
}

export const Killfeed: React.FC<KillfeedProps> = ({ items }) => {
  // Show last 6 events
  const visibleItems = items.slice(-6).reverse();

  return (
    <div id="killfeed-container" className="flex flex-col gap-1.5 items-end select-none pointer-events-none">
      {visibleItems.map(item => {
        return (
          <div
            key={item.id}
            className={`flex items-center gap-2 px-3 py-1 rounded backdrop-blur-md text-[11px] font-mono tracking-wide border shadow-lg transition-all ${
              item.isPlayerKiller
                ? 'bg-cyan-950/40 border-slate-700/80 border-l-2 border-l-cyan-400 text-cyan-200'
                : item.isPlayerVictim
                ? 'bg-rose-950/40 border-slate-700/80 border-l-2 border-l-rose-500 text-rose-200'
                : 'bg-black/60 border-slate-800 border-l-2 border-l-slate-600 text-slate-300'
            }`}
          >
            {/* Killer Name */}
            <span className={`font-bold ${item.isPlayerKiller ? 'text-cyan-400' : 'text-slate-200'}`}>
              {item.killer}
            </span>

            {/* Weapon / Elimination Icon */}
            <div className="flex items-center gap-1 text-slate-400">
              {item.isHeadshot && <Skull className="w-3.5 h-3.5 text-red-400" />}
              <span className="uppercase text-[9px] bg-slate-800/80 border border-slate-700 px-1.5 py-0.5 rounded font-semibold text-slate-300">
                {item.weapon}
              </span>
            </div>

            {/* Victim Name */}
            <span className={`font-medium ${item.isPlayerVictim ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
              {item.victim}
            </span>
          </div>
        );
      })}
    </div>
  );
};
