/**
 * WebRTC API Module
 *
 * This module provides WebRTC functionality for low-latency game streaming.
 * It includes:
 * - WebRTCManager: Main connection manager for signaling and peer connections
 * - WebRTCVideoRenderer: Renders video streams to canvas
 * - WebRTCAudioPlayer: Plays audio from data channels or media streams
 * - Stream mode API functions for controlling streaming modes
 */

// Export types and configuration
export type { StreamMode, WebRTCSessionInfo } from "./config";
export { getServerHost, getSocketUrl, ICE_SERVERS, BUTTON_MAP } from "./config";

// Export ADPCM decoder
export { decodeADPCM } from "./adpcm-decoder";

// Export main classes
export { WebRTCManager } from "./webrtc-manager";
export { WebRTCVideoRenderer } from "./webrtc-video-renderer";
export { WebRTCAudioPlayer } from "./webrtc-audio-player";

// Export API functions
export { setStreamMode, getStreamMode } from "./stream-mode-api";
