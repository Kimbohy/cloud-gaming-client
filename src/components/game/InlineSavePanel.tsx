import { type SaveStateMetadata } from "@/api/saveStates.api";

interface InlineSavePanelProps {
  saveStates: SaveStateMetadata[];
  loading: string | null;
  onClose: () => void;
  onQuickSave: () => void;
  onLoadState: (state: SaveStateMetadata) => void;
  onSaveToSlot: (slotNumber: number) => void;
}

export function InlineSavePanel({
  saveStates,
  loading,
  onClose,
  onQuickSave,
  onLoadState,
  onSaveToSlot,
}: InlineSavePanelProps) {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900/95 border border-slate-700 rounded-2xl p-4 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Save States
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Quick Save Button */}
        <button
          onClick={onQuickSave}
          disabled={loading !== null}
          className="w-full mb-4 p-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2"
        >
          {loading === "quick-save" ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
          )}
          Quick Save
        </button>

        {/* Save Slots */}
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((slotNumber) => {
            const state = saveStates.find((s) => s.slotNumber === slotNumber);
            const isLoading =
              loading === `load-${state?.id}` || loading === `save-${slotNumber}`;

            return (
              <div
                key={slotNumber}
                className={`p-3 rounded-xl border ${
                  state
                    ? "bg-slate-800/80 border-slate-600"
                    : "bg-slate-800/40 border-slate-700 border-dashed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                        Slot {slotNumber + 1}
                      </span>
                      {state ? (
                        <span className="text-sm text-white truncate">
                          {state.name || "Save"}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-500">Empty</span>
                      )}
                    </div>
                    {state && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date(state.lastUsedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    {state && (
                      <button
                        onClick={() => onLoadState(state)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-white text-xs font-bold flex items-center gap-1"
                      >
                        {loading === `load-${state.id}` ? (
                          <svg
                            className="w-3 h-3 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        )}
                        Load
                      </button>
                    )}
                    <button
                      onClick={() => onSaveToSlot(slotNumber)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-white text-xs font-bold flex items-center gap-1"
                    >
                      {loading === `save-${slotNumber}` ? (
                        <svg
                          className="w-3 h-3 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                          />
                        </svg>
                      )}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
