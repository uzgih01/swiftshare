import React from "react";
import { formatBytes, formatSpeed } from "../utils/crypto";
import { TransferStats, FileTransferMetadata } from "../types";
import { Download, File, Disc, ShieldCheck, DownloadCloud } from "lucide-react";

interface FileReceiverProps {
  stats: TransferStats;
  incomingMetadata: FileTransferMetadata | null;
  onReject: () => void;
  disabled: boolean;
  downloadUrl: string | null;
}

export default function FileReceiver({
  stats,
  incomingMetadata,
  onReject,
  disabled,
  downloadUrl
}: FileReceiverProps) {
  const isReceiving = stats.status === "receiving";
  const isHashing = stats.status === "hashing";
  const isCompleted = stats.status === "completed";
  const isError = stats.status === "error";

  return (
    <div className="w-full bg-[#121214] border border-[#27272A] rounded-xl p-5 shadow-xl flex flex-col gap-5 select-none" id="file-receiver-widget">
      <div className="flex flex-col gap-1 border-b border-[#27272A] pb-3 font-mono" id="receiver-header">
        <h3 className="text-xs uppercase tracking-widest text-[#2dd4bf] font-bold flex items-center gap-2">
          <Download className="w-4 h-4 text-teal-400" />
          Receive a File
        </h3>
        <p className="text-[10px] text-zinc-400 uppercase mt-0.5">Receive files directly from connected partner without intermediates.</p>
      </div>

      {disabled ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#27272A] bg-[#0E0E10] p-8 text-center rounded-xl font-mono" id="receiver-offline-card">
          <div className="p-3 bg-[#121214] text-zinc-600 rounded border border-[#27272A] mb-3">
            <Download className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold uppercase text-zinc-500">WAITING FOR PARTNER</p>
          <p className="text-[10px] text-zinc-600 mt-1 uppercase">Awaiting direct communication channel establishment...</p>
        </div>
      ) : !incomingMetadata ? (
        // Active connected but waiting for transfer setup
        <div className="flex flex-col items-center justify-center border border-[#27272A] bg-[#0E0E10] p-8 text-center rounded-xl relative overflow-hidden group font-mono" id="receiver-waiting-card">
          <div className="p-3 bg-[#121214] text-[#2dd4bf] rounded border border-[#27272A] mb-3">
            <Disc className="w-5 h-5 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <span className="text-xs font-bold text-[#E0E0E6] uppercase">DIRECT CONNECTION ESTABLISHED</span>
          <p className="text-[10px] text-zinc-500 mt-2 max-w-sm uppercase leading-relaxed">
            Connected directly. Waiting for sender to select and share a file...
          </p>
        </div>
      ) : (
        // Active file is incoming or done
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-[#0E0E10] rounded-lg border border-[#27272A] font-mono">
            <div className="p-2.5 bg-[#121214] text-teal-400 rounded border border-[#27272A] flex items-center justify-center">
              <File className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-[9px] text-[#2dd4bf] bg-teal-950/40 border border-teal-900/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider w-max">
                RECEIVING DIRECT
              </span>
              <span className="text-xs font-bold text-[#E0E0E6] truncate block uppercase">
                {incomingMetadata.name}
              </span>
              <span className="text-[10px] text-zinc-500 block">
                {incomingMetadata.type || "GENERIC_STREAM"} • {formatBytes(incomingMetadata.size)}
              </span>
            </div>
          </div>

          <div className="p-4 border border-[#27272A] bg-[#0E0E10] rounded-lg flex flex-col gap-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 animate-spin text-teal-400" style={{ animationDuration: isReceiving ? "2.5s" : "0s" }} />
                {isReceiving && "RECEIVING FILE..."}
                {isHashing && "VERIFYING FILE INTEGRITY..."}
                {isCompleted && "FILE RECEIVED!"}
                {isError && "TRANSFER INTERRUPTED"}
              </span>
              <span className="text-xs font-bold text-white px-1.5 py-0.5 bg-[#121214] border border-[#27272A] rounded">
                {Math.floor(stats.progress)}%
              </span>
            </div>

            {/* Progress Slider */}
            <div className="w-full bg-[#121214] border border-[#27272A] h-2 rounded overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  isError ? "bg-rose-500" : isCompleted ? "bg-emerald-500 shadow-[0_0_8px_#34d399]" : "bg-teal-500 shadow-[0_0_8px_#2dd4bf]"
                }`}
                style={{ width: `${stats.progress}%` }}
              />
            </div>

            {/* Transfer Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-[10px]">
              <div className="p-2.5 bg-[#121214] border border-[#27272A] rounded flex flex-col">
                <span className="text-zinc-500 uppercase font-medium">RECEIVED</span>
                <span className="font-bold text-[#E0E0E6] mt-0.5">
                  {formatBytes(stats.bytesProcessed)} / {formatBytes(incomingMetadata.size)}
                </span>
              </div>
              {isReceiving && (
                <div className="p-2.5 bg-[#121214] border border-[#27272A] rounded flex flex-col">
                  <span className="text-zinc-500 uppercase font-medium">SPEED</span>
                  <span className="font-bold text-teal-400 mt-0.5">
                    {formatSpeed(stats.speed)}
                  </span>
                </div>
              )}
              {incomingMetadata.hash && (
                <div className="col-span-2 md:col-span-1 p-2.5 bg-[#121214] border border-[#27272A] rounded flex flex-col justify-center">
                  <span className="text-zinc-500 uppercase font-medium">EXPECTED CHECKSUM</span>
                  <span className="font-bold text-teal-400 truncate mt-0.5" title={incomingMetadata.hash}>
                    {incomingMetadata.hash}
                  </span>
                </div>
              )}
            </div>

            {stats.errorMsg && (
              <div className="flex items-center gap-1.5 text-[10px] text-rose-300 bg-rose-950/20 border border-rose-900/40 p-2.5 rounded">
                <span>{stats.errorMsg}</span>
              </div>
            )}

            {isCompleted && (
              <div className="flex flex-col gap-2 p-3 bg-emerald-950/20 border border-emerald-900/40 rounded">
                <div className="flex items-center gap-2 text-[10px] text-emerald-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>FILE INTEGRITY SECURELY VERIFIED</span>
                </div>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={incomingMetadata.name}
                    className="mt-1 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer border border-emerald-500/30"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Save File to Device</span>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end border-t border-[#27272A] pt-3 font-mono">
            {(isReceiving || isHashing) && (
              <button
                onClick={onReject}
                className="px-3.5 py-1.5 text-[10px] uppercase font-bold text-rose-400 hover:text-white hover:bg-rose-950 border border-rose-900/40 rounded transition-colors cursor-pointer"
              >
                Cancel Stream
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

