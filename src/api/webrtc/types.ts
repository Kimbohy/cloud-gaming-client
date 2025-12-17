// WebRTC Types

export type StreamMode = "websocket" | "webrtc" | "both";

export interface WebRTCSessionInfo {
  sessionId: string;
  offer: RTCSessionDescriptionInit;
}

export interface AudioData {
  samples: Int16Array;
  sampleRate: number;
  channels: number;
}
