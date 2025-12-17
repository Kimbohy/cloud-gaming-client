// Re-export all WebRTC functionality from the webrtc module
// This file is kept for backward compatibility

export {
  // Types
  type StreamMode,
  type WebRTCSessionInfo,
  type AudioData,
  // Config
  getServerHost,
  getSocketUrl,
  ICE_SERVERS,
  // Classes
  WebRTCManager,
  WebRTCVideoRenderer,
  WebRTCAudioPlayer,
  // API functions
  setStreamMode,
  getStreamMode,
  // ADPCM Decoder
  decodeADPCM,
} from "./webrtc";
