import React, { useState } from "react";
import { Users, LogIn, PlusCircle, ArrowRight, ShieldAlert, Cpu } from "lucide-react";

interface RoomSelectorProps {
  onJoin: (roomCode: string) => void;
  isLoading: boolean;
  error?: string;
}

export default function RoomSelector({ onJoin, isLoading, error }: RoomSelectorProps) {
  const [inputCode, setInputCode] = useState("");

  const handleGenerateRoom = () => {
    // Generate a secure 6-letter room code (ex: SWFF92)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    onJoin(code);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = inputCode.trim().toUpperCase();
    if (sanitized.length > 0) {
      onJoin(sanitized);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-2xl flex flex-col gap-6 my-8 select-none" id="room-selector-card">
      <div className="flex flex-col gap-1.5 text-center sm:text-left border-b border-[#27272A] pb-4" id="room-selector-header">
        <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-mono font-bold">Direct File Transfer</h2>
        <h3 className="text-lg font-bold text-[#E0E0E6] mt-1 leading-none">Connect Devices Directly</h3>
        <p className="text-[11px] text-zinc-400 mt-2 font-mono leading-relaxed uppercase">
          Transfer files directly between devices. Your shared files never touch any external server.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-950/40 border border-red-900/50 rounded-lg text-rose-300 text-[11px] font-mono leading-relaxed flex items-center gap-2" id="room-selector-error">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-500 animate-pulse" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Generate Room Button */}
        <button
          onClick={handleGenerateRoom}
          disabled={isLoading}
          className="flex flex-col items-center justify-center p-5 bg-[#0E0E10] hover:bg-[#16161A] border border-[#27272A] hover:border-[#3F3F46] rounded-xl group transition-all text-center cursor-pointer disabled:opacity-50"
          id="btn-create-room"
        >
          <div className="p-2.5 bg-[#121214] text-indigo-400 rounded-lg mb-3 group-hover:scale-105 transition-transform border border-[#27272A] shadow-lg">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs uppercase text-[#E0E0E6] font-mono tracking-wider">Create Room</span>
          <span className="text-[10px] text-indigo-400/70 font-mono mt-1">Get an instant share code</span>
        </button>

        {/* Join Room Form */}
        <div className="p-5 bg-[#0E0E10] border border-[#27272A] rounded-xl flex flex-col justify-center">
          <span className="font-bold text-xs uppercase font-mono tracking-wider text-zinc-400 mb-3 block text-center sm:text-left">Use Share Code</span>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="ENTER SHARE CODE"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={12}
              className="w-full text-center tracking-widest placeholder:tracking-normal px-3 py-2 bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] focus:border-indigo-500 rounded-lg text-xs font-mono focus:outline-none transition-all uppercase text-white"
            />
            <button
              type="submit"
              disabled={isLoading || !inputCode.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#16161A] disabled:text-zinc-600 text-white font-bold font-mono text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer border border-indigo-500/30"
            >
              <span>{isLoading ? "WAITING..." : "CONNECT"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-[#27272A] pt-4" id="how-it-works-panel">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5 justify-center font-mono">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          HOW IT WORKS
        </h4>
        <ol className="grid grid-cols-3 gap-2 text-[9px] text-zinc-400 font-mono leading-relaxed text-center">
          <li className="flex flex-col items-center p-2 rounded-lg bg-[#0E0E10] border border-[#27272A]/40">
            <span className="w-4 h-4 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center mb-1 text-[9px]">1</span>
            <span>Create a room or enter shared code</span>
          </li>
          <li className="flex flex-col items-center p-2 rounded-lg bg-[#0E0E10] border border-[#27272A]/40">
            <span className="w-4 h-4 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center mb-1 text-[9px]">2</span>
            <span>Select file to transfer</span>
          </li>
          <li className="flex flex-col items-center p-2 rounded-lg bg-[#0E0E10] border border-[#27272A]/40">
            <span className="w-4 h-4 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center mb-1 text-[9px]">3</span>
            <span>Transfer file directly device-to-device</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

