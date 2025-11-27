import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

type GameType = {
  id: string;
  name: string;
  console: string;
  filePath: string;
  imagePath: string;
  description: string;
  uploadAt: string;
};

export default function RomsPage() {
  const navigate = useNavigate();

  const games: GameType[] = [
    {
      id: "1",
      name: "Advance GTA (Japan) (En) (Rev 1)",
      console: "GBA",
      filePath: "Advance GTA (Japan) (En) (Rev 1).gba",
      imagePath: "/game.webp",
      description: "Action",
      uploadAt: "1P",
    },
    {
      id: "2",
      name: "Advance Wars 2 - Black Hole Rising",
      console: "GBA",
      filePath: "Advance Wars 2 - Black Hole Rising (USA).gba",
      imagePath: "/game.webp",
      description: "Strategy",
      uploadAt: "1-4P",
    },
    {
      id: "3",
      name: "Kirby & The Amazing Mirror",
      console: "GBA",
      filePath: "Kirby & The Amazing Mirror (USA).gba",
      imagePath: "/game.webp",
      description: "Platform",
      uploadAt: "1-4P",
    },
    {
      id: "4",
      name: "Pokemon Mystery Dungeon - Red Rescue Team",
      console: "GBA",
      filePath:
        "Pokemon Mystery Dungeon - Red Rescue Team (USA, Australia).gba",
      imagePath: "/game.webp",
      description: "RPG",
      uploadAt: "1P",
    },
    {
      id: "5",
      name: "Pokemon Mystery Dungeon Red Rescue Team EX",
      console: "GBA",
      filePath: "Pokemon Mystery Dungeon Red Rescue Team EX.gba",
      imagePath: "/game.webp",
      description: "RPG",
      uploadAt: "1P",
    },
    {
      id: "6",
      name: "The Sims 2",
      console: "GBA",
      filePath: "Sims 2, The (USA, Europe) (En,Fr,De,Es,It,Nl).gba",
      imagePath: "/game.webp",
      description: "Simulation",
      uploadAt: "1P",
    },
  ];

  const handleGameClick = (game: GameType) => {
    navigate(`/play/${game.id}`, {
      state: {
        name: game.name,
        rom: game.filePath,
        desc: game.description,
      },
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative container mx-auto px-4 py-12 max-w-7xl">
        {/* Gaming Header */}
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

        {/* Games Grid - Gaming Style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {games.map((game, index) => (
            <Card
              key={index}
              onClick={() => handleGameClick(game)}
              className="group relative cursor-pointer transition-all duration-500 hover:shadow-[0_0_50px_rgba(168,85,247,0.5)] overflow-hidden bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:scale-105 hover:-translate-y-2"
            >
              {/* Glowing Border Effect */}
              <div className="absolute inset-0 bg-linear-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />

              <CardContent className="p-0">
                {/* Image Container with Gaming Effects */}
                <div className="relative overflow-hidden bg-linear-to-br from-slate-800 to-slate-900">
                  <img
                    src={game.imagePath}
                    alt={game.name}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-75"
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
                    <Badge className="bg-black/70 text-purple-400 border-purple-500/50 text-[10px] font-bold backdrop-blur-sm px-1.5 py-0.5">
                      {game.uploadAt}
                    </Badge>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/90 via-purple-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 flex items-center justify-center mb-2 transform scale-75 group-hover:scale-100 transition-transform duration-500">
                      <div className="w-0 h-0 border-l-12 border-l-white border-y-8 border-y-transparent ml-0.5" />
                    </div>
                    <span className="text-white font-black text-sm uppercase tracking-wider drop-shadow-lg">
                      PLAY NOW
                    </span>
                    <span className="text-cyan-400 font-mono text-xs mt-0.5">
                      {">"} Press A
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
          ))}
        </div>

        {/* Gaming Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-full">
            <span className="text-slate-400 font-mono text-sm">
              Total Games:
            </span>
            <span className="text-cyan-400 font-bold text-xl">
              {games.length}
            </span>
            <div className="w-px h-6 bg-slate-700" />
            <span className="text-slate-400 font-mono text-sm">Status:</span>
            <span className="text-green-400 font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>

        {/* Empty State */}
        {games.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎮</div>
            <p className="text-slate-400 text-xl font-bold mb-2">
              NO GAMES FOUND
            </p>
            <p className="text-slate-500 font-mono text-sm">
              Insert cartridge to continue...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
