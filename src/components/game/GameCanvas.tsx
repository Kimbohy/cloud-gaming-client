import { forwardRef } from "react";

interface GameCanvasProps {
  isPlaying: boolean;
  isMobile?: boolean;
  onStartGame: () => void;
}

export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  ({ isPlaying, isMobile = false, onStartGame }, ref) => {
    return (
      <div className={isMobile ? "p-1.5" : "p-3 md:p-6"}>
        <div className="relative bg-black rounded-xl overflow-hidden border-2 border-slate-800">
          {/* Scanline Effect */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px] z-10" />

          {/* Power LED */}
          <div className="absolute top-2 right-2 md:top-3 md:right-3 z-20">
            <span
              className={`w-2 h-2 rounded-full block ${
                isPlaying
                  ? "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]"
                  : "bg-slate-600"
              }`}
            />
          </div>

          <canvas
            ref={ref}
            width={240}
            height={160}
            className="w-full h-auto block"
            style={{ imageRendering: "pixelated" }}
          />

          {/* Play Overlay */}
          {!isPlaying && (
            <div
              onClick={onStartGame}
              className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-10 cursor-pointer"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center mb-3 md:mb-4 hover:scale-110 transition-transform">
                <svg
                  className="w-7 h-7 md:w-8 md:h-8 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-white font-bold text-base md:text-lg tracking-wide">
                PRESS START
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

GameCanvas.displayName = "GameCanvas";
