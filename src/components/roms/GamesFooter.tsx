interface GamesFooterProps {
  totalGames: number;
}

export function GamesFooter({ totalGames }: GamesFooterProps) {
  return (
    <div className="mt-16 text-center">
      <div className="inline-flex items-center gap-4 px-6 py-3 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-full">
        <span className="text-slate-400 font-mono text-sm">Total Games:</span>
        <span className="text-cyan-400 font-bold text-xl">{totalGames}</span>
        <div className="w-px h-6 bg-slate-700" />
        <span className="text-slate-400 font-mono text-sm">Status:</span>
        <span className="text-green-400 font-bold text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          ONLINE
        </span>
      </div>
    </div>
  );
}
