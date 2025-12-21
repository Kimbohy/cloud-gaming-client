import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { getAllRoms, ApiError, type Rom } from "@/api/roms.api";
import { authClient } from "@/lib/auth-client";
import { useRomUpload, type ErrorState } from "@/hooks";
import {
  AnimatedBackground,
  UserTopBar,
  RomsPageHeader,
  UploadGameCard,
  LoadingState,
  ErrorState as ErrorStateComponent,
  GamesFooter,
  GamesGrid,
} from "@/components/roms";

export default function RomsPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Rom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  const user = authClient.getUser();

  const handleUploadSuccess = useCallback((rom: Rom) => {
    setGames((prev) => [...prev, rom]);
  }, []);

  const handleUploadError = useCallback((uploadError: ErrorState) => {
    setError(uploadError);
  }, []);

  const upload = useRomUpload({
    onSuccess: handleUploadSuccess,
    onError: handleUploadError,
  });

  const handleLogout = async () => {
    await authClient.signOut();
    navigate("/auth");
  };

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

  useEffect(() => {
    fetchRoms();
  }, [fetchRoms]);

  const handleGameClick = useCallback(
    (game: Rom) => {
      navigate(`/play/${game.id}`, {
        state: {
          name: game.name,
          rom: game.filePath,
          desc: game.description,
        },
      });
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950">
      <AnimatedBackground />

      <div className="relative container mx-auto px-4 py-12 max-w-7xl">
        <UserTopBar user={user} onLogout={handleLogout} />

        <RomsPageHeader />

        {/* Loading State */}
        {loading && <LoadingState />}

        {/* Error State */}
        {error && !loading && (
          <ErrorStateComponent
            message={error.message}
            isNetworkError={error.isNetworkError}
            onRetry={fetchRoms}
          />
        )}

        {/* Games Grid */}
        {!loading && !error && (
          <GamesGrid games={games} onGameClick={handleGameClick}>
            <UploadGameCard
              uploading={upload.uploading}
              selectedRomFile={upload.selectedRomFile}
              dialogOpen={upload.dialogOpen}
              romInputRef={upload.romInputRef}
              imageInputRef={upload.imageInputRef}
              onDialogOpenChange={upload.setDialogOpen}
              onUploadRomClick={upload.handleUploadRomClick}
              onUploadImageClick={upload.handleUploadImageClick}
              onRomFileChange={upload.handleRomFileChange}
              onImageFileChange={upload.handleImageFileChange}
              onUploadWithoutImage={upload.handleUploadWithoutImage}
              onDialogClose={upload.handleDialogClose}
            />
          </GamesGrid>
        )}

        <GamesFooter totalGames={games.length} />
      </div>
    </div>
  );
}
