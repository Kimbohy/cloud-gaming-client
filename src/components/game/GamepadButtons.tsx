import type { InputButton } from "@/api/play.api";
import { TouchButton } from "./TouchButton";

// Reusable arrow icons
const ArrowUp = () => (
  <svg
    className="w-5 h-5 text-cyan-400"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M12 4l-8 8h16z" />
  </svg>
);

const ArrowDown = () => (
  <svg
    className="w-5 h-5 text-cyan-400"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M12 20l8-8H4z" />
  </svg>
);

const ArrowLeft = () => (
  <svg
    className="w-5 h-5 text-cyan-400"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M4 12l8-8v16z" />
  </svg>
);

const ArrowRight = () => (
  <svg
    className="w-5 h-5 text-cyan-400"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M20 12l-8 8V4z" />
  </svg>
);

interface DPadProps {
  onInput: (button: InputButton, state: "down" | "up") => void;
  size?: "sm" | "md" | "lg";
}

export function DPad({ onInput, size = "lg" }: DPadProps) {
  const sizeClasses = {
    sm: {
      container: "w-20 h-20",
      button: "w-7 h-7",
      center: "w-6 h-6",
      icon: "w-2.5 h-2.5",
    },
    md: {
      container: "w-32 h-32 md:w-40 md:h-40",
      button: "w-10 h-10 md:w-12 md:h-12",
      center: "w-8 h-8 md:w-10 md:h-10",
      icon: "w-5 h-5",
    },
    lg: {
      container: "w-32 h-32 md:w-40 md:h-40",
      button: "w-10 h-10 md:w-12 md:h-12",
      center: "w-8 h-8 md:w-10 md:h-10",
      icon: "w-5 h-5",
    },
  };

  const s = sizeClasses[size];

  return (
    <div className={`relative ${s.container}`}>
      <TouchButton
        button="UP"
        onInput={onInput}
        className={`absolute top-0 left-1/2 -translate-x-1/2 ${s.button} bg-slate-800/80 active:bg-cyan-600 rounded-t-xl flex items-center justify-center border border-slate-600/50`}
      >
        {size === "sm" ? (
          <svg
            className={`${s.icon} text-cyan-300`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 4l-8 8h16z" />
          </svg>
        ) : (
          <ArrowUp />
        )}
      </TouchButton>
      <TouchButton
        button="DOWN"
        onInput={onInput}
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${s.button} bg-slate-800/80 active:bg-cyan-600 rounded-b-xl flex items-center justify-center border border-slate-600/50`}
      >
        {size === "sm" ? (
          <svg
            className={`${s.icon} text-cyan-300`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 20l8-8H4z" />
          </svg>
        ) : (
          <ArrowDown />
        )}
      </TouchButton>
      <TouchButton
        button="LEFT"
        onInput={onInput}
        className={`absolute left-0 top-1/2 -translate-y-1/2 ${s.button} bg-slate-800/80 active:bg-cyan-600 rounded-l-xl flex items-center justify-center border border-slate-600/50`}
      >
        {size === "sm" ? (
          <svg
            className={`${s.icon} text-cyan-300`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M4 12l8-8v16z" />
          </svg>
        ) : (
          <ArrowLeft />
        )}
      </TouchButton>
      <TouchButton
        button="RIGHT"
        onInput={onInput}
        className={`absolute right-0 top-1/2 -translate-y-1/2 ${s.button} bg-slate-800/80 active:bg-cyan-600 rounded-r-xl flex items-center justify-center border border-slate-600/50`}
      >
        {size === "sm" ? (
          <svg
            className={`w-3 h-3 text-cyan-300`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M20 12l-8 8V4z" />
          </svg>
        ) : (
          <ArrowRight />
        )}
      </TouchButton>
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${s.center} bg-slate-700/80 rounded-full border border-slate-600/50`}
      />
    </div>
  );
}

