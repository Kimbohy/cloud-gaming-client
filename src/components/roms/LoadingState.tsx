export function LoadingState() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4 animate-bounce">🎮</div>
      <p className="text-cyan-400 text-xl font-bold mb-2 animate-pulse">
        LOADING...
      </p>
      <p className="text-slate-500 font-mono text-sm">
        Please wait while games are being fetched
      </p>
    </div>
  );
}
