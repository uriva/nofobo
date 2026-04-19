// Convert storage path to permanent download URL
// Instant DB uses Firebase Storage under the hood
export function getStorageUrl(storagePath: string): string {
  // Instant DB storage paths can be directly constructed to a permanent URL
  // Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded_path}?alt=media
  
  // Encode the path for URL
  const encodedPath = encodeURIComponent(storagePath);
  
  // Use the public Firebase Storage URL format (doesn't expire)
  // This requires the file to have public read access, which Instant DB handles
  return `https://firebasestorage.googleapis.com/v0/b/instant-9dd93.appspot.com/o/${encodedPath}?alt=media`;
}
