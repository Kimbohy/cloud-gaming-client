interface GameFooterProps {
  isPlaying: boolean;
  isMobile: boolean;
}

export function GameFooter({ isPlaying, isMobile }: GameFooterProps) {
  if (isMobile) return null;

  return (
    <div className="mt-6 md:mt-8 text-center">
      <div className="inline-flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-full text-[10px] md:text-xs font-mono">
        <span className="text-slate-500">Status:</span>
        <span
          className={`font-bold ${
            isPlaying ? "text-green-400" : "text-slate-400"
          }`}
        >
          {isPlaying ? "● PLAYING" : "○ IDLE"}
        </span>
      </div>
    </div>
  );
}
