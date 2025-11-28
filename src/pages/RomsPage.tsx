import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { getAllRoms, uploadRom, ApiError, type Rom } from "@/api/roms.api";
import { authClient } from "@/lib/auth-client";

// Error state interface
interface ErrorState {
  message: string;
  isNetworkError: boolean;
}

export default function RomsPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Rom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedRomFile, setSelectedRomFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const romInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const user = authClient.getUser();

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

  const handleGameClick = (game: Rom) => {
    navigate(`/play/${game.id}`, {
      state: {
        name: game.name,
        rom: game.filePath,
        desc: game.description,
      },
    });
  };

  const handleUploadRomClick = () => {
    romInputRef.current?.click();
  };

  const handleUploadImageClick = () => {
    if (!selectedRomFile) {
      setError({
        message: "Please select a ROM file first",
        isNetworkError: false,
      });
      return;
    }
    imageInputRef.current?.click();
  };

  const handleRomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedRomFile(file);
    setError(null);
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const imageFile = e.target.files?.[0];
    if (!selectedRomFile) return;

    try {
      setUploading(true);
      setError(null);
      const newRom = await uploadRom(selectedRomFile, imageFile);
      setGames((prev) => [...prev, newRom]);
      setDialogOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError({ message: err.message, isNetworkError: err.isNetworkError });
        // Close dialog on network error to show the error state
        if (err.isNetworkError) {
          setDialogOpen(false);
        }
      } else {
        setError({
          message: err instanceof Error ? err.message : "Failed to upload ROM",
          isNetworkError: false,
        });
      }
    } finally {
      setUploading(false);
      setSelectedRomFile(null);
      if (romInputRef.current) {
        romInputRef.current.value = "";
      }
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleUploadWithoutImage = async () => {
    if (!selectedRomFile) {
      setError({
        message: "Please select a ROM file first",
        isNetworkError: false,
      });
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const newRom = await uploadRom(selectedRomFile);
      setGames((prev) => [...prev, newRom]);
      setDialogOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError({ message: err.message, isNetworkError: err.isNetworkError });
        // Close dialog on network error to show the error state
        if (err.isNetworkError) {
          setDialogOpen(false);
        }
      } else {
        setError({
          message: err instanceof Error ? err.message : "Failed to upload ROM",
          isNetworkError: false,
        });
      }
    } finally {
      setUploading(false);
      setSelectedRomFile(null);
      if (romInputRef.current) {
        romInputRef.current.value = "";
      }
    }
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
        {/* Top Bar with User Info and Logout */}
        <div className="absolute top-4 right-4 flex items-center gap-4">
          {user && (
            <span className="text-slate-300 text-sm font-medium">
              👤 {user.name}
            </span>
          )}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            🚪 Logout
          </Button>
        </div>

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

          {/* Upload Button */}
          <div className="mt-8">
            <input
              type="file"
              ref={romInputRef}
              onChange={handleRomFileChange}
              accept=".gba,.gbc,.gb"
              className="hidden"
            />
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                disabled={uploading}
                className="bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Uploading...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">📤 Upload</span>
                )}
              </DialogTrigger>
              <DialogPopup className="bg-slate-900/95 border-slate-700/50 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black bg-linear-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    🎮 Upload Game
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Add a new ROM to your game library
                  </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-4">
                  {/* ROM File Section */}
                  <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <span className="text-xl">🎯</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-white">ROM File</h3>
                          <p className="text-xs text-slate-400">
                            .gba, .gbc, .gb supported
                          </p>
                        </div>
                      </div>
                      {selectedRomFile && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          ✓ Selected
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={handleUploadRomClick}
                      disabled={uploading}
                      variant="outline"
                      className="w-full bg-slate-700/50 border-slate-600 hover:bg-purple-500/20 hover:border-purple-500/50 text-white transition-all"
                    >
                      {selectedRomFile ? (
                        <span className="flex items-center gap-2 truncate">
                          <span>📁</span>
                          <span className="truncate max-w-[200px]">
                            {selectedRomFile.name}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span>📂</span> Select ROM File
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* Image File Section */}
                  <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <span className="text-xl">🖼️</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Cover Image</h3>
                        <p className="text-xs text-slate-400">
                          Optional - Add game artwork
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleUploadImageClick}
                      disabled={uploading || !selectedRomFile}
                      variant="outline"
                      className="w-full bg-slate-700/50 border-slate-600 hover:bg-cyan-500/20 hover:border-cyan-500/50 text-white transition-all disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2">
                        <span>🎨</span> Select Cover Image
                      </span>
                    </Button>
                    {!selectedRomFile && (
                      <p className="text-xs text-amber-400/80 mt-2 flex items-center gap-1">
                        <span>⚠️</span> Select ROM file first
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <DialogClose
                      className="flex-1 inline-flex items-center justify-center bg-slate-700/50 border border-slate-600 hover:bg-slate-600 text-white rounded-md px-4 py-2 transition-colors"
                      onClick={() => {
                        setSelectedRomFile(null);
                        if (romInputRef.current) romInputRef.current.value = "";
                      }}
                    >
                      Cancel
                    </DialogClose>
                    <Button
                      onClick={handleUploadWithoutImage}
                      disabled={!selectedRomFile || uploading}
                      className="flex-1 bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold disabled:opacity-50"
                    >
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⏳</span> Uploading...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          🚀 Upload Game
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogPopup>
            </Dialog>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">🎮</div>
            <p className="text-cyan-400 text-xl font-bold mb-2 animate-pulse">
              LOADING...
            </p>
            <p className="text-slate-500 font-mono text-sm">
              Please wait while games are being fetched
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">
              {error.isNetworkError ? "🔌" : "❌"}
            </div>
            <p className="text-red-400 text-xl font-bold mb-2">
              {error.isNetworkError ? "CONNEXION ERROR" : "ERROR"}
            </p>
            <p className="text-slate-400 font-mono text-sm max-w-md mx-auto mb-6">
              {error.message}
            </p>

            {/* Help message for network errors */}
            {error.isNetworkError && (
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
              onClick={fetchRoms}
              className="bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300"
            >
              <span className="flex items-center gap-2">🔄 Réessayer</span>
            </Button>
          </div>
        )}

        {/* Games Grid - Gaming Style */}
        {!loading && !error && (
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
                      src={"http://localhost:3000" + game.imagePath}
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
                      <Badge className="bg-black/70 text-purple-400 border-purple-500/50 text-[10px] font-bold backdrop-blur-sm px-1.5 py-0.5">
                        {game.console}
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
        )}

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
