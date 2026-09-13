import React, { useState } from 'react';
import {
  Users,
  Wifi,
  Copy,
  Check,
  Play,
  ArrowRight,
  Shield,
  Smartphone,
  Monitor,
  Globe,
  Radio,
  X,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { GameMode } from '../types';
import { MultiplayerManager, RemotePlayerState } from '../game/multiplayer/MultiplayerManager';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  multiplayerManager: MultiplayerManager;
  onStartMatch: (isHost: boolean, mode: GameMode) => void;
  currentPlatform: 'mobile' | 'pc';
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  multiplayerManager,
  onStartMatch,
  currentPlatform,
}) => {
  const [tab, setTab] = useState<'host' | 'join'>('host');
  const [playerName, setPlayerName] = useState<string>('Operator_1');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<GameMode>('tdm');
  const [hostedRoomCode, setHostedRoomCode] = useState<string>('');
  const [isHosting, setIsHosting] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [connectedPlayers, setConnectedPlayers] = useState<RemotePlayerState[]>([]);

  if (!isOpen) return null;

  const handleCreateHost = async () => {
    setErrorMsg('');
    setIsHosting(true);
    try {
      const code = MultiplayerManager.generateRoomCode();
      setHostedRoomCode(code);
      multiplayerManager.onPlayerJoined = player => {
        setConnectedPlayers(prev => [...prev.filter(p => p.id !== player.id), player]);
      };
      multiplayerManager.onPlayerLeft = id => {
        setConnectedPlayers(prev => prev.filter(p => p.id !== id));
      };
      await multiplayerManager.hostRoom(code, playerName);
      setIsHosting(false);
    } catch (err: any) {
      setErrorMsg(`Failed to host room: ${err?.message || 'Check network'}`);
      setIsHosting(false);
    }
  };

  const handleJoin = async () => {
    if (!roomCodeInput.trim()) {
      setErrorMsg('Please enter a valid 5-character Room Code');
      return;
    }
    setErrorMsg('');
    setIsJoining(true);
    try {
      multiplayerManager.onPlayerJoined = player => {
        setConnectedPlayers(prev => [...prev.filter(p => p.id !== player.id), player]);
      };
      multiplayerManager.onPlayerLeft = id => {
        setConnectedPlayers(prev => prev.filter(p => p.id !== id));
      };
      await multiplayerManager.joinRoom(roomCodeInput.trim(), playerName);
      setIsJoining(false);
      onStartMatch(false, selectedMode);
    } catch (err: any) {
      setErrorMsg(`Could not connect to room [${roomCodeInput}]. Ensure host has created the room.`);
      setIsJoining(false);
    }
  };

  const copyRoomCode = () => {
    if (!hostedRoomCode) return;
    navigator.clipboard.writeText(hostedRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black font-mono uppercase text-white tracking-wider">
                LAN & Online Multiplayer
              </h2>
              <p className="text-[10px] font-mono text-slate-400">
                Cross-device peer-to-peer combat (Mobile & PC)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-800 bg-slate-900/30">
          <button
            onClick={() => {
              setTab('host');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'host'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Host Match</span>
          </button>
          <button
            onClick={() => {
              setTab('join');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'join'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Join Room</span>
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Operator Call-sign */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center justify-between">
              <span>Operator Call-Sign</span>
              <span className="text-cyan-400 text-[10px] flex items-center gap-1">
                {currentPlatform === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                {currentPlatform === 'mobile' ? 'Mobile Touch Device' : 'Desktop PC'}
              </span>
            </label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={16}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              placeholder="Enter your name"
            />
          </div>

          {tab === 'host' ? (
            /* HOST ROOM PANEL */
            <div className="space-y-4">
              {/* Game Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                  Select Game Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'tdm' as GameMode, name: 'Team Deathmatch', desc: '5v5 Tactical Squad Battle' },
                    { id: 'battleroyale' as GameMode, name: 'Bermuda Battle Royale', desc: 'Survival & Safe Zone' },
                    { id: 'freeforall' as GameMode, name: 'Free For All', desc: 'Solo Ballistic Combat' },
                    { id: 'training' as GameMode, name: 'Firing Range Co-Op', desc: 'Target DPS Practice' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMode(m.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedMode === m.id
                          ? 'bg-cyan-950/40 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold">{m.name}</div>
                      <div className="text-[9.5px] text-slate-500 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {!hostedRoomCode ? (
                <button
                  onClick={handleCreateHost}
                  disabled={isHosting}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-black font-mono font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>{isHosting ? 'Creating Lobby...' : 'Host Match & Generate Room Code'}</span>
                </button>
              ) : (
                /* HOSTED LOBBY DETAILS */
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Room Code (Share with friends)</span>
                      <div className="text-3xl font-mono font-black text-white tracking-widest mt-0.5">
                        {hostedRoomCode}
                      </div>
                    </div>
                    <button
                      onClick={copyRoomCode}
                      className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Connected Roster */}
                  <div className="space-y-1.5 pt-2 border-t border-cyan-500/20">
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
                      <span>Players in Lobby ({connectedPlayers.length + 1})</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> P2P Ready
                      </span>
                    </div>

                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/40 border border-cyan-400/30 text-xs font-mono text-cyan-300">
                        <span className="font-bold">{playerName} (Host - You)</span>
                        <span className="text-[10px] text-cyan-400 uppercase">{currentPlatform}</span>
                      </div>
                      {connectedPlayers.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/40 border border-slate-800 text-xs font-mono text-white">
                          <span>{p.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                            {p.platform === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                            {p.platform}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onStartMatch(true, selectedMode)}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-mono font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer mt-2"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Start Match with Squad</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* JOIN ROOM PANEL */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                  Enter 5-Digit Room Code
                </label>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-2xl font-mono font-black tracking-widest text-center text-cyan-400 placeholder-slate-700 focus:outline-none focus:border-cyan-500 uppercase"
                  placeholder="EX: 4K8Z2"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                <div className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cross-Device Multiplayer Instructions:</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  1. Have Device 1 (PC or Mobile) click <b>Host Match</b> to get a Room Code.
                </p>
                <p className="text-[10px] text-slate-400">
                  2. On Device 2 (Phone, Tablet, Laptop), enter the 5-digit Room Code above and click <b>Join & Connect</b>.
                </p>
              </div>

              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-black font-mono font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>{isJoining ? 'Connecting to Room...' : 'Connect & Join Room'}</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
