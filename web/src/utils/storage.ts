import db from "../db.ts";

export async function getStorageUrl(storagePath: string): Promise<string> {
  try {
    // deno-lint-ignore no-explicit-any
    const downloadData = await (db as any).storage.getDownloadUrl(storagePath);
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

export function extractPath(urlOrPath: string): string {
  if (!urlOrPath) return "";
  if (!urlOrPath.startsWith("http")) return urlOrPath;
  const decoded = decodeURIComponent(urlOrPath);
  const match = decoded.match(/((?:profiles|communities)\/[^?]+)/);
  if (match) return match[1];
  return urlOrPath;
}
