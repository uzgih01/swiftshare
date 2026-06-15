import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Header from "./components/Header";
import RoomSelector from "./components/RoomSelector";
import TransferStatus from "./components/TransferStatus";
import FileSender from "./components/FileSender";
import FileReceiver from "./components/FileReceiver";
import Footer from "./components/Footer";
import { ConnectionStatus, FileTransferMetadata, TransferStats } from "./types";
import { computeSHA256 } from "./utils/crypto";
import { ShieldCheck, Terminal, Cpu, Network, CheckCircle, Wifi, Database } from "lucide-react";

const CHUNK_SIZE = 16384; // 16KB safe browser packet size

export default function App() {
  // Room and signaling states
  const [roomCode, setRoomCode] = useState<string>("");
  const [role, setRole] = useState<"initiator" | "receiver" | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Dynamic activity log entries matching clean design
  const [protocolLogs, setProtocolLogs] = useState<string[]>([
    "System is ready. Waiting for a partner device to connect...",
  ]);

  const addLog = (msg: string) => {
    const time = new Date().toISOString().slice(11, 19);
    setProtocolLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 40));
  };

  // Transfer-specific states
  const [incomingMetadata, setIncomingMetadata] = useState<FileTransferMetadata | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const [senderStats, setSenderStats] = useState<TransferStats>({
    bytesProcessed: 0,
    status: "idle",
    progress: 0,
    speed: 0
  });

  const [receiverStats, setReceiverStats] = useState<TransferStats>({
    bytesProcessed: 0,
    status: "idle",
    progress: 0,
    speed: 0
  });

  // Mutable references to survive React renders and prevent state race conditions
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const roomCodeRef = useRef<string>("");
  const roleRef = useRef<"initiator" | "receiver" | null>(null);
  const incomingMetadataRef = useRef<FileTransferMetadata | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const abortTransferRef = useRef<boolean>(false);

  // Receiver-specific chunk reassembly references
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef<number>(0);
  const receiveStartTimeRef = useRef<number>(0);
  const lastReceiveUpdateRef = useRef<number>(0);

  // Track the ref values to match state
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    incomingMetadataRef.current = incomingMetadata;
  }, [incomingMetadata]);

  // Clean up all connections on unmount
  useEffect(() => {
    return () => {
      cleanupPeerConnection();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const cleanupPeerConnection = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    abortTransferRef.current = false;
  };

  const handleJoinOrCreateRoom = (code: string) => {
    if (!code) return;
    setLoading(true);
    setError("");

    // Cleanup previous triggers
    cleanupPeerConnection();
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    addLog(`Connecting to room: ${code}...`);

    // Connect to signaling websocket
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      addLog("Establishing connection with the signaling server...");
      socket.emit("join-room", code);
    });

    socket.on("room-joined", ({ role: peerRole, roomCode: joinedCode }) => {
      setRoomCode(joinedCode);
      setRole(peerRole);
      setStatus(peerRole === "initiator" ? "waiting" : "connecting");
      setLoading(false);
      addLog(`Joined room ${joinedCode} as ${peerRole === "initiator" ? "Sender" : "Receiver"}.`);
    });

    socket.on("room-full", () => {
      setError("This room has already reached its maximum of 2 devices.");
      setStatus("idle");
      setLoading(false);
      addLog("Connection refused: Room is full.");
      socket.disconnect();
    });

    socket.on("error-msg", (errMsg: string) => {
      setError(errMsg);
      setStatus("idle");
      setLoading(false);
      addLog(`Server connection error: ${errMsg}`);
      socket.disconnect();
    });

    socket.on("room-ready", () => {
      setStatus("connecting");
      addLog("Both devices connected! Exchanging handshake tokens directly...");
      if (roleRef.current === "initiator") {
        initializeWebRTC(true);
      }
    });

    socket.on("signal", async (signalData: any) => {
      try {
        if (!peerConnectionRef.current) {
          await initializeWebRTC(false);
        }

        const pc = peerConnectionRef.current!;

        if (signalData.rtcDescription) {
          addLog("Negotiating secure direct-link protocols...");
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.rtcDescription));

          if (signalData.rtcDescription.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            addLog("Answering connection request...");
            socket.emit("signal", {
              roomCode: roomCodeRef.current,
              signal: { rtcDescription: answer }
            });
          }

          for (const cand of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          pendingCandidatesRef.current = [];
        } else if (signalData.candidate) {
          addLog("Found direct networking route.");
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } else {
            pendingCandidatesRef.current.push(signalData.candidate);
          }
        }
      } catch (err) {
        console.error("Failed to process signaling description/candidate:", err);
        addLog(`Direct coupling failed: ${String(err)}`);
      }
    });

    socket.on("peer-left", () => {
      cleanupPeerConnection();
      setStatus("disconnected");
      setIncomingMetadata(null);
      incomingMetadataRef.current = null;
      setDownloadUrl(null);
      setSenderStats({ bytesProcessed: 0, status: "idle", progress: 0, speed: 0 });
      setReceiverStats({ bytesProcessed: 0, status: "idle", progress: 0, speed: 0 });
      addLog("Partner closed the connection.");
    });

    socket.on("disconnect", () => {
      cleanupPeerConnection();
      setStatus("idle");
      setRoomCode("");
      setRole(null);
      addLog("Signaling server connection closed.");
    });
  };

  const handleLeaveRoom = () => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit("leave-room", roomCode);
      socketRef.current.disconnect();
    }
    cleanupPeerConnection();
    addLog("Reset connection room.");
    setRoomCode("");
    setRole(null);
    setStatus("idle");
    setError("");
    setIncomingMetadata(null);
    incomingMetadataRef.current = null;
    setDownloadUrl(null);
    setSenderStats({ bytesProcessed: 0, status: "idle", progress: 0, speed: 0 });
    setReceiverStats({ bytesProcessed: 0, status: "idle", progress: 0, speed: 0 });
  };

  const initializeWebRTC = async (isInitiator: boolean) => {
    cleanupPeerConnection();
    addLog("Opening direct device-to-device transport line...");

    // Standard public Google STUN servers for NAT punchthrough
    const rtcConfig: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" }
      ]
    };

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        addLog("Generating matching connection paths...");
        socketRef.current.emit("signal", {
          roomCode: roomCodeRef.current,
          signal: { candidate: event.candidate }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      addLog(`Direct route state: ${pc.connectionState}`);
      if (pc.connectionState === "connected") {
        setStatus("connected");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setStatus("disconnected");
      }
    };

    if (isInitiator) {
      addLog("Packaging direct transmission channel...");
      const channel = pc.createDataChannel("swiftshare-transfer-channel", { ordered: true });
      channel.binaryType = "arraybuffer";
      dataChannelRef.current = channel;
      setupDataChannelListeners(channel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      addLog("Exchanged secure handshakes...");
      socketRef.current?.emit("signal", {
        roomCode: roomCodeRef.current,
        signal: { rtcDescription: offer }
      });
    } else {
      addLog("Listening for direct transfers...");
      pc.ondatachannel = (event) => {
        addLog("Channel verified. File transfers enabled.");
        const channel = event.channel;
        channel.binaryType = "arraybuffer";
        dataChannelRef.current = channel;
        setupDataChannelListeners(channel);
      };
    }
  };

  const setupDataChannelListeners = (channel: RTCDataChannel) => {
    try {
      channel.bufferedAmountLowThreshold = 65536; // 64KB low threshold for reliable event firing
    } catch (e) {
      console.warn("Failed to configure buffer threshold:", e);
    }

    channel.onopen = () => {
      addLog("Secure link active and ready for transfers.");
      setStatus("connected");
    };

    channel.onclose = () => {
      addLog("Direct channel closed.");
      if (status === "connected") {
        setStatus("disconnected");
      }
    };

    channel.onmessage = async (event) => {
      try {
        if (typeof event.data === "string") {
          const payload = JSON.parse(event.data);

          if (payload.type === "header") {
            const meta = payload.metadata as FileTransferMetadata;
            addLog(`Incoming file: ${meta.name} (${(meta.size / 1024 / 1024).toFixed(2)} MB)`);
            incomingMetadataRef.current = meta; // Prevent race conditions with incoming binary packets
            setIncomingMetadata(meta);
            setDownloadUrl(null);
            receivedChunksRef.current = [];
            receivedBytesRef.current = 0;
            receiveStartTimeRef.current = Date.now();
            lastReceiveUpdateRef.current = Date.now();

            setReceiverStats({
              bytesProcessed: 0,
              status: "receiving",
              progress: 0,
              speed: 0
            });
          } else if (payload.type === "EOF") {
            const currentMeta = incomingMetadataRef.current;
            if (!currentMeta) {
              console.error("Received completed EOF header but metadata is absent");
              return;
            }
            addLog("File transfer completed. Running secure checksum verification...");
            setReceiverStats(prev => ({
              ...prev,
              status: "hashing",
              progress: 100
            }));

            // Assemble binary slices
            const assembledBlob = new Blob(receivedChunksRef.current, { type: currentMeta.type });
            const computedReceivedHash = await computeSHA256(assembledBlob);

            if (computedReceivedHash === currentMeta.hash) {
              addLog("Success! File verification match. Saving to download pool...");
              const url = URL.createObjectURL(assembledBlob);
              setDownloadUrl(url);
              setReceiverStats(prev => ({
                ...prev,
                bytesProcessed: assembledBlob.size,
                status: "completed",
                progress: 100,
                speed: 0,
                hash: computedReceivedHash,
                verified: true
              }));

              // Instantly trigger dynamic programmatic download
              const downloadLink = document.createElement("a");
              downloadLink.href = url;
              downloadLink.download = currentMeta.name;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
            } else {
              addLog("Error: File checksum verification failed.");
              setReceiverStats(prev => ({
                ...prev,
                status: "error",
                errorMsg: "Verification failed. The reassembled file did not match the original signature."
              }));
            }
          } else if (payload.type === "abort") {
            addLog("The sender cancelled the active transfer.");
            setReceiverStats(prev => ({
              ...prev,
              status: "error",
              errorMsg: "The sender has cancelled the transfer."
            }));
            setIncomingMetadata(null);
            incomingMetadataRef.current = null;
          }
        } else {
          // Robustly handle both ArrayBuffer and Blob packages (highly critical for browser compatibility)
          let buffer: ArrayBuffer;
          if (event.data instanceof ArrayBuffer) {
            buffer = event.data;
          } else if (event.data instanceof Blob) {
            buffer = await event.data.arrayBuffer();
          } else {
            addLog("Error: Unrecognized data format received.");
            return;
          }

          receivedChunksRef.current.push(buffer);
          receivedBytesRef.current += buffer.byteLength;

          const now = Date.now();
          const totalBytes = incomingMetadataRef.current?.size || 1;
          const progressPercent = (receivedBytesRef.current / totalBytes) * 100;
          const elapsedSeconds = (now - receiveStartTimeRef.current) / 1000;
          const bytesPerSec = elapsedSeconds > 0 ? receivedBytesRef.current / elapsedSeconds : 0;

          if (now - lastReceiveUpdateRef.current > 150 || receivedBytesRef.current === totalBytes) {
            setReceiverStats(prev => ({
              ...prev,
              bytesProcessed: receivedBytesRef.current,
              progress: progressPercent,
              speed: bytesPerSec
            }));
            lastReceiveUpdateRef.current = now;
          }
        }
      } catch (err: any) {
        console.error("Receiving data packet processing error:", err);
        addLog(`Transfer interrupted: ${err.message}`);
        setReceiverStats(prev => ({
          ...prev,
          status: "error",
          errorMsg: `Transfer exception: ${err.message}`
        }));
      }
    };
  };

  const handleSendFileStream = async (file: File) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
      setSenderStats(prev => ({
        ...prev,
        status: "error",
        errorMsg: "Cannot start transfer. There is no active connection to your partner device."
      }));
      return;
    }

    abortTransferRef.current = false;
    addLog(`Preparing file and computing security hash: ${file.name}`);
    setSenderStats({
      bytesProcessed: 0,
      status: "hashing",
      progress: 0,
      speed: 0
    });

    try {
      const fileHash = await computeSHA256(file);
      if (abortTransferRef.current) return;

      addLog("Computed file integrity signature.");
      setSenderStats({
        bytesProcessed: 0,
        status: "sending",
        progress: 0,
        speed: 0,
        hash: fileHash
      });

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const dataChannel = dataChannelRef.current;

      addLog(`Sending file headers for ${file.name}...`);
      dataChannel.send(JSON.stringify({
        type: "header",
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          hash: fileHash,
          totalChunks
        }
      }));

      let currentOffset = 0;
      const startTime = Date.now();
      let lastTime = Date.now();
      const bufferedThreshold = 256 * 1024; // 256KB max queue

      addLog("Starting file transfer...");

      const transmitChunks = async () => {
        while (currentOffset < file.size) {
          if (abortTransferRef.current) {
            dataChannel.send(JSON.stringify({ type: "abort" }));
            addLog("Transfer cancelled by user.");
            return;
          }

          if (dataChannel.bufferedAmount > bufferedThreshold) {
            dataChannel.onbufferedamountlow = () => {
              dataChannel.onbufferedamountlow = null;
              transmitChunks();
            };
            return;
          }

          if (dataChannel.readyState !== "open") {
            setSenderStats(prev => ({
              ...prev,
              status: "error",
              errorMsg: "Connection unexpectedly closed while transferring."
            }));
            addLog("Error: Connection lost during transfer.");
            return;
          }

          const end = Math.min(currentOffset + CHUNK_SIZE, file.size);
          const chunkBlob = file.slice(currentOffset, end);

          try {
            const arrayBuffer = await chunkBlob.arrayBuffer();
            dataChannel.send(arrayBuffer);
            currentOffset = end;

            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const currentSpeed = elapsed > 0 ? currentOffset / elapsed : 0;
            const tempPercent = (currentOffset / file.size) * 100;

            if (now - lastTime > 150 || currentOffset === file.size) {
              setSenderStats(prev => ({
                ...prev,
                bytesProcessed: currentOffset,
                progress: tempPercent,
                speed: currentSpeed
              }));
              lastTime = now;
            }

            // Yield to macrotask queue every 16 chunks (256KB) to allow rendering & network pipeline updates
            if (currentOffset % (CHUNK_SIZE * 16) === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          } catch (chunkErr: any) {
            console.error("Chunk reading failure:", chunkErr);
            addLog(`Error reading file data: ${chunkErr.message}`);
            setSenderStats(prev => ({
              ...prev,
              status: "error",
              errorMsg: `Failed to read file: ${chunkErr.message}`
            }));
            return;
          }
        }

        if (currentOffset >= file.size) {
          dataChannel.send(JSON.stringify({ type: "EOF" }));
          addLog("File transfer completed successfully.");
          setSenderStats(prev => ({
            ...prev,
            bytesProcessed: file.size,
            progress: 100,
            status: "completed",
            speed: 0
          }));
        }
      };

      await transmitChunks();

    } catch (hashErr: any) {
      console.error("SHA256 signature error:", hashErr);
      addLog(`Error preparing file: ${hashErr.message}`);
      setSenderStats(prev => ({
        ...prev,
        status: "error",
        errorMsg: `Preparing failed: ${hashErr.message}`
      }));
    }
  };

  const handleAbortStream = () => {
    abortTransferRef.current = true;
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      try {
        dataChannelRef.current.send(JSON.stringify({ type: "abort" }));
      } catch (e) {}
    }
    addLog("Transfer cancelled.");
    setSenderStats(prev => ({
      ...prev,
      status: "idle",
      progress: 0,
      speed: 0
    }));
    setReceiverStats(prev => ({
      ...prev,
      status: "idle",
      progress: 0,
      speed: 0
    }));
    setIncomingMetadata(null);
    incomingMetadataRef.current = null;
    setDownloadUrl(null);
  };

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[#E0E0E6] flex flex-col font-sans selection:bg-indigo-950 selection:text-indigo-200 antialiased" id="swiftshare-app">
      <Header roomCode={roomCode} status={status} />

      <main className="flex-1 w-full flex flex-col justify-center min-h-[calc(100vh-5.5rem)]">
        {roomCode === "" ? (
          // Initial Screen: Room selector centered neatly
          <div className="flex flex-col gap-2 items-center justify-center my-6 py-8 px-4">
            <RoomSelector
              onJoin={handleJoinOrCreateRoom}
              isLoading={loading}
              error={error}
            />
          </div>
        ) : (
          // High-Density Dual Pane Workspace Layout
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUMN A: Activity Logs & Security Info (lg:col-span-4) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              
              {/* ACTIVITY LOG PANEL */}
              <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex flex-col font-mono" id="diagnostic-activity-logs">
                <div className="flex items-center gap-2 border-b border-[#27272A] pb-2 mb-3">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0AA]">Transfer Activity Log</span>
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div className="h-52 overflow-y-auto flex flex-col gap-1 text-[10px] font-mono leading-relaxed text-zinc-400 pr-1 select-text">
                  {protocolLogs.map((log, index) => (
                    <div key={index} className="border-b border-[#27272A]/30 pb-2 pt-1 break-all">
                      <span className="text-zinc-300">{log}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECURITY & PRIVACY SPECS PANEL */}
              <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex flex-col gap-3 font-mono" id="security-privacy-specs">
                <h4 className="text-[10px] font-bold text-[#E0E0E6] flex items-center gap-1.5 border-b border-[#27272A] pb-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  SECURE TRANSFER GUARANTEE
                </h4>
                <div className="flex flex-col gap-3 text-[10px] text-zinc-400 leading-relaxed uppercase">
                  <div className="flex items-start gap-2">
                    <span className="px-1 py-0.5 rounded bg-[#1C1C20] border border-[#27272A] text-[8px] font-bold text-indigo-400">P2P</span>
                      <p className="tracking-tight text-zinc-500">
                      Bypasses cloud servers entirely. Files stream directly between devices.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1 py-0.5 rounded bg-[#1C1C20] border border-[#27272A] text-[8px] font-bold text-indigo-400">E2EE</span>
                    <p className="tracking-tight text-zinc-500">
                      End-to-end encrypted tunnels protect files from external interception.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN B: connected transfer dashboard, ports & controls (lg:col-span-8) */}
            <div className="lg:col-span-8 flex flex-col gap-4 animate-fade-in font-mono">
              
              {/* Active Connection state indicator widget */}
              <TransferStatus
                roomCode={roomCode}
                role={role}
                status={status}
                onLeave={handleLeaveRoom}
              />

              {/* Active Transmitter / Receiver Interface depends on role */}
              <div className="grid grid-cols-1 gap-4">
                {role === "initiator" && (
                  <FileSender
                    stats={senderStats}
                    onSendFile={handleSendFileStream}
                    onCancel={handleAbortStream}
                    disabled={status !== "connected"}
                  />
                )}

                {role === "receiver" && (
                  <FileReceiver
                    stats={receiverStats}
                    incomingMetadata={incomingMetadata}
                    onReject={handleAbortStream}
                    disabled={status !== "connected"}
                    downloadUrl={downloadUrl}
                  />
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

