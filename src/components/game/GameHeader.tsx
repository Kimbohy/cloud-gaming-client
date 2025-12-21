import { Badge } from "@/components/ui/badge";
import { removeFileExtension } from "@/lib/utils";

interface GameHeaderProps {
  name?: string;
  desc?: string;
  connected: boolean;
  isMobile?: boolean;
  onBack: () => void;
}

export function GameHeader({
  name,
  // desc,
  connected,
  isMobile = false,
  onBack,
}: GameHeaderProps) {
  if (isMobile) {
    return (
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="shrink-0 p-1.5 text-slate-400 hover:text-white transition-colors"
          aria-label="Back to ROMs"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-base font-bold text-white truncate flex-1">
          {removeFileExtension(name)}
        </h1>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            connected ? "bg-green-400" : "bg-red-400"
          }`}
        />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 md:mb-6"
      >
        <svg
          className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="font-mono text-sm">Back to Library</span>
      </button>

      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-4">
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-2 md:px-3 py-1 text-[10px] md:text-xs font-mono uppercase tracking-wider">
          🎮 Now Playing
        </Badge>
        {/* <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 px-2 md:px-3 py-1 text-[10px] md:text-xs font-mono uppercase tracking-wider">
          {desc}
        </Badge> */}
        <div className="flex items-center gap-2 ml-auto">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400 animate-pulse" : "bg-red-400"
            }`}
          />
          <span
            className={`text-[10px] md:text-xs font-mono ${
              connected ? "text-green-400" : "text-red-400"
            }`}
          >
            {connected ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>
      </div>

      <h1 className="text-2xl md:text-4xl font-black tracking-tight">
        <span className="bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          {removeFileExtension(name)}
        </span>
      </h1>
    </>
  );
}
