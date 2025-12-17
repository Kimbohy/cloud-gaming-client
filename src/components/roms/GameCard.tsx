import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Rom } from "@/api/roms.api";

interface GameCardProps {
  game: Rom;
  onClick: (game: Rom) => void;
}

export function GameCard({ game, onClick }: GameCardProps) {
  return (
    <Card
      onClick={() => onClick(game)}
      className="group relative overflow-hidden bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
    >
      <div className="relative aspect-3/4 overflow-hidden">
        <img
          src={(game as Rom & { imageUrl?: string }).imageUrl || "/default.jpg"}
          alt={game.name}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-75"
          onError={(e) => {
            e.currentTarget.src = "/default.jpg";
          }}
        />

        {/* Scanline Effect */}
        <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px]" />

        {/* Genre Badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-black/70 text-cyan-400 border-cyan-500/50 text-[10px] font-bold backdrop-blur-sm px-1.5 py-0.5">
            {game.description}
          </Badge>
        </div>

        {/* Players Badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-black/70 text-purple-300 border-purple-500/50 text-[10px] font-bold backdrop-blur-sm px-1.5 py-0.5">
            👤 1P
          </Badge>
        </div>

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/50 flex items-center justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <svg
              className="w-6 h-6 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      <CardContent className="p-3 md:p-4">
        <CardTitle className="text-sm md:text-base font-bold text-white mb-1 truncate group-hover:text-transparent group-hover:bg-linear-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all">
          {game.name}
        </CardTitle>
        <p className="text-[10px] md:text-xs text-slate-400 truncate font-mono">
          {game.filePath.split("/").pop()}
        </p>
      </CardContent>
    </Card>
  );
}
