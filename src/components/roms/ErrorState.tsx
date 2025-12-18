import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  isNetworkError: boolean;
  onRetry: () => void;
}

export function ErrorState({
  message,
  isNetworkError,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">{isNetworkError ? "🔌" : "❌"}</div>
      <p className="text-red-400 text-xl font-bold mb-2">
        {isNetworkError ? "CONNEXION ERROR" : "ERROR"}
      </p>
      <p className="text-slate-400 font-mono text-sm max-w-md mx-auto mb-6">
        {message}
      </p>

      {/* Help message for network errors */}
      {isNetworkError && (
        <div className="bg-slate-800/50 rounded-xl p-4 max-w-md mx-auto mb-6 border border-slate-700/50">
          <p className="text-slate-300 text-sm mb-2">
            Pour démarrer le serveur, exécutez :
          </p>
          <code className="bg-slate-900 text-green-400 px-3 py-2 rounded block text-sm font-mono">
            cd server && pnpm start:dev
          </code>
        </div>
      )}

      {/* Retry button */}
      <Button
        onClick={onRetry}
        className="bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300"
      >
        <span className="flex items-center gap-2">🔄 Réessayer</span>
      </Button>
    </div>
  );
}
