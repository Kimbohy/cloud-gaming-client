import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type StreamMode } from "@/api/play.api";

interface GameControlBarProps {
  status: string;
  isPlaying: boolean;
  sessionId: string | null;
  streamMode: StreamMode;
  isMobile?: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleFullscreen?: () => void;
  onStreamModeChange: (mode: StreamMode) => void;
}

export function GameControlBar({
  status,
  isPlaying,
  sessionId,
  streamMode,
  isMobile = false,
  onStart,
  onStop,
  onToggleFullscreen,
  onStreamModeChange,
}: GameControlBarProps) {
  const handleStreamModeToggle = () => {
    onStreamModeChange(streamMode === "websocket" ? "webrtc" : "websocket");
  };

  return (
    <div
      className={`${
        isMobile ? "mt-1.5" : "mt-3 md:mt-4"
      } flex items-center justify-between gap-2 md:gap-4`}
    >
      <div className="flex items-center gap-2">
        <Badge
          className={`font-mono text-[9px] md:text-xs px-1.5 py-0.5 ${
            isPlaying
              ? "bg-green-500/20 text-green-300 border-green-500/50"
              : status === "Error"
              ? "bg-red-500/20 text-red-300 border-red-500/50"
              : "bg-slate-500/20 text-slate-300 border-slate-500/50"
          }`}
        >
          {status.toUpperCase()}
        </Badge>
      </div>

      <div className="flex gap-1">
        {/* Stream Mode Toggle - Mobile */}
        {isMobile && (
          <Button
            onClick={handleStreamModeToggle}
            disabled={isPlaying}
            size="sm"
            className={`font-bold px-1.5 py-1 rounded h-6 ${
              streamMode === "webrtc"
                ? "bg-green-600 hover:bg-green-500"
                : "bg-cyan-600 hover:bg-cyan-500"
            } text-white disabled:opacity-40`}
            title={`Mode: ${streamMode.toUpperCase()}`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {streamMode === "webrtc" ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              )}
            </svg>
          </Button>
        )}

        {/* Fullscreen Button - Mobile */}
        {isMobile && sessionId && onToggleFullscreen && (
          <Button
            onClick={onToggleFullscreen}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-1.5 py-1 rounded h-6"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </Button>
        )}

        <Button
          onClick={onStart}
          disabled={!!sessionId}
          size="sm"
          className={`bg-green-600 hover:bg-green-500 text-white font-bold rounded disabled:opacity-40 ${
            isMobile ? "px-1.5 py-1 h-6" : "px-3 md:px-4 py-2"
          }`}
        >
          <svg
            className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4 md:mr-2"}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="hidden md:inline">START</span>
        </Button>

        <Button
          onClick={onStop}
          disabled={!sessionId}
          size="sm"
          className={`bg-red-600 hover:bg-red-500 text-white font-bold rounded disabled:opacity-40 ${
            isMobile ? "px-1.5 py-1 h-6" : "px-3 md:px-4 py-2"
          }`}
        >
          <svg
            className={isMobile ? "w-3 h-3" : "w-4 h-4 md:mr-2"}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
          <span className="hidden md:inline">STOP</span>
        </Button>
      </div>
    </div>
  );
}
