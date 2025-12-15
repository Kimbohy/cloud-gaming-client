const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http:// 192.168.11.78:3000";

// Custom API Error class
export class ApiError extends Error {
  status?: number;
  isNetworkError: boolean;

  constructor(
    message: string,
    status?: number,
    isNetworkError: boolean = false
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

// Helper function to handle fetch with error handling
async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ApiError(
        errorText || `HTTP Error ${response.status}`,
        response.status,
        false
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error (server not started, no connection, etc.)
    if (error instanceof TypeError) {
      throw new ApiError(
        "Impossible de se connecter au serveur. Vérifiez que le serveur est démarré.",
        undefined,
        true
      );
    }

    throw new ApiError(
      "Une erreur inattendue s'est produite",
      undefined,
      false
    );
  }
}

// Types
export interface Rom {
  id: string;
  name: string;
  console: "GBA";
  filePath: string;
  imagePath?: string;
  description?: string;
  uploadedAt: string;
}

export interface CreateRomDto {
  name: string;
  console?: "GBA";
  filePath: string;
  imagePath?: string;
  description?: string;
}

export interface UpdateRomDto {
  name?: string;
  console?: "GBA";
  filePath?: string;
  imagePath?: string;
  description?: string;
}

// API Functions
export async function getAllRoms(): Promise<Rom[]> {
  return fetchWithErrorHandling<Rom[]>(`${API_URL}/roms`);
}

export async function getRomById(id: string): Promise<Rom> {
  return fetchWithErrorHandling<Rom>(`${API_URL}/roms/${id}`);
}

export async function createRom(data: CreateRomDto): Promise<Rom> {
  return fetchWithErrorHandling<Rom>(`${API_URL}/roms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function updateRom(id: string, data: UpdateRomDto): Promise<Rom> {
  return fetchWithErrorHandling<Rom>(`${API_URL}/roms/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function deleteRom(id: string): Promise<Rom> {
  return fetchWithErrorHandling<Rom>(`${API_URL}/roms/${id}`, {
    method: "DELETE",
  });
}

export async function uploadRom(
  romFile: File,
  imageFile?: File,
  data?: Partial<CreateRomDto>
): Promise<Rom> {
  const formData = new FormData();
  formData.append("rom", romFile);

  if (imageFile) formData.append("image", imageFile);
  if (data?.name) formData.append("name", data.name);
  if (data?.console) formData.append("console", data.console);
  if (data?.description) formData.append("description", data.description);

  return fetchWithErrorHandling<Rom>(`${API_URL}/roms/upload`, {
    method: "POST",
    body: formData,
  });
}
