import React from "react";
import { Zap, Shield, Radio, Layers } from "lucide-react";
import { ConnectionStatus } from "../types";

interface HeaderProps {
  roomCode?: string;
  status?: ConnectionStatus;
}

export default function Header({ roomCode, status = "idle" }: HeaderProps) {
  const isSignalingConnected = status !== "idle" && status !== "error";

  return (
    <header className="h-14 border-b border-[#27272A] bg-[#121214] flex items-center justify-between px-6 shrink-0 sticky top-0 z-50 select-none" id="app-header">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-900/40 text-xs tracking-wider">
          P2P
        </div>
        <div>
          <h1 className="text-xs font-bold tracking-widest uppercase text-[#E0E0E6] flex items-center gap-1.5 leading-none" id="brand-title">
            SWIFTSHARE
          </h1>
          <p className="text-[9px] text-[#A0A0AA] tracking-tighter mt-0.5 font-mono uppercase" id="brand-subtitle">Direct Peer-to-Peer Transfer</p>
        </div>
      </div>

      <div className="flex items-center space-x-6 text-[11px] font-medium font-mono text-[#E0E0E6]">
        {/* Signaling Node Stat */}
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${
            isSignalingConnected
              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
              : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
          }`}></span>
          <span className="uppercase opacity-70 text-[10px] tracking-tight">
            SIGNAL: {isSignalingConnected ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>

        {/* Room Code Badge */}
        {roomCode && (
          <div className="hidden sm:flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="uppercase opacity-70 text-[10px] tracking-tight">
              ROOM: <span className="text-indigo-300 font-bold">{roomCode}</span>
            </span>
          </div>
        )}

        {/* Security Indicator */}
        <div className="px-2.5 py-0.5 bg-[#1C1C20] border border-[#27272A] rounded text-[9px] text-zinc-400 font-mono uppercase" id="badge-security-status">
          {isSignalingConnected ? "SECURE TUNNEL" : "DISCONNECTED"}
        </div>
      </div>
    </header>
  );
}

