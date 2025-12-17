/**
 * WebRTC API - Re-exports from modular structure
 *
 * This file maintains backward compatibility by re-exporting all modules
 * from the new webrtc/ directory structure.
 *
 * The code has been split into:
 * - webrtc/config.ts - Configuration and types
 * - webrtc/adpcm-decoder.ts - ADPCM audio decoding
 * - webrtc/webrtc-manager.ts - Main WebRTC connection manager
 * - webrtc/webrtc-video-renderer.ts - Video rendering
 * - webrtc/webrtc-audio-player.ts - Audio playback
 * - webrtc/stream-mode-api.ts - Stream mode API functions
 */

export * from "./webrtc";
