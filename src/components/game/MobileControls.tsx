import type { InputButton } from "@/api/play.api";
import { TouchButton } from "./TouchButton";

interface MobileControlsProps {
  sessionId: string | null;
  isFullscreen: boolean;
  onInput: (button: InputButton, state: "down" | "up") => void;
}

export function MobileControls({
  sessionId,
  isFullscreen,
  onInput,
}: MobileControlsProps) {
  if (!sessionId || isFullscreen) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg backdrop-blur-sm p-1.5 flex-1 min-h-0 flex flex-col justify-center">
      {/* L/R Buttons at top */}
      <div className="flex justify-between mb-1 shrink-0">
        <TouchButton
          button="L"
          onInput={onInput}
          className="h-6 px-3 bg-slate-700 active:bg-purple-600 rounded text-[10px] font-bold text-slate-300"
        >
          L
        </TouchButton>
        <TouchButton
          button="R"
          onInput={onInput}
          className="h-6 px-3 bg-slate-700 active:bg-purple-600 rounded text-[10px] font-bold text-slate-300"
        >
          R
        </TouchButton>
      </div>

      <div className="flex items-center justify-between flex-1 min-h-0 px-2">
        {/* D-Pad */}
        <div className="relative w-20 h-20">
          <TouchButton
            button="UP"
            onInput={onInput}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 bg-slate-700 active:bg-cyan-600 rounded-t flex items-center justify-center"
          >
            <svg
              className="w-2.5 h-2.5 text-cyan-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 4l-8 8h16z" />
            </svg>
          </TouchButton>
          <TouchButton
            button="DOWN"
            onInput={onInput}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-7 bg-slate-700 active:bg-cyan-600 rounded-b flex items-center justify-center"
          >
            <svg
              className="w-2.5 h-2.5 text-cyan-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 20l8-8H4z" />
            </svg>
          </TouchButton>
          <TouchButton
            button="LEFT"
            onInput={onInput}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-700 active:bg-cyan-600 rounded-l flex items-center justify-center"
          >
            <svg
              className="w-2.5 h-2.5 text-cyan-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M4 12l8-8v16z" />
            </svg>
          </TouchButton>
          <TouchButton
            button="RIGHT"
            onInput={onInput}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-700 active:bg-cyan-600 rounded-r flex items-center justify-center"
          >
            <svg
              className="w-3 h-3 text-cyan-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20 12l-8 8V4z" />
            </svg>
          </TouchButton>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-slate-600 rounded-full" />
        </div>

        {/* Center Buttons */}
        <div className="flex flex-col gap-1">
          <TouchButton
            button="SELECT"
            onInput={onInput}
            className="h-4 px-2 bg-slate-700 active:bg-slate-600 rounded-full text-[8px] font-bold text-slate-300"
          >
            SELECT
          </TouchButton>
          <TouchButton
            button="START"
            onInput={onInput}
            className="h-4 px-2 bg-emerald-600 active:bg-emerald-500 rounded-full text-[8px] font-bold text-white"
          >
            START
          </TouchButton>
        </div>

        {/* Action Buttons */}
        <div className="relative w-16 h-16">
          <TouchButton
            button="B"
            onInput={onInput}
            className="absolute left-0 top-1/2 -translate-y-1/4 w-8 h-8 bg-rose-600 active:bg-rose-500 rounded-full font-black text-xs text-white flex items-center justify-center"
          >
            B
          </TouchButton>
          <TouchButton
            button="A"
            onInput={onInput}
            className="absolute right-0 top-1/2 -translate-y-3/4 w-8 h-8 bg-fuchsia-600 active:bg-fuchsia-500 rounded-full font-black text-xs text-white flex items-center justify-center"
          >
            A
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
