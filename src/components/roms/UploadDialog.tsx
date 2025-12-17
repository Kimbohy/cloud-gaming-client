import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { uploadRom, ApiError, type Rom } from "@/api/roms.api";

interface ErrorState {
  message: string;
  isNetworkError: boolean;
}

interface UploadDialogProps {
  uploading: boolean;
  onUploadSuccess: (rom: Rom) => void;
  onError: (error: ErrorState) => void;
}

export function UploadDialog({
  uploading: externalUploading,
  onUploadSuccess,
  onError,
}: UploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedRomFile, setSelectedRomFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const romInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isUploading = uploading || externalUploading;

  const handleRomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedRomFile(file);
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const imageFile = e.target.files?.[0];
    if (!selectedRomFile) return;

    await uploadFiles(selectedRomFile, imageFile);
  };

  const handleUploadWithoutImage = async () => {
    if (!selectedRomFile) {
      onError({
        message: "Please select a ROM file first",
        isNetworkError: false,
      });
      return;
    }

    await uploadFiles(selectedRomFile);
  };

  const uploadFiles = async (romFile: File, imageFile?: File) => {
    try {
      setUploading(true);
      const newRom = await uploadRom(romFile, imageFile);
      onUploadSuccess(newRom);
      setDialogOpen(false);
      resetState();
    } catch (err) {
      if (err instanceof ApiError) {
        onError({ message: err.message, isNetworkError: err.isNetworkError });
        if (err.isNetworkError) {
          setDialogOpen(false);
        }
      } else {
        onError({
          message: err instanceof Error ? err.message : "Failed to upload ROM",
          isNetworkError: false,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setSelectedRomFile(null);
    if (romInputRef.current) romInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleUploadRomClick = () => {
    romInputRef.current?.click();
  };

  const handleUploadImageClick = () => {
    if (!selectedRomFile) {
      onError({
        message: "Please select a ROM file first",
        isNetworkError: false,
      });
      return;
    }
    imageInputRef.current?.click();
  };

  return (
    <>
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
          disabled={isUploading}
          className="bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
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
                disabled={isUploading}
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
                disabled={isUploading || !selectedRomFile}
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
                onClick={resetState}
              >
                Cancel
              </DialogClose>
              <Button
                onClick={handleUploadWithoutImage}
                disabled={!selectedRomFile || isUploading}
                className="flex-1 bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold disabled:opacity-50"
              >
                {isUploading ? (
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
    </>
  );
}
