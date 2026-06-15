export type ConnectionStatus = "idle" | "joining" | "waiting" | "connecting" | "connected" | "disconnected" | "full" | "error";

export interface FileTransferMetadata {
  name: string;
  size: number;
  type: string;
  hash: string;
  totalChunks: number;
}

export interface TransferStats {
  bytesProcessed: number;
  status: "idle" | "hashing" | "sending" | "receiving" | "completed" | "error";
  progress: number; // percentage (0 - 100)
  speed: number;    // bytes per second
  errorMsg?: string;
  hash?: string;
  verified?: boolean;
}
