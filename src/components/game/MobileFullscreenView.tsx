import { TouchButton } from "./TouchButton";
import { InlineSavePanel } from "./InlineSavePanel";
import { type InputButton, type StreamMode } from "@/api/play.api";
import { type SaveStateMetadata } from "@/api/saveStates.api";

interface MobileFullscreenViewProps {
  showControls: boolean;
  showInlineSavePanel: boolean;
  streamMode: StreamMode;
  hasRom: boolean;
  saveStates: SaveStateMetadata[];
  saveLoading: string | null;
  onInput: (button: InputButton, state: "down" | "up") => void;
  onToggleControls: (show: boolean) => void;
  onToggleFullscreen: () => void;
  onToggleInlineSavePanel: () => void;
  onStreamModeChange: () => void;
  onQuickSave: () => void;
  onLoadState: (state: SaveStateMetadata) => void;
  onSaveToSlot: (slotNumber: number) => void;
}

// This component now renders only the controls overlay, not the container
export function MobileFullscreenView({
  showControls,
  showInlineSavePanel,
  streamMode,
  hasRom,
  saveStates,
  saveLoading,
  onInput,
  onToggleControls,
  onToggleFullscreen,
  onToggleInlineSavePanel,
  onStreamModeChange,
  onQuickSave,
  onLoadState,
  onSaveToSlot,
}: MobileFullscreenViewProps) {
  return (
    <>
      {showControls && (
        <>
          {/* Left Side - D-Pad */}
          <div className="absolute left-4 bottom-1/2 translate-y-1/2 md:left-8">
            <div className="relative w-32 h-32 md:w-40 md:h-40">
              <TouchButton
                button="UP"
                onInput={onInput}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-12 md:h-12 bg-slate-800/80 active:bg-cyan-600 rounded-t-xl flex items-center justify-center border border-slate-600/50"
              >
                <svg
                  className="w-5 h-5 text-cyan-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 4l-8 8h16z" />
                </svg>
              </TouchButton>
              <TouchButton
                button="DOWN"
                onInput={onInput}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-12 md:h-12 bg-slate-800/80 active:bg-cyan-600 rounded-b-xl flex items-center justify-center border border-slate-600/50"
              >
                <svg
                  className="w-5 h-5 text-cyan-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 20l8-8H4z" />
                </svg>
              </TouchButton>
              <TouchButton
                button="LEFT"
                onInput={onInput}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-slate-800/80 active:bg-cyan-600 rounded-l-xl flex items-center justify-center border border-slate-600/50"
              >
                <svg
                  className="w-5 h-5 text-cyan-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 12l8-8v16z" />
                </svg>
              </TouchButton>
              <TouchButton
                button="RIGHT"
                onInput={onInput}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-slate-800/80 active:bg-cyan-600 rounded-r-xl flex items-center justify-center border border-slate-600/50"
              >
                <svg
                  className="w-5 h-5 text-cyan-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 12l-8 8V4z" />
                </svg>
              </TouchButton>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-slate-700/80 rounded-full border border-slate-600/50" />
            </div>
          </div>

          {/* Right Side - Action Buttons */}
          <div className="absolute right-4 bottom-1/2 translate-y-1/2 md:right-8">
            <div className="relative w-28 h-28 md:w-36 md:h-36">
              <TouchButton
                button="B"
                onInput={onInput}
                className="absolute left-0 bottom-0 w-12 h-12 md:w-14 md:h-14 bg-rose-600/90 active:bg-rose-500 rounded-full flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg shadow-rose-900/50 border-2 border-rose-400/30"
              >
                B
              </TouchButton>
              <TouchButton
                button="A"
                onInput={onInput}
                className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 bg-fuchsia-600/90 active:bg-fuchsia-500 rounded-full flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg shadow-fuchsia-900/50 border-2 border-fuchsia-400/30"
              >
                A
              </TouchButton>
            </div>
          </div>

          {/* Top Bar - L/R Shoulder + Menu */}
          <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-2 md:p-4">
            <TouchButton
              button="L"
              onInput={onInput}
              className="w-16 h-8 md:w-20 md:h-10 bg-slate-700/80 active:bg-purple-600 rounded-b-xl text-slate-300 font-bold text-sm border border-slate-600/50"
            >
              L
            </TouchButton>

            <div className="flex items-center gap-2">
              {/* Stream Mode Toggle */}
              <button
                onClick={onStreamModeChange}
                className={`p-2 rounded-lg flex items-center gap-1 ${
                  streamMode === "webrtc"
                    ? "bg-green-600/80 text-green-300"
                    : "bg-cyan-600/80 text-cyan-300"
                }`}
                title={`Mode: ${streamMode.toUpperCase()}`}
              >
                <svg
                  className="w-4 h-4"
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
                <span className="text-[10px] font-bold">
                  {streamMode === "webrtc" ? "RTC" : "WS"}
                </span>
              </button>

              {/* Save States Button */}
              {hasRom && (
                <button
                  onClick={onToggleInlineSavePanel}
                  className={`p-2 rounded-lg flex items-center gap-1 ${
                    showInlineSavePanel
                      ? "bg-amber-500 text-white"
                      : "bg-amber-600/80 text-amber-300"
                  }`}
                  title="Save States"
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
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  <span className="text-[10px] font-bold">SAVE</span>
                </button>
              )}

              <button
                onClick={() => onToggleControls(false)}
                className="p-2 bg-slate-800/80 rounded-lg text-slate-400"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </button>
              <button
                onClick={onToggleFullscreen}
                className="p-2 bg-slate-800/80 rounded-lg text-slate-400"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <TouchButton
              button="R"
              onInput={onInput}
              className="w-16 h-8 md:w-20 md:h-10 bg-slate-700/80 active:bg-purple-600 rounded-b-xl text-slate-300 font-bold text-sm border border-slate-600/50"
            >
              R
            </TouchButton>
          </div>

          {/* Bottom Center - START/SELECT */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
            <TouchButton
              button="SELECT"
              onInput={onInput}
              className="px-4 py-1.5 bg-slate-700/80 active:bg-slate-600 rounded-full text-slate-300 text-xs font-bold border border-slate-600/50"
            >
              SELECT
            </TouchButton>
            <TouchButton
              button="START"
              onInput={onInput}
              className="px-4 py-1.5 bg-emerald-600/80 active:bg-emerald-500 rounded-full text-white text-xs font-bold border border-emerald-400/30"
            >
              START
            </TouchButton>
          </div>
        </>
      )}

      {/* Inline Save States Panel */}
      {showInlineSavePanel && hasRom && (
        <InlineSavePanel
          saveStates={saveStates}
          loading={saveLoading}
          onClose={onToggleInlineSavePanel}
          onQuickSave={onQuickSave}
          onLoadState={onLoadState}
          onSaveToSlot={onSaveToSlot}
        />
      )}

      {/* Hidden controls toggle */}
      {!showControls && (
        <button
          onClick={() => onToggleControls(true)}
          className="absolute top-4 right-4 p-2 bg-slate-800/60 rounded-lg text-slate-400"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
      )}
    </>
  );
}