interface ActionButtonsProps {
  onInput: (button: InputButton, state: "down" | "up") => void;
  size?: "sm" | "md" | "lg";
}

export function ActionButtons({ onInput, size = "lg" }: ActionButtonsProps) {
  const sizeClasses = {
    sm: {
      container: "w-16 h-16",
      button: "w-8 h-8",
      text: "text-xs",
      bPosition: "left-0 top-1/2 -translate-y-1/4",
      aPosition: "right-0 top-1/2 -translate-y-3/4",
    },
    md: {
      container: "w-28 h-28 md:w-36 md:h-36",
      button: "w-12 h-12 md:w-14 md:h-14",
      text: "text-lg md:text-xl",
      bPosition: "left-0 bottom-0",
      aPosition: "right-0 top-0",
    },
    lg: {
      container: "w-28 h-28 md:w-36 md:h-36",
      button: "w-12 h-12 md:w-14 md:h-14",
      text: "text-lg md:text-xl",
      bPosition: "left-0 bottom-0",
      aPosition: "right-0 top-0",
    },
  };

  const s = sizeClasses[size];

  return (
    <div className={`relative ${s.container}`}>
      <TouchButton
        button="B"
        onInput={onInput}
        className={`absolute ${s.bPosition} ${s.button} bg-rose-600/90 active:bg-rose-500 rounded-full flex items-center justify-center text-white font-black ${s.text} shadow-lg shadow-rose-900/50 border-2 border-rose-400/30`}
      >
        B
      </TouchButton>
      <TouchButton
        button="A"
        onInput={onInput}
        className={`absolute ${s.aPosition} ${s.button} bg-fuchsia-600/90 active:bg-fuchsia-500 rounded-full flex items-center justify-center text-white font-black ${s.text} shadow-lg shadow-fuchsia-900/50 border-2 border-fuchsia-400/30`}
      >
        A
      </TouchButton>
    </div>
  );
}

interface ShoulderButtonsProps {
  onInput: (button: InputButton, state: "down" | "up") => void;
  size?: "sm" | "md";
}

export function ShoulderButtons({
  onInput,
  size = "md",
}: ShoulderButtonsProps) {
  const sizeClasses = {
    sm: "h-6 px-3 text-[10px]",
    md: "w-16 h-8 md:w-20 md:h-10 text-sm",
  };

  return (
    <>
      <TouchButton
        button="L"
        onInput={onInput}
        className={`${sizeClasses[size]} bg-slate-700/80 active:bg-purple-600 rounded-b-xl text-slate-300 font-bold border border-slate-600/50`}
      >
        L
      </TouchButton>
      <TouchButton
        button="R"
        onInput={onInput}
        className={`${sizeClasses[size]} bg-slate-700/80 active:bg-purple-600 rounded-b-xl text-slate-300 font-bold border border-slate-600/50`}
      >
        R
      </TouchButton>
    </>
  );
}

interface StartSelectButtonsProps {
  onInput: (button: InputButton, state: "down" | "up") => void;
  size?: "sm" | "md";
}

export function StartSelectButtons({
  onInput,
  size = "md",
}: StartSelectButtonsProps) {
  const sizeClasses = {
    sm: {
      select: "h-4 px-2 text-[8px]",
      start: "h-4 px-2 text-[8px]",
    },
    md: {
      select: "px-4 py-1.5 text-xs",
      start: "px-4 py-1.5 text-xs",
    },
  };

  const s = sizeClasses[size];

  return (
    <>
      <TouchButton
        button="SELECT"
        onInput={onInput}
        className={`${s.select} bg-slate-700/80 active:bg-slate-600 rounded-full text-slate-300 font-bold border border-slate-600/50`}
      >
        SELECT
      </TouchButton>
      <TouchButton
        button="START"
        onInput={onInput}
        className={`${s.start} bg-emerald-600/80 active:bg-emerald-500 rounded-full text-white font-bold border border-emerald-400/30`}
      >
        START
      </TouchButton>
    </>
  );
}
