import { Badge } from "@/components/ui/badge";

export function RomsPageHeader() {
  return (
    <div className="mb-12 text-center">
      <div className="inline-block mb-4">
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-4 py-1 text-sm font-mono uppercase tracking-wider">
          🎮 Game Library
        </Badge>
      </div>
      <h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tight">
        <span className="bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">
          SELECT
        </span>
        <br />
        <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
          YOUR GAME
        </span>
      </h1>
      <p className="text-slate-400 text-lg font-medium tracking-wide">
        Press START to begin your adventure
      </p>
    </div>
  );
}
