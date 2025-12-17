import type { StreamMode, KeyMappings } from "@/api/play.api";
import { getKeyDisplayName } from "@/api/play.api";

interface ControlsReferenceProps {
  keyMappings: KeyMappings;
  onOpenConfig: () => void;
}

function ControlsReference({
  keyMappings,
  onOpenConfig,
}: ControlsReferenceProps) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <svg
            className="w-4 h-4 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          CONTROLS
        </h3>
        <button
          onClick={onOpenConfig}
          className="p-1.5 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-purple-300 transition-colors"
          title="Configurer les commandes"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
          <span className="text-slate-400 text-xs font-mono">D-Pad</span>
          <div className="flex gap-1">
            {(["UP", "DOWN", "LEFT", "RIGHT"] as const).map((btn) => (
              <kbd
                key={btn}
                className="px-1.5 py-0.5 bg-slate-700 rounded text-cyan-400 text-xs font-mono"
              >
                {getKeyDisplayName(keyMappings[btn])}
              </kbd>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
          <span className="text-slate-400 text-xs font-mono">A / B</span>
          <div className="flex gap-1">
            <kbd className="px-1.5 py-0.5 bg-fuchsia-600/50 rounded text-white text-xs font-mono">
              {getKeyDisplayName(keyMappings.A)}
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-rose-600/50 rounded text-white text-xs font-mono">
              {getKeyDisplayName(keyMappings.B)}
            </kbd>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
          <span className="text-slate-400 text-xs font-mono">L / R</span>
          <div className="flex gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 text-xs font-mono">
              {getKeyDisplayName(keyMappings.L)}
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 text-xs font-mono">
              {getKeyDisplayName(keyMappings.R)}
            </kbd>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
          <span className="text-slate-400 text-xs font-mono">
            Start / Select
          </span>
          <div className="flex gap-1">
            <kbd className="px-1.5 py-0.5 bg-emerald-600/50 rounded text-white text-xs font-mono">
              {getKeyDisplayName(keyMappings.START)}
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-600/50 rounded text-white text-xs font-mono">
              {getKeyDisplayName(keyMappings.SELECT)}
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StreamModeSelectorProps {
  streamMode: StreamMode;
  isPlaying: boolean;
  onStreamModeChange: (mode: StreamMode) => void;
}

function StreamModeSelector({
  streamMode,
  isPlaying,
  onStreamModeChange,
}: StreamModeSelectorProps) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl backdrop-blur-sm p-4">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
          />
        </svg>
        STREAM MODE
      </h3>

      <div className="space-y-2">
        <button
          onClick={() => onStreamModeChange("websocket")}
          disabled={isPlaying}
          className={`w-full p-2 rounded-lg text-xs font-mono transition-all ${
            streamMode === "websocket"
              ? "bg-cyan-600/50 text-cyan-300 border border-cyan-500/50"
              : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
          } ${isPlaying ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span>WebSocket</span>
            {streamMode === "websocket" && (
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 text-left">
            Standard latency, reliable
          </p>
        </button>

        <button
          onClick={() => onStreamModeChange("webrtc")}
          disabled={isPlaying}
          className={`w-full p-2 rounded-lg text-xs font-mono transition-all ${
            streamMode === "webrtc"
              ? "bg-green-600/50 text-green-300 border border-green-500/50"
              : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
          } ${isPlaying ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span>WebRTC</span>
            {streamMode === "webrtc" && (
              <span className="w-2 h-2 bg-green-400 rounded-full" />
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 text-left">
            Low latency, experimental
          </p>
        </button>
      </div>
    </div>
  );
}

interface SaveStatesButtonProps {
  hasRom: boolean;
  onOpenSaveStates: () => void;
}

function SaveStatesButton({ hasRom, onOpenSaveStates }: SaveStatesButtonProps) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl backdrop-blur-sm p-4">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
        SAVE STATES
      </h3>

      <div className="space-y-2">
        <button
          onClick={onOpenSaveStates}
          disabled={!hasRom}
          className={`group w-full p-2 rounded-lg text-xs font-mono transition-all duration-300 ${
            hasRom
              ? "bg-amber-600/50 text-amber-300 border border-amber-500/50 hover:bg-amber-600/80 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(251,146,60,0.4)]"
              : "bg-slate-800/50 text-white border border-slate-700/50 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              <span>Save / Load</span>
            </div>
            <svg
              className="w-4 h-4 text-white transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <p className="text-[10px] text-white mt-1 text-left">
            Load or save anytime for this ROM.
          </p>
        </button>
      </div>
    </div>
  );
}

interface SidePanelProps {
  keyMappings: KeyMappings;
  streamMode: StreamMode;
  isPlaying: boolean;
  hasRom: boolean;
  onOpenControlsConfig: () => void;
  onStreamModeChange: (mode: StreamMode) => void;
  onOpenSaveStates: () => void;
}

export function SidePanel({
  keyMappings,
  streamMode,
  isPlaying,
  hasRom,
  onOpenControlsConfig,
  onStreamModeChange,
  onOpenSaveStates,
}: SidePanelProps) {
  return (
    <div className="hidden lg:block space-y-4">
      <ControlsReference
        keyMappings={keyMappings}
        onOpenConfig={onOpenControlsConfig}
      />
      <StreamModeSelector
        streamMode={streamMode}
        isPlaying={isPlaying}
        onStreamModeChange={onStreamModeChange}
      />
      <SaveStatesButton hasRom={hasRom} onOpenSaveStates={onOpenSaveStates} />
    </div>
  );
}
