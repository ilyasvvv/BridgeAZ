import { api } from "./api";

export type UploadPurpose = "avatar" | "resume" | "attachment" | "chat_attachment";

export type PresignResponse = {
  uploadUrl: string;
  objectKey: string;
  documentUrl: string;
  headers: Record<string, string>;
};

export const uploadsApi = {
  presign: (input: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    purpose: UploadPurpose;
  }) => api.post<PresignResponse>("/uploads/presign", input),
};

/**
 * Presigns and uploads a file to R2. Returns the public document URL.
 */
export async function uploadFile(
  file: File,
  purpose: UploadPurpose
): Promise<{ documentUrl: string; contentType: string }> {
  const presigned = await uploadsApi.presign({
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    purpose,
  });

  const headers = { ...presigned.headers };
  const res = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers,
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }

  return {
    documentUrl: presigned.documentUrl,
    contentType: headers["Content-Type"] || file.type || "application/octet-stream",
  };
}
