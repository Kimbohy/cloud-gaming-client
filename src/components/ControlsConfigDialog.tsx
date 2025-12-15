import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPanel,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  type InputButton,
  type KeyMappings,
  loadKeyMappings,
  saveKeyMappings,
  resetKeyMappings,
  getKeyDisplayName,
} from "@/api/play.api";

interface ControlsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMappingsChange: (mappings: KeyMappings) => void;
}

// Button labels and descriptions
const BUTTON_INFO: Record<
  InputButton,
  { label: string; color: string; icon: string }
> = {
  UP: {
    label: "Haut",
    color:
      "bg-gradient-to-br from-cyan-500/40 to-cyan-700/40 border-cyan-400/50 hover:from-cyan-500/60 hover:to-cyan-700/60",
    icon: "↑",
  },
  DOWN: {
    label: "Bas",
    color:
      "bg-gradient-to-br from-cyan-500/40 to-cyan-700/40 border-cyan-400/50 hover:from-cyan-500/60 hover:to-cyan-700/60",
    icon: "↓",
  },
  LEFT: {
    label: "Gauche",
    color:
      "bg-gradient-to-br from-cyan-500/40 to-cyan-700/40 border-cyan-400/50 hover:from-cyan-500/60 hover:to-cyan-700/60",
    icon: "←",
  },
  RIGHT: {
    label: "Droite",
    color:
      "bg-gradient-to-br from-cyan-500/40 to-cyan-700/40 border-cyan-400/50 hover:from-cyan-500/60 hover:to-cyan-700/60",
    icon: "→",
  },
  A: {
    label: "A",
    color:
      "bg-gradient-to-br from-fuchsia-500/40 to-purple-700/40 border-fuchsia-400/50 hover:from-fuchsia-500/60 hover:to-purple-700/60",
    icon: "A",
  },
  B: {
    label: "B",
    color:
      "bg-gradient-to-br from-rose-500/40 to-red-700/40 border-rose-400/50 hover:from-rose-500/60 hover:to-red-700/60",
    icon: "B",
  },
  L: {
    label: "L",
    color:
      "bg-gradient-to-br from-violet-500/40 to-purple-700/40 border-violet-400/50 hover:from-violet-500/60 hover:to-purple-700/60",
    icon: "L",
  },
  R: {
    label: "R",
    color:
      "bg-gradient-to-br from-violet-500/40 to-purple-700/40 border-violet-400/50 hover:from-violet-500/60 hover:to-purple-700/60",
    icon: "R",
  },
  START: {
    label: "Start",
    color:
      "bg-gradient-to-br from-emerald-500/40 to-green-700/40 border-emerald-400/50 hover:from-emerald-500/60 hover:to-green-700/60",
    icon: ">",
  },
  SELECT: {
    label: "Select",
    color:
      "bg-gradient-to-br from-slate-500/40 to-slate-700/40 border-slate-400/50 hover:from-slate-500/60 hover:to-slate-700/60",
    icon: "◆",
  },
};

const BUTTON_ORDER: InputButton[] = [
  "UP",
  "DOWN",
  "LEFT",
  "RIGHT",
  "A",
  "B",
  "L",
  "R",
  "START",
  "SELECT",
];

export function ControlsConfigDialog({
  open,
  onOpenChange,
  onMappingsChange,
}: ControlsConfigDialogProps) {
  const [mappings, setMappings] = useState<KeyMappings>(loadKeyMappings);
  const [listeningFor, setListeningFor] = useState<InputButton | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load mappings when dialog opens
  useEffect(() => {
    if (open) {
      setMappings(loadKeyMappings());
      setHasChanges(false);
      setListeningFor(null);
    }
  }, [open]);

  // Handle key press for mapping
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!listeningFor) return;

      e.preventDefault();
      e.stopPropagation();

      // Check if key is already mapped to another button
      const existingButton = Object.entries(mappings).find(
        ([btn, key]) => key === e.key && btn !== listeningFor
      );

      if (existingButton) {
        // Swap the keys
        const [existingButtonName] = existingButton;
        const oldKey = mappings[listeningFor];
        setMappings((prev) => ({
          ...prev,
          [listeningFor]: e.key,
          [existingButtonName]: oldKey,
        }));
      } else {
        setMappings((prev) => ({
          ...prev,
          [listeningFor]: e.key,
        }));
      }

      setListeningFor(null);
      setHasChanges(true);
    },
    [listeningFor, mappings]
  );

  // Add/remove key listener
  useEffect(() => {
    if (listeningFor) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [listeningFor, handleKeyDown]);

  // Save changes
  const handleSave = () => {
    saveKeyMappings(mappings);
    onMappingsChange(mappings);
    onOpenChange(false);
  };

  // Reset to defaults
  const handleReset = () => {
    const defaults = resetKeyMappings();
    setMappings(defaults);
    setHasChanges(true);
  };

  // Cancel and close
  const handleCancel = () => {
    setListeningFor(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <svg
              className="w-5 h-5 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Configuration des Commandes
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Cliquez sur une touche puis appuyez sur une nouvelle touche pour la
            modifier.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3">
              {BUTTON_ORDER.map((button) => {
                const info = BUTTON_INFO[button];
                const isListening = listeningFor === button;

                return (
                  <button
                    key={button}
                    onClick={() => setListeningFor(button)}
                    className={`group relative flex items-center justify-between p-3.5 rounded-xl border backdrop-blur-sm transition-all duration-200 shadow-lg ${
                      isListening
                        ? "bg-gradient-to-br from-purple-500/50 to-indigo-600/50 border-purple-400 ring-2 ring-purple-400/70 scale-[1.02]"
                        : `${info.color} hover:scale-[1.02] hover:shadow-xl`
                    }`}
                  >
                    {/* Glow effect */}
                    <div
                      className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                        isListening ? "bg-purple-500/20" : "bg-white/5"
                      } blur-xl -z-10`}
                    />

                    <div className="flex items-center gap-2">
                      <span className="text-lg opacity-60">{info.icon}</span>
                      <span className="text-white font-semibold text-sm">
                        {info.label}
                      </span>
                    </div>
                    <kbd
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold shadow-inner transition-all ${
                        isListening
                          ? "bg-purple-400/30 text-purple-100 animate-pulse border border-purple-300/50"
                          : "bg-slate-900/60 text-cyan-300 border border-slate-700/50"
                      }`}
                    >
                      {isListening
                        ? "..."
                        : getKeyDisplayName(mappings[button])}
                    </kbd>
                  </button>
                );
              })}
            </div>

            {listeningFor && (
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/50 rounded-xl text-center backdrop-blur-sm shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping" />
                  <p className="text-purple-200 text-sm font-medium">
                    Appuyez sur une touche pour{" "}
                    <span className="font-bold text-purple-100">
                      {BUTTON_INFO[listeningFor].label}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setListeningFor(null)}
                  className="mt-2 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1 rounded-full bg-slate-800/50 hover:bg-slate-700/50"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </DialogPanel>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Réinitialiser
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-500 text-white"
              disabled={!hasChanges}
            >
              Sauvegarder
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Trigger button component for easy integration
export function ControlsConfigTrigger({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 ${className}`}
      title="Configurer les commandes"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>
  );
}
