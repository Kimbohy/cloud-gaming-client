import { TouchButton } from "./TouchButton";
import { type InputButton } from "@/api/play.api";

interface MobileVirtualControllerProps {
  onInput: (button: InputButton, state: "down" | "up") => void;
}

export function MobileVirtualController({
  onInput,
}: MobileVirtualControllerProps) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg backdrop-blur-sm p-2 shrink-0 mt-8">
      {/* L/R Buttons at top */}
      <div className="flex justify-between mb-2">
        <TouchButton
          button="L"
          onInput={onInput}
          className="h-7 px-4 bg-slate-700 active:bg-purple-600 rounded text-[10px] font-bold text-slate-300"
        >
          L
        </TouchButton>
        <TouchButton
          button="R"
          onInput={onInput}
          className="h-7 px-4 bg-slate-700 active:bg-purple-600 rounded text-[10px] font-bold text-slate-300"
        >
          R
        </TouchButton>
      </div>

      <div className="flex items-center justify-between px-2">
        {/* D-Pad */}
        <div className="relative w-24 h-24">
          <TouchButton
            button="UP"
            onInput={onInput}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-700 active:bg-cyan-600 rounded-t-lg flex items-center justify-center"
          >
            <svg
              className="w-3 h-3 text-cyan-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 4l-8 8h16z" />
            </svg>
          </TouchButton>
          <TouchButton
            button="DOWN"
            onInput={onInput}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-700 active:bg-cyan-600 rounded-b-lg flex items-center justify-center"
          >
            <svg
              className="w-3 h-3 text-cyan-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 20l8-8H4z" />
            </svg>
          </TouchButton>
          <TouchButton
            button="LEFT"
            onInput={onInput}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-700 active:bg-cyan-600 rounded-l-lg flex items-center justify-center"
          >
            <svg
              className="w-3 h-3 text-cyan-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M4 12l8-8v16z" />
            </svg>
          </TouchButton>
          <TouchButton
            button="RIGHT"
            onInput={onInput}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-700 active:bg-cyan-600 rounded-r-lg flex items-center justify-center"
          >
            <svg
              className="w-3 h-3 text-cyan-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20 12l-8 8V4z" />
            </svg>
          </TouchButton>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-slate-600 rounded-full" />
        </div>

        {/* Center Buttons */}
        <div className="flex flex-col gap-2">
          <TouchButton
            button="SELECT"
            onInput={onInput}
            className="h-5 px-3 bg-slate-700 active:bg-slate-600 rounded-full text-[9px] font-bold text-slate-300"
          >
            SELECT
          </TouchButton>
          <TouchButton
            button="START"
            onInput={onInput}
            className="h-5 px-3 bg-emerald-600 active:bg-emerald-500 rounded-full text-[9px] font-bold text-white"
          >
            START
          </TouchButton>
        </div>

        {/* Action Buttons */}
        <div className="relative w-24 h-24">
          <TouchButton
            button="B"
            onInput={onInput}
            className="absolute left-0 bottom-2 w-10 h-10 bg-rose-600 active:bg-rose-500 rounded-full font-black text-sm text-white flex items-center justify-center shadow-lg"
          >
            B
          </TouchButton>
          <TouchButton
            button="A"
            onInput={onInput}
            className="absolute right-0 top-2 w-10 h-10 bg-fuchsia-600 active:bg-fuchsia-500 rounded-full font-black text-sm text-white flex items-center justify-center shadow-lg"
          >
            A
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
