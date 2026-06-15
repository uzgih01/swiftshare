import React, { useState, useRef } from "react";
import { formatBytes, formatSpeed } from "../utils/crypto";
import { TransferStats } from "../types";
import { Upload, File, ArrowUpRight, CheckCircle2, AlertCircle, Disc, Layers } from "lucide-react";

interface FileSenderProps {
  stats: TransferStats;
  onSendFile: (file: File) => void;
  onCancel: () => void;
  disabled: boolean;
}

export default function FileSender({ stats, onSendFile, onCancel, disabled }: FileSenderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleResetFile = () => {
    if (stats.status === "sending" || stats.status === "hashing") return;
    setSelectedFile(null);
    onCancel();
  };

  const handleUploadClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleStartSend = () => {
    if (selectedFile) {
      onSendFile(selectedFile);
    }
  };

  const isIdle = stats.status === "idle";
  const isHashing = stats.status === "hashing";
  const isSending = stats.status === "sending";
  const isCompleted = stats.status === "completed";
  const isError = stats.status === "error";

  return (
    <div className="w-full bg-[#121214] border border-[#27272A] rounded-xl p-5 shadow-xl flex flex-col gap-5 select-none" id="file-sender-widget">
      <div className="flex flex-col gap-1 border-b border-[#27272A] pb-3" id="sender-header">
        <h3 className="text-xs uppercase tracking-widest text-indigo-400 font-mono font-bold flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-400" />
          Send a File
        </h3>
        <p className="text-[10px] text-zinc-400 font-mono uppercase mt-0.5">Your files are sent directly to your partner through a secure channel.</p>
      </div>

      {!selectedFile ? (
        // Drag and Drop Zone
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-indigo-500 bg-[#16161C]"
              : "border-[#27272A] hover:border-[#3F3F46] bg-[#0E0E10] hover:bg-[#121214]"
          } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
          <div className="p-3 bg-[#121214] text-indigo-400 rounded-lg border border-[#27272A] shadow-lg">
            <Upload className="w-6 h-6" />
          </div>
          <div className="font-mono">
            <p className="text-xs font-bold uppercase text-[#E0E0E6]">
              {disabled ? "WAITING FOR PARTNER TO CONNECT" : "DRAG AND DROP OR CLICK TO CHOOSE A FILE"}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase">Supports direct offline transfer for files of any size</p>
          </div>
        </div>
      ) : (
        // File Selected Interface
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-[#0E0E10] rounded-lg border border-[#27272A]">
            <div className="p-2.5 bg-[#121214] text-indigo-400 rounded border border-[#27272A] flex items-center justify-center">
              <File className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1 font-mono">
              <span className="text-xs font-bold text-[#E0E0E6] truncate block uppercase">
                {selectedFile.name}
              </span>
              <span className="text-[10px] text-zinc-500 block">
                {selectedFile.type || "GENERIC_STREAM"} • {formatBytes(selectedFile.size)}
              </span>
            </div>
            {!isSending && !isHashing && !isCompleted && (
              <button
                onClick={handleResetFile}
                className="text-[10px] font-mono uppercase font-bold text-rose-400 hover:text-rose-300 px-2 py-1 bg-[#121214] border border-[#27272A] hover:border-rose-900 rounded transition-all"
              >
                Change
              </button>
            )}
          </div>

          {/* Transfer Execution Status */}
          {(isHashing || isSending || isCompleted || isError) && (
            <div className="p-4 border border-[#27272A] bg-[#0E0E10] rounded-lg flex flex-col gap-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5 animate-spin text-indigo-400" style={{ animationDuration: isSending ? "2s" : "0s" }} />
                  {isHashing && "PREPARING FILE..."}
                  {isSending && "SENDING FILE..."}
                  {isCompleted && "FILE SENT SUCCESSFULLY!"}
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
                    isError ? "bg-rose-500" : isCompleted ? "bg-emerald-500 shadow-[0_0_8px_#34d399]" : "bg-indigo-500 shadow-[0_0_8px_#818cf8]"
                  }`}
                  style={{ width: `${stats.progress}%` }}
                />
              </div>

              {/* Transfer Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-[10px]">
                <div className="p-2.5 bg-[#121214] border border-[#27272A] rounded flex flex-col">
                  <span className="text-zinc-500 uppercase font-medium">SENT</span>
                  <span className="font-bold text-[#E0E0E6] mt-0.5">
                    {formatBytes(stats.bytesProcessed)} / {formatBytes(selectedFile.size)}
                  </span>
                </div>
                {isSending && (
                  <div className="p-2.5 bg-[#121214] border border-[#27272A] rounded flex flex-col">
                    <span className="text-zinc-500 uppercase font-medium">SPEED</span>
                    <span className="font-bold text-emerald-400 mt-0.5">
                      {formatSpeed(stats.speed)}
                    </span>
                  </div>
                )}
                {stats.hash && (
                  <div className="col-span-2 md:col-span-1 p-2.5 bg-[#121214] border border-[#27272A] rounded flex flex-col justify-center">
                    <span className="text-zinc-500 uppercase font-medium">CHECKSUM FOOTPRINT</span>
                    <span className="font-bold text-indigo-400 truncate mt-0.5" title={stats.hash}>
                      {stats.hash}
                    </span>
                  </div>
                )}
              </div>

              {stats.errorMsg && (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-300 bg-rose-950/20 border border-rose-900/40 p-2.5 rounded">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{stats.errorMsg}</span>
                </div>
              )}

              {isCompleted && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-300 bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                  <span>FILE INTEGRITY VERIFIED: Shared file matches original exactly.</span>
                </div>
              )}
            </div>
          )}

          {/* Action Footer Button */}
          <div className="flex items-center gap-2 justify-end border-t border-[#27272A] pt-3 font-mono">
            {(isSending || isHashing) && (
              <button
                onClick={onCancel}
                className="px-3.5 py-1.5 text-[10px] uppercase font-bold text-rose-400 hover:text-white hover:bg-rose-950 border border-rose-900/40 hover:border-rose-800 rounded transition-colors cursor-pointer"
              >
                Cancel Transfer
              </button>
            )}
            {isIdle && (
              <button
                onClick={handleStartSend}
                disabled={disabled}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#0E0E10] disabled:text-zinc-600 disabled:border-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-500/30"
              >
                <span>Send File</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {isCompleted && (
              <button
                onClick={handleResetFile}
                className="px-4 py-2 bg-[#0E0E10] hover:bg-[#16161A] border border-[#27272A] text-white font-bold text-xs uppercase rounded flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Send Another File</span>
              </button>
            )}
            {isError && (
              <button
                onClick={handleResetFile}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Reset Sender</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

