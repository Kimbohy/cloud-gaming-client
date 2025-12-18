import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Rom } from "@/api/roms.api";

interface GamesGridProps {
  games: Rom[];
  onGameClick: (game: Rom) => void;
}

interface GameCardItemProps {
  game: Rom;
  onClick: () => void;
}

function GameCardItem({ game, onClick }: GameCardItemProps) {
  return (
    <Card
      onClick={onClick}
      className="group relative cursor-pointer transition-all duration-500 hover:shadow-[0_0_50px_rgba(168,85,247,0.5)] overflow-hidden bg-slate-900/50 border-slate-700/50 backdrop-blur-sm  hover:-translate-y-2"
    >
      {/* Glowing Border Effect */}
      <div className="absolute inset-0 bg-linear-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />

      <CardContent className="p-0">
        {/* Image Container with Gaming Effects */}
        <div className="relative overflow-hidden bg-linear-to-br from-slate-800 to-slate-900">
          <img
            src={import.meta.env.VITE_SERVER_URL + game.imagePath}
            alt={game.name}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-75"
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

          {/* Console Badge */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-black/70 text-purple-400 border-purple-500/50 text-[10px] font-bold backdrop-blur-sm px-1.5 py-0.5">
              {game.console}
            </Badge>
          </div>

          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-purple-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/10  border-2 border-white/30 flex items-center justify-center mb-2 transform scale-75 group-hover:scale-100 transition-transform duration-500">
              <div className="w-0 h-0 border-l-12 border-l-white border-y-8 border-y-transparent ml-0.5" />
            </div>
            <span className="text-white font-black text-sm uppercase tracking-wider drop-shadow-lg">
              PLAY NOW
            </span>
          </div>
        </div>

        {/* Game Title - Gaming Style */}
        <div className="p-2 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700/50">
          <CardTitle className="text-xs font-bold line-clamp-2 text-white group-hover:text-transparent group-hover:bg-linear-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
            {game.name}
          </CardTitle>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-0.5 w-6 bg-linear-to-r from-cyan-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="text-slate-500 text-[10px] font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Ready
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GamesGrid({ games, onGameClick }: GamesGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
      {games.map((game, index) => (
        <GameCardItem
          key={game.id || index}
          game={game}
          onClick={() => onGameClick(game)}
        />
      ))}
    </div>
  );
}
