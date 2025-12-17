import { useState, useCallback } from "react";
import { getAllRoms, ApiError, type Rom } from "@/api/roms.api";

interface ErrorState {
  message: string;
  isNetworkError: boolean;
}

export function useRoms() {
  const [games, setGames] = useState<Rom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  const fetchRoms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const roms = await getAllRoms();
      setGames(roms);
    } catch (err) {
      if (err instanceof ApiError) {
        setError({ message: err.message, isNetworkError: err.isNetworkError });
      } else {
        setError({
          message: err instanceof Error ? err.message : "Failed to load games",
          isNetworkError: false,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { games, loading, error, fetchRoms, setError };
}
