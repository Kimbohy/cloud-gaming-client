// WebRTC Module - Re-exports all WebRTC functionality

// Types
export type { StreamMode, WebRTCSessionInfo, AudioData } from "./types";

// Config
export { getServerHost, getSocketUrl, ICE_SERVERS } from "./config";

// Classes
export { WebRTCManager } from "./webrtc-manager";
export { WebRTCVideoRenderer } from "./video-renderer";
export { WebRTCAudioPlayer } from "./audio-player";

// API functions
export { setStreamMode, getStreamMode } from "./stream-api";

// ADPCM Decoder (if needed externally)
export { decodeADPCM } from "./adpcm-decoder";
