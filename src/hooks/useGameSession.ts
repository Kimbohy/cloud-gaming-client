import { useState, useCallback } from "react";
import {
  createGameSession,
  startGameSession,
  stopGameSession,
  PlayApiError,
  type StreamMode,
} from "@/api/play.api";
import { setStreamMode as setServerStreamMode } from "@/api/webrtc.api";

interface ErrorState {
  message: string;
  isNetworkError: boolean;
}

export function useGameSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<ErrorState | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>("websocket");

  const createSession = useCallback(async (rom: string, mode: StreamMode) => {
    try {
      setError(null);
      setStatus("Creating...");
      const data = await createGameSession(rom, mode);
      setSessionId(data.sessionId);
      setStatus("Created");
      return data.sessionId;
    } catch (err) {
      if (err instanceof PlayApiError) {
        setError({
          message: err.message,
          isNetworkError: err.isNetworkError,
        });
      } else {
        setError({
          message:
            err instanceof Error ? err.message : "Failed to create session",
          isNetworkError: false,
        });
      }
      setStatus("Error");
      return null;
    }
  }, []);

  const startSession = useCallback(async (sid: string) => {
    try {
      setStatus("Starting...");
      await startGameSession(sid);
      setStatus("Playing");
    } catch (err) {
      if (err instanceof PlayApiError) {
        setError({ message: err.message, isNetworkError: err.isNetworkError });
      } else {
        setError({
          message:
            err instanceof Error ? err.message : "Failed to start emulation",
          isNetworkError: false,
        });
      }
      setStatus("Error");
    }
  }, []);

  const stopSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setStatus("Stopping...");
      await stopGameSession(sessionId);
      setSessionId(null);
      setStatus("Ready");
    } catch (err) {
      if (err instanceof PlayApiError) {
        setError({ message: err.message, isNetworkError: err.isNetworkError });
      } else {
        setError({
          message:
            err instanceof Error ? err.message : "Failed to stop emulation",
          isNetworkError: false,
        });
      }
    }
  }, [sessionId]);

  const changeStreamMode = useCallback(
    async (newMode: StreamMode) => {
      setStreamMode(newMode);
      if (sessionId) {
        const result = await setServerStreamMode(sessionId, newMode);
        if (!result.success) {
          return false;
        }
        return true;
      }
      return true;
    },
    [sessionId]
  );

  return {
    sessionId,
    status,
    error,
    streamMode,
    createSession,
    startSession,
    stopSession,
    changeStreamMode,
    isPlaying: status === "Playing",
  };
}
