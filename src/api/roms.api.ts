const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
  const response = await fetch(`${API_URL}/roms`);
  if (!response.ok) {
    throw new Error("Failed to fetch roms");
  }
  return response.json();
}

export async function getRomById(id: string): Promise<Rom> {
  const response = await fetch(`${API_URL}/roms/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch rom with id ${id}`);
  }
  return response.json();
}

export async function createRom(data: CreateRomDto): Promise<Rom> {
  const response = await fetch(`${API_URL}/roms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to create rom");
  }
  return response.json();
}

export async function updateRom(id: string, data: UpdateRomDto): Promise<Rom> {
  const response = await fetch(`${API_URL}/roms/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update rom with id ${id}`);
  }
  return response.json();
}

export async function deleteRom(id: string): Promise<Rom> {
  const response = await fetch(`${API_URL}/roms/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete rom with id ${id}`);
  }
  return response.json();
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

  const response = await fetch(`${API_URL}/roms/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to upload rom");
  }
  return response.json();
}
