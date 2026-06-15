import React from "react";
import { ShieldCheck, Cpu } from "lucide-react";

export default function Footer() {
  return (
    <footer className="h-8 bg-[#0C0C0E] border-t border-[#27272A] flex items-center px-6 justify-between text-[10px] text-zinc-500 font-mono tracking-wider select-none shrink-0" id="app-footer">
      <div className="flex items-center space-x-4">
        <span className="hidden sm:inline">Direct Peer-to-Peer</span>
        <span className="text-[#818cf8] flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          End-to-End Encrypted
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-emerald-500 font-semibold uppercase flex items-center gap-1.5" id="secure-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span>
          Secure Connection Active
        </span>
      </div>
    </footer>
  );
}

