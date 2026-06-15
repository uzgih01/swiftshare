import React, { useState } from "react";
import { ConnectionStatus } from "../types";
import { Copy, Check, LogOut, Radio, Key, Link2 } from "lucide-react";

interface TransferStatusProps {
  roomCode: string;
  role: "initiator" | "receiver" | null;
  status: ConnectionStatus;
  onLeave: () => void;
}

export default function TransferStatus({ roomCode, role, status, onLeave }: TransferStatusProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusDisplay = () => {
    switch (status) {
      case "joining":
        return {
          bg: "bg-amber-950/20 border-amber-900/40 text-amber-300",
          dots: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-ping",
          label: "CONNECTING...",
          desc: "Establishing a secure connection with the main signaling server..."
        };
      case "waiting":
        return {
          bg: "bg-[#0E0E10] border-indigo-900/30 text-indigo-200",
          dots: "bg-indigo-400 shadow-[0_0_8px_#818cf8] animate-pulse",
          label: "WAITING FOR PARTNER TO JOIN...",
          desc: "Ready! Share the code above with your partner. The direct connection will open automatically when they enter this code on their device."
        };
      case "connecting":
        return {
          bg: "bg-indigo-950/20 border-indigo-900/40 text-indigo-300",
          dots: "bg-indigo-400 shadow-[0_0_8px_#5c6bc0] animate-ping",
          label: "HANDSHAKING & PAIRING DEVICES...",
          desc: "Linking your units directly (this only takes a moment)..."
        };
      case "connected":
        return {
          bg: "bg-emerald-950/15 border-emerald-900/40 text-emerald-300",
          dots: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse",
          label: "DIRECT CONNECTION ACTIVE",
          desc: "Your connection is now direct and encrypted. File transfers are direct browser-to-browser and bypass all servers."
        };
      case "disconnected":
        return {
          bg: "bg-zinc-900/40 border-zinc-800 text-zinc-300",
          dots: "bg-zinc-500",
          label: "PARTNER DISCONNECTED",
          desc: "Your partner has closed the session or left the room."
        };
      case "full":
        return {
          bg: "bg-rose-950/20 border-rose-900/40 text-rose-300",
          dots: "bg-rose-500 shadow-[0_0_8px_#ef4444]",
          label: "CONNECTION DENIED: ROOM IS FULL",
          desc: "This room code already has exactly 2 active devices connected. Create a new room code or verify the code is correct."
        };
      case "error":
        return {
          bg: "bg-red-950/20 border-red-900/45 text-rose-300",
          dots: "bg-rose-500 animate-ping",
          label: "HANDSHAKE FAILED",
          desc: "An error occurred during connection. Please make sure both devices have WebRTC enabled and are not blocked by strict corporate firewalls."
        };
      default:
        return {
          bg: "bg-zinc-950 border-zinc-800 text-zinc-400",
          dots: "bg-[#27272A]",
          label: "OFFLINE",
          desc: "Join a room or open a new peer node to start connection diagnostics"
        };
    }
  };

  const current = getStatusDisplay();

  return (
    <div className="w-full bg-[#121214] border border-[#27272A] rounded-xl p-5 shadow-xl flex flex-col gap-4 select-none" id="transfer-status-widget">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#818cf8] font-mono flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            SESSION SHARE CODE
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-bold text-white bg-[#0E0E10] px-3 py-1 rounded border border-[#27272A] flex items-center justify-center tracking-widest">
              {roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              aria-label="Copy code"
              className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-[#1C1C20] border border-[#27272A] bg-[#0E0E10] rounded transition-all cursor-pointer shadow relative group"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" id="copied-icon" /> : <Copy className="w-3.5 h-3.5" id="copy-icon" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {role && (
            <span className={`text-[9px] font-bold py-1 px-2.5 rounded font-mono uppercase tracking-wider border ${
              role === "initiator" ? "bg-indigo-950/40 text-indigo-300 border-indigo-900/40" : "bg-teal-950/40 text-teal-300 border-teal-900/40"
            }`}>
              {role === "initiator" ? "SENDER" : "RECEIVER"}
            </span>
          )}

          <button
            onClick={onLeave}
            className="flex items-center gap-1 text-[9px] text-rose-400 hover:text-white hover:bg-rose-950 hover:border-rose-700 bg-[#0E0E10] border border-[#27272A] px-2.5 py-1.5 rounded font-bold uppercase font-mono tracking-wider transition-all cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>DISCONNECT</span>
          </button>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${current.bg} flex items-start gap-3 transition-all duration-300`}>
        <div className="relative flex items-center justify-center pt-1.5 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full ${current.dots}`} />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <span className="text-xs font-bold font-mono tracking-wider uppercase">
            {current.label}
          </span>
          <span className="text-[11px] text-zinc-400 leading-relaxed font-mono">
            {current.desc}
          </span>
        </div>
      </div>
    </div>
  );
}

