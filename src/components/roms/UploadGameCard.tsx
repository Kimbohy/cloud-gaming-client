import { type RefObject } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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
import {
  Gamepad,
  Folder,
  File,
  Image,
  AlertTriangle,
  Loader2,
  Check,
  Palette,
  Rocket,
  ChessRook,
  Plus,
} from "lucide-react";

interface UploadGameCardProps {
  uploading: boolean;
  selectedRomFile: File | null;
  dialogOpen: boolean;
  romInputRef: RefObject<HTMLInputElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onDialogOpenChange: (open: boolean) => void;
  onUploadRomClick: () => void;
  onUploadImageClick: () => void;
  onRomFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadWithoutImage: () => void;
  onDialogClose: () => void;
}

export function UploadGameCard({
  uploading,
  selectedRomFile,
  dialogOpen,
  romInputRef,
  imageInputRef,
  onDialogOpenChange,
  onUploadRomClick,
  onUploadImageClick,
  onRomFileChange,
  onImageFileChange,
  onUploadWithoutImage,
  onDialogClose,
}: UploadGameCardProps) {
  return (
    <>
      <input
        type="file"
        ref={romInputRef}
        onChange={onRomFileChange}
        accept=".gba,.gbc,.gb"
        className="hidden"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={onImageFileChange}
        accept="image/*"
        className="hidden"
      />
      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogTrigger
          disabled={uploading}
          className="w-full text-left"
          render={
            <Card className="group relative cursor-pointer transition-all duration-500 hover:shadow-[0_0_50px_rgba(168,85,247,0.5)] overflow-hidden bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:-translate-y-2 border-dashed border-2 hover:border-purple-500/50" />
          }
        >
          {/* Glowing Border Effect */}
          <div className="absolute inset-0 bg-linear-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />

          <CardContent className="p-0">
            {/* Image Container with Gaming Effects */}
            <div className="relative overflow-hidden bg-linear-to-br from-slate-800 to-slate-900 aspect-square flex items-center justify-center">
              {/* Plus Icon */}
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-700/50 border-2 border-dashed border-slate-500 group-hover:border-purple-400 flex items-center justify-center transition-all duration-300 group-hover:bg-purple-500/20">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-slate-400 group-hover:text-purple-400 animate-spin" />
                  ) : (
                    <Plus className="w-8 h-8 text-slate-400 group-hover:text-purple-400 transition-colors duration-300" />
                  )}
                </div>
                <span className="text-slate-500 group-hover:text-purple-300 text-sm font-medium transition-colors duration-300">
                  {uploading ? "Uploading..." : "Add Game"}
                </span>
              </div>

              {/* Scanline Effect */}
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px]" />
            </div>

            {/* Game Title - Gaming Style */}
            <div className="p-2 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700/50">
              <CardTitle className="text-xs font-bold text-slate-500 group-hover:text-transparent group-hover:bg-linear-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                Upload New ROM
              </CardTitle>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="h-0.5 w-6 bg-linear-to-r from-cyan-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="text-slate-600 text-[10px] font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Click to upload
                </span>
              </div>
            </div>
          </CardContent>
        </DialogTrigger>

        <DialogPopup className="bg-slate-900/95 border-slate-700/50 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black bg-linear-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              <div className="flex items-center gap-3">
                <Gamepad className="w-6 h-6 text-cyan-300" />
                <span>Upload Game</span>
              </div>
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
                    <ChessRook className="w-6 h-6 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">ROM File</h3>
                    <p className="text-xs text-slate-400">
                      .gba, .gbc, .gb supported
                    </p>
                  </div>
                </div>
                {selectedRomFile && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Selected
                  </Badge>
                )}
              </div>
              <Button
                onClick={onUploadRomClick}
                disabled={uploading}
                variant="outline"
                className="w-full bg-slate-700/50 border-slate-600 hover:bg-purple-500/20 hover:border-purple-500/50 text-white transition-all"
              >
                {selectedRomFile ? (
                  <span className="flex items-center gap-2 truncate">
                    <File className="w-5 h-5 text-indigo-300" />
                    <span className="truncate max-w-[200px]">
                      {selectedRomFile.name}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-indigo-300" /> Select ROM
                    File
                  </span>
                )}
              </Button>
            </div>

            {/* Image File Section */}
            <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Image className="w-6 h-6 text-cyan-300" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Cover Image</h3>
                  <p className="text-xs text-slate-400">
                    Optional - Add game artwork
                  </p>
                </div>
              </div>
              <Button
                onClick={onUploadImageClick}
                disabled={uploading || !selectedRomFile}
                variant="outline"
                className="w-full bg-slate-700/50 border-slate-600 hover:bg-cyan-500/20 hover:border-cyan-500/50 text-white transition-all disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-cyan-300" /> Select Cover
                  Image
                </span>
              </Button>
              {!selectedRomFile && (
                <p className="text-xs text-amber-400/80 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Select ROM file first
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <DialogClose
                className="flex-1 inline-flex items-center justify-center bg-slate-700/50 border border-slate-600 hover:bg-slate-600 text-white rounded-md px-4 py-2 transition-colors"
                onClick={onDialogClose}
              >
                Cancel
              </DialogClose>
              <Button
                onClick={onUploadWithoutImage}
                disabled={!selectedRomFile || uploading}
                className="flex-1 bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold disabled:opacity-50"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />{" "}
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-white" /> Upload Game
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
