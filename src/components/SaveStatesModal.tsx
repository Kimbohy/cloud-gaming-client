import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPanel,
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
        alert("Failed to capture game state. Make sure the game is running.");
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
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save state. Please try again."
      );
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
      <DialogContent className="max-w-3xl max-h-[82vh] overflow-y-auto border border-slate-800/70 bg-slate-950/80 backdrop-blur-xl text-slate-100">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-50">
            <Save className="w-5 h-5 text-amber-400" />
            Save States · {romName}
          </DialogTitle>
          <p className="text-xs text-slate-400">
            Store and reload snapshots for this session.
          </p>
        </DialogHeader>
        <DialogPanel>
          <div className="space-y-4">
            {/* Quick Save */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 shadow-[0_10px_40px_-24px] shadow-amber-500/40">
              <div>
                <div className="text-sm font-semibold text-amber-100">
                  Quick Save
                </div>
                <div className="text-xs text-amber-200/80">
                  Will use next free slot (Slot {getNextAvailableSlot() + 1}).
                </div>
              </div>
              <Button
                onClick={handleQuickSave}
                disabled={actionLoading !== null}
                className="min-w-[140px] bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                {actionLoading?.startsWith("save-") ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Quick Save
              </Button>
            </div>

            {/* Slots Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {slots.map(({ slotNumber, state }) => {
                  const isEditing = editingId === state?.id;
                  const isBusy = Boolean(actionLoading);
                  return (
                    <div
                      key={slotNumber}
                      className={`group rounded-xl border border-slate-800/70 bg-slate-900/60 p-3 shadow-[0_10px_30px_-25px] shadow-black/80 transition-colors hover:border-amber-500/50 ${
                        state ? "" : "border-dashed"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <div className="w-20 h-20 bg-slate-950 rounded-lg shrink-0 overflow-hidden border border-slate-800">
                          {state && thumbnails[state.id] ? (
                            <img
                              src={thumbnails[state.id]}
                              alt="Save thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-[11px]">
                              {state ? "No preview" : "Empty"}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-8 text-sm dark"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 text-emerald-400"
                                onClick={handleConfirmRename}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 text-slate-300"
                                onClick={handleCancelRename}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
                              <span className="inline-flex h-5 items-center rounded-full bg-slate-800 px-2 text-[11px] font-mono text-slate-300">
                                Slot {slotNumber + 1}
                              </span>
                              <span className="truncate text-slate-100">
                                {state?.name || "Empty Slot"}
                              </span>
                            </div>
                          )}

                          <div className="text-[11px] text-slate-400">
                            {state
                              ? formatDate(state.lastUsedAt)
                              : "No save yet"}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            {state ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 text-xs bg-slate-800 text-slate-100 hover:bg-slate-700"
                                  onClick={() => handleLoadState(state)}
                                  disabled={isBusy}
                                >
                                  {actionLoading === `load-${state.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 mr-1" />
                                  )}
                                  Load
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 text-xs border-slate-700 text-slate-100 hover:border-amber-500/70"
                                  onClick={() => handleSaveToSlot(slotNumber)}
                                  disabled={isBusy}
                                >
                                  <Save className="w-3.5 h-3.5 mr-1" />
                                  Overwrite
                                </Button>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-8 w-8 text-slate-300"
                                  onClick={() => handleStartRename(state)}
                                  disabled={isBusy}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-8 w-8 text-rose-400"
                                  onClick={() => handleDeleteState(state)}
                                  disabled={isBusy}
                                >
                                  {actionLoading === `delete-${state.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs border-slate-700 text-slate-200 hover:border-amber-500/70"
                                onClick={() => handleSaveToSlot(slotNumber)}
                                disabled={isBusy}
                              >
                                {actionLoading === `save-${slotNumber}` ? (
                                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5 mr-1" />
                                )}
                                Save Here
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogPanel>
      </DialogContent>
    </Dialog>
  );
}
