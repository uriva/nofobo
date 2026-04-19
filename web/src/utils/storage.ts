import db from "../db.ts";

// Get a permanent download URL for a file in Instant DB storage
// Instant DB provides signed URLs that are valid long-term
export async function getStorageUrl(storagePath: string): Promise<string> {
  try {
    // deno-lint-ignore no-explicit-any
    const downloadData = await (db as any).storage.getDownloadUrl(storagePath);
    // Handle both direct string and object response formats
    const url = downloadData?.url || downloadData;
    if (url && typeof url === "string") {
      return url;
    }
    throw new Error("Failed to get download URL");
  } catch (e) {
    console.error("Error getting storage URL:", e);
    throw new Error(`Failed to get storage URL for ${storagePath}`);
  }
}

