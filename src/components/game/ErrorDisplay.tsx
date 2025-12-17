interface ErrorState {
  message: string;
  isNetworkError: boolean;
}

interface ErrorDisplayProps {
  error: ErrorState;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-950/50 border border-red-500/50 rounded-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{error.isNetworkError ? "🔌" : "❌"}</span>
        <span className="text-red-400 font-bold text-sm">
          {error.isNetworkError ? "Erreur de connexion" : "Erreur"}
        </span>
      </div>
      <p className="text-red-300 text-xs md:text-sm font-mono">
        {error.message}
      </p>
      {error.isNetworkError && (
        <p className="text-slate-400 text-xs mt-2">
          Vérifiez que le serveur est démarré avec:{" "}
          <code className="bg-slate-800 px-1 rounded">
            cd server && pnpm start:dev
          </code>
        </p>
      )}
    </div>
  );
}

export type { ErrorState };
