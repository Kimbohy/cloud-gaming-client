import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SaveStateMetadata } from "@/api/saveStates.api";
import {
  listSaveStates,
  saveState,
  loadStateById,
  deleteStateById,
  renameState,
  getThumbnail,
  base64ToArrayBuffer,
} from "@/api/saveStates.api";
import { Save, Download, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";

interface SaveStatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  romId: string;
  romName: string;
  onSave: () => Promise<{ stateData: string; thumbnail: string | null } | null>;
  onLoad: (stateData: ArrayBuffer) => Promise<boolean>;
}

const MAX_SLOTS = 10;

export function SaveStatesModal({
  isOpen,
  onClose,
  romId,
  romName,
  onSave,
  onLoad,
}: SaveStatesModalProps) {
  const [saveStates, setSaveStates] = useState<SaveStateMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Load save states
  const loadSaveStates = useCallback(async () => {
    setLoading(true);
    try {
      const states = await listSaveStates(romId);
      setSaveStates(states);

      // Load thumbnails for states that have them
      for (const state of states) {
        if (state.hasThumbnail && !thumbnails[state.id]) {
          getThumbnail(state.id).then((url) => {
            if (url) {
              setThumbnails((prev) => ({ ...prev, [state.id]: url }));
            }
          });
        }
      }
    } catch (error) {
      console.error("Failed to load save states:", error);
    } finally {
      setLoading(false);
    }
  }, [romId]);

  useEffect(() => {
    if (isOpen) {
      loadSaveStates();
    }
  }, [isOpen, loadSaveStates]);

  // Find next available slot
  const getNextAvailableSlot = (): number => {
    const usedSlots = new Set(saveStates.map((s) => s.slotNumber));
    for (let i = 0; i < MAX_SLOTS; i++) {
      if (!usedSlots.has(i)) {
        return i;
      }
    }
    return 0; // Overwrite first slot if all are used
  };

  // Handle save to specific slot
  const handleSaveToSlot = async (slotNumber: number) => {
    setActionLoading(`save-${slotNumber}`);
    try {
      const result = await onSave();
      if (!result) {
        console.error("Failed to capture state from emulator");
        return;
      }

      const stateData = base64ToArrayBuffer(result.stateData);
      const thumbnail = result.thumbnail
        ? base64ToArrayBuffer(result.thumbnail)
        : undefined;

      await saveState({
        romId,
        slotNumber,
        stateData,
        thumbnail,
      });

      await loadSaveStates();
    } catch (error) {
      console.error("Failed to save state:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle quick save (next available slot)
  const handleQuickSave = async () => {
    const slot = getNextAvailableSlot();
    await handleSaveToSlot(slot);
  };

  // Handle load state
  const handleLoadState = async (state: SaveStateMetadata) => {
    setActionLoading(`load-${state.id}`);
    try {
      const stateData = await loadStateById(state.id);
      const success = await onLoad(stateData);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to load state:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete state
  const handleDeleteState = async (state: SaveStateMetadata) => {
    if (!confirm(`Delete save from Slot ${state.slotNumber + 1}?`)) {
      return;
    }

    setActionLoading(`delete-${state.id}`);
    try {
      await deleteStateById(state.id);
      await loadSaveStates();
    } catch (error) {
      console.error("Failed to delete state:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle rename
  const handleStartRename = (state: SaveStateMetadata) => {
    setEditingId(state.id);
    setEditName(state.name || `Slot ${state.slotNumber + 1}`);
  };

  const handleConfirmRename = async () => {
    if (!editingId) return;

    setActionLoading(`rename-${editingId}`);
    try {
      await renameState(editingId, editName);
      await loadSaveStates();
    } catch (error) {
      console.error("Failed to rename state:", error);
    } finally {
      setEditingId(null);
      setEditName("");
      setActionLoading(null);
    }
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditName("");
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Create slot grid (0-9)
  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => {
    const state = saveStates.find((s) => s.slotNumber === i);
    return { slotNumber: i, state };
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save States - {romName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Save Button */}
          <Button
            onClick={handleQuickSave}
            disabled={actionLoading !== null}
            className="w-full"
          >
            {actionLoading?.startsWith("save-") ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Quick Save (Slot {getNextAvailableSlot() + 1})
          </Button>

          {/* Slots Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {slots.map(({ slotNumber, state }) => (
                <div
                  key={slotNumber}
                  className={`border rounded-lg p-3 ${
                    state ? "bg-muted/50" : "bg-muted/20 border-dashed"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-black rounded shrink-0 overflow-hidden">
                      {state && thumbnails[state.id] ? (
                        <img
                          src={thumbnails[state.id]}
                          alt="Save thumbnail"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          {state ? "No preview" : "Empty"}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {editingId === state?.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleConfirmRename}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleCancelRename}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="font-medium text-sm truncate">
                          {state?.name || `Slot ${slotNumber + 1}`}
                        </div>
                      )}

                      {state && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(state.lastUsedAt)}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-2">
                        {state ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs"
                              onClick={() => handleLoadState(state)}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === `load-${state.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3 mr-1" />
                              )}
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleSaveToSlot(slotNumber)}
                              disabled={actionLoading !== null}
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Overwrite
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleStartRename(state)}
                              disabled={actionLoading !== null}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteState(state)}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === `delete-${state.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleSaveToSlot(slotNumber)}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === `save-${slotNumber}` ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3 mr-1" />
                            )}
                            Save Here
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
