import React from 'react';
import { KillFeedItem } from '../types';
import { Crosshair } from 'lucide-react';

interface KillfeedProps {
  items: KillFeedItem[];
}

export const Killfeed: React.FC<KillfeedProps> = ({ items }) => {
  const visibleItems = items.slice(-6).reverse();

  return (
    <div id="killfeed-container" className="flex flex-col gap-1 items-end select-none pointer-events-none">
      {visibleItems.map(item => (
        <div
          key={item.id}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-sm text-[11px] font-mono tracking-wide border transition-all backdrop-blur-md ${
            item.isPlayerKiller
              ? 'bg-[#131910]/90 border-[#A3E635]/40 text-zinc-100'
              : item.isPlayerVictim
              ? 'bg-[#1F1012]/90 border-red-500/40 text-zinc-100'
              : 'bg-[#0C0E12]/80 border-white/10 text-zinc-300'
          }`}
        >
          <span
            className={`font-semibold ${
              item.isPlayerKiller ? 'text-[#A3E635]' : 'text-sky-400'
            }`}
          >
            {item.killer}
          </span>

          <div className="flex items-center gap-1 text-zinc-400">
            {item.isHeadshot && <Crosshair className="w-3 h-3 text-red-400" />}
            <span className="uppercase text-[9px] text-zinc-400 font-semibold tracking-wider">
              [{item.weapon}]
            </span>
          </div>

          <span
            className={`font-semibold ${
              item.isPlayerVictim ? 'text-red-400' : 'text-red-400/90'
            }`}
          >
            {item.victim}
          </span>
        </div>
      ))}
    </div>
  );
};
