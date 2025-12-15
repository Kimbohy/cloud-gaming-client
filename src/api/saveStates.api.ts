import { authClient } from "../lib/auth-client";

const getServerHost = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  const hostname = window.location.hostname;
  return `http://${hostname}:3000`;
};

export interface SaveStateMetadata {
  id: string;
  slotNumber: number;
  name: string | null;
  romId: string;
  romName?: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  hasThumbnail: boolean;
}

// LocalStorage cache key
const CACHE_KEY = "cloud-gaming-save-states-cache";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: SaveStateMetadata[];
  timestamp: number;
}

/**
 * Get cached save states from localStorage
 */
function getCachedStates(romId?: string): SaveStateMetadata[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    if (romId) {
      return entry.data.filter((s) => s.romId === romId);
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Update the cache with new data
 */
function updateCache(states: SaveStateMetadata[]): void {
  try {
    const entry: CacheEntry = {
      data: states,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Invalidate the cache
 */
function invalidateCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Get auth headers for API requests
 */
function getAuthHeaders(): Record<string, string> {
  const token = authClient.getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * List all save states for the current user
 */
export async function listSaveStates(
  romId?: string
): Promise<SaveStateMetadata[]> {
  // Try cache first
  const cached = getCachedStates(romId);
  if (cached) {
    return cached;
  }

  const headers = getAuthHeaders();
  const url = new URL(`${getServerHost()}/save-states`);
  if (romId) {
    url.searchParams.set("romId", romId);
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`Failed to list save states: ${response.statusText}`);
  }

  const states: SaveStateMetadata[] = await response.json();

  // Update cache with all states if no filter
  if (!romId) {
    updateCache(states);
  }

  return states;
}

/**
 * Save a state to the server
 */
export async function saveState(params: {
  romId: string;
  slotNumber: number;
  name?: string;
  stateData: ArrayBuffer;
  thumbnail?: ArrayBuffer;
}): Promise<SaveStateMetadata> {
  const headers = getAuthHeaders();

  const body = {
    romId: params.romId,
    slotNumber: params.slotNumber,
    name: params.name,
    stateData: arrayBufferToBase64(params.stateData),
    thumbnail: params.thumbnail
      ? arrayBufferToBase64(params.thumbnail)
      : undefined,
  };

  const response = await fetch(`${getServerHost()}/save-states`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to save state: ${response.statusText}`);
  }

  invalidateCache();
  return response.json();
}

/**
 * Load a save state by slot
 */
export async function loadStateBySlot(
  romId: string,
  slotNumber: number
): Promise<ArrayBuffer> {
  const headers = getAuthHeaders();
  delete (headers as Record<string, string>)["Content-Type"];

  const response = await fetch(
    `${getServerHost()}/save-states/${romId}/slot/${slotNumber}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to load save state: ${response.statusText}`);
  }

  return response.arrayBuffer();
}

/**
 * Load a save state by ID
 */
export async function loadStateById(id: string): Promise<ArrayBuffer> {
  const headers = getAuthHeaders();
  delete (headers as Record<string, string>)["Content-Type"];

  const response = await fetch(`${getServerHost()}/save-states/${id}/data`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to load save state: ${response.statusText}`);
  }

  return response.arrayBuffer();
}

/**
 * Get thumbnail for a save state
 */
export async function getThumbnail(id: string): Promise<string | null> {
  const headers = getAuthHeaders();
  delete (headers as Record<string, string>)["Content-Type"];

  const response = await fetch(
    `${getServerHost()}/save-states/${id}/thumbnail`,
    { headers }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to get thumbnail: ${response.statusText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Rename a save state
 */
export async function renameState(id: string, name: string): Promise<void> {
  const headers = getAuthHeaders();

  const response = await fetch(`${getServerHost()}/save-states/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Failed to rename save state: ${response.statusText}`);
  }

  invalidateCache();
}

/**
 * Delete a save state by ID
 */
export async function deleteStateById(id: string): Promise<void> {
  const headers = getAuthHeaders();

  const response = await fetch(`${getServerHost()}/save-states/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete save state: ${response.statusText}`);
  }

  invalidateCache();
}

/**
 * Delete a save state by slot
 */
export async function deleteStateBySlot(
  romId: string,
  slotNumber: number
): Promise<void> {
  const headers = getAuthHeaders();

  const response = await fetch(
    `${getServerHost()}/save-states/${romId}/slot/${slotNumber}`,
    {
      method: "DELETE",
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete save state: ${response.statusText}`);
  }

  invalidateCache();
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
