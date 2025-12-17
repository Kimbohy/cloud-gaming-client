import { forwardRef } from "react";
import type { InputButton, StreamMode } from "@/api/play.api";
import { TouchButton } from "./TouchButton";
import { DPad, ActionButtons } from "./GamepadButtons";

interface FullscreenControlsProps {
  showControls: boolean;
  streamMode: StreamMode;
  onInput: (button: InputButton, state: "down" | "up") => void;
  onStreamModeChange: (mode: StreamMode) => void;
  onHideControls: () => void;
  onShowControls: () => void;
  onExitFullscreen: () => void;
}

export const FullscreenControls = forwardRef<
  HTMLCanvasElement,
  FullscreenControlsProps
>(
  (
    {
      showControls,
      streamMode,
      onInput,
      onStreamModeChange,
      onHideControls,
      onShowControls,
      onExitFullscreen,
    },
    canvasRef
  ) => {
    return (
      <>
        <div className="relative h-full aspect-3/2 max-w-full">
          <canvas
            ref={canvasRef}
            width={240}
            height={160}
            className="w-full h-full"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px]" />
        </div>

        {showControls && (
          <>
            {/* Left Side - D-Pad */}
            <div className="absolute left-4 bottom-1/2 translate-y-1/2 md:left-8">
              <DPad onInput={onInput} size="md" />
            </div>

            {/* Right Side - Action Buttons */}
            <div className="absolute right-4 bottom-1/2 translate-y-1/2 md:right-8">
              <ActionButtons onInput={onInput} size="md" />
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
                  onClick={() =>
                    onStreamModeChange(
                      streamMode === "websocket" ? "webrtc" : "websocket"
                    )
                  }
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

                <button
                  onClick={onHideControls}
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
                  onClick={onExitFullscreen}
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

        {/* Hidden controls toggle */}
        {!showControls && (
          <button
            onClick={onShowControls}
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
);

FullscreenControls.displayName = "FullscreenControls";
