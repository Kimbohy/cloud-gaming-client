import { useState, useRef, useCallback } from "react";
import { uploadRom, ApiError, type Rom } from "@/api/roms.api";

export interface ErrorState {
  message: string;
  isNetworkError: boolean;
}

interface UseRomUploadOptions {
  onSuccess?: (rom: Rom) => void;
  onError?: (error: ErrorState) => void;
}

export function useRomUpload(options: UseRomUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [selectedRomFile, setSelectedRomFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  const romInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setSelectedRomFile(null);
    if (romInputRef.current) romInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      let errorState: ErrorState;
      if (err instanceof ApiError) {
        errorState = {
          message: err.message,
          isNetworkError: err.isNetworkError,
        };
        if (err.isNetworkError) {
          setDialogOpen(false);
        }
      } else {
        errorState = {
          message: err instanceof Error ? err.message : "Failed to upload ROM",
          isNetworkError: false,
        };
      }
      setError(errorState);
      options.onError?.(errorState);
    },
    [options]
  );

  const uploadFiles = useCallback(
    async (romFile: File, imageFile?: File) => {
      try {
        setUploading(true);
        setError(null);
        const newRom = await uploadRom(romFile, imageFile);
        options.onSuccess?.(newRom);
        setDialogOpen(false);
        resetState();
        return newRom;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [options, resetState, handleError]
  );

  const handleUploadRomClick = useCallback(() => {
    romInputRef.current?.click();
  }, []);

  const handleUploadImageClick = useCallback(() => {
    if (!selectedRomFile) {
      const errorState: ErrorState = {
        message: "Please select a ROM file first",
        isNetworkError: false,
      };
      setError(errorState);
      options.onError?.(errorState);
      return;
    }
    imageInputRef.current?.click();
  }, [selectedRomFile, options]);

  const handleRomFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSelectedRomFile(file);
      setError(null);
    },
    []
  );

  const handleImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const imageFile = e.target.files?.[0];
      if (!selectedRomFile) return;
      await uploadFiles(selectedRomFile, imageFile);
    },
    [selectedRomFile, uploadFiles]
  );

  const handleUploadWithoutImage = useCallback(async () => {
    if (!selectedRomFile) {
      const errorState: ErrorState = {
        message: "Please select a ROM file first",
        isNetworkError: false,
      };
      setError(errorState);
      options.onError?.(errorState);
      return;
    }
    await uploadFiles(selectedRomFile);
  }, [selectedRomFile, uploadFiles, options]);

  const handleDialogClose = useCallback(() => {
    resetState();
  }, [resetState]);

  return {
    // State
    uploading,
    selectedRomFile,
    dialogOpen,
    error,
    // Refs
    romInputRef,
    imageInputRef,
    // Setters
    setDialogOpen,
    setError,
    // Handlers
    handleUploadRomClick,
    handleUploadImageClick,
    handleRomFileChange,
    handleImageFileChange,
    handleUploadWithoutImage,
    handleDialogClose,
    resetState,
  };
}
