import { useState, useCallback } from "react";
import {
  listSaveStates,
  saveState,
  loadStateById,
  base64ToArrayBuffer,
  type SaveStateMetadata,
} from "@/api/saveStates.api";

export function useSaveStates(romId: string | undefined) {
  const [saveStates, setSaveStates] = useState<SaveStateMetadata[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const loadSaveStates = useCallback(async () => {
    if (!romId) return;
    try {
      const states = await listSaveStates(romId);
      setSaveStates(states);
    } catch (error) {
      console.error("Failed to load save states:", error);
    }
  }, [romId]);

  const quickSave = useCallback(
    async (
      getSaveData: () => Promise<{ stateData: string; thumbnail: string | null } | null>
    ) => {
      if (!romId) return false;
      setLoading("quick-save");
      try {
        const result = await getSaveData();
        if (!result) {
          console.error("Failed to capture state");
          return false;
        }
        const usedSlots = new Set(saveStates.map((s) => s.slotNumber));
        let nextSlot = 0;
        for (let i = 0; i < 10; i++) {
          if (!usedSlots.has(i)) {
            nextSlot = i;
            break;
          }
        }
        const stateData = base64ToArrayBuffer(result.stateData);
        const thumbnail = result.thumbnail
          ? base64ToArrayBuffer(result.thumbnail)
          : undefined;
        await saveState({ romId, slotNumber: nextSlot, stateData, thumbnail });
        await loadSaveStates();
        return true;
      } catch (error) {
        console.error("Failed to save:", error);
        return false;
      } finally {
        setLoading(null);
      }
    },
    [romId, saveStates, loadSaveStates]
  );

  const saveToSlot = useCallback(
    async (
      slotNumber: number,
      getSaveData: () => Promise<{ stateData: string; thumbnail: string | null } | null>
    ) => {
      if (!romId) return false;
      setLoading(`save-${slotNumber}`);
      try {
        const result = await getSaveData();
        if (!result) return false;
        const stateData = base64ToArrayBuffer(result.stateData);
        const thumbnail = result.thumbnail
          ? base64ToArrayBuffer(result.thumbnail)
          : undefined;
        await saveState({ romId, slotNumber, stateData, thumbnail });
        await loadSaveStates();
        return true;
      } catch (error) {
        console.error("Failed to save:", error);
        return false;
      } finally {
        setLoading(null);
      }
    },
    [romId, loadSaveStates]
  );

  const loadFromSlot = useCallback(
    async (
      state: SaveStateMetadata,
      onLoad: (data: ArrayBuffer) => Promise<boolean>
    ) => {
      setLoading(`load-${state.id}`);
      try {
        const stateData = await loadStateById(state.id);
        const success = await onLoad(stateData);
        return success;
      } catch (error) {
        console.error("Failed to load state:", error);
        return false;
      } finally {
        setLoading(null);
      }
    },
    []
  );

  return {
    saveStates,
    loading,
    loadSaveStates,
    quickSave,
    saveToSlot,
    loadFromSlot,
  };
}
