import { useState, useEffect } from "react";
import { getStorageUrl, extractPath } from "../utils/storage.ts";

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  pathOrUrl?: string;
  fallback?: string;
}

export default function StorageImage({ pathOrUrl, fallback, ...props }: StorageImageProps) {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    
    if (!pathOrUrl) {
      if (isMounted) setUrl(fallback);
      return;
    }

    if (pathOrUrl.startsWith("data:") || pathOrUrl.startsWith("blob:")) {
      if (isMounted) setUrl(pathOrUrl);
      return;
    }

    const path = extractPath(pathOrUrl);
    
    if (path.startsWith("profiles/") || path.startsWith("communities/")) {
      getStorageUrl(path)
        .then((fetchedUrl) => {
          if (isMounted) setUrl(fetchedUrl);
        })
        .catch((e) => {
          console.error("Failed to load image for path:", path, e);
          if (isMounted) setUrl(fallback);
        });
      return;
    }

    if (pathOrUrl.startsWith("http")) {
      if (isMounted) setUrl(pathOrUrl);
      return;
    }

    if (isMounted) setUrl(pathOrUrl);

    return () => { isMounted = false; };
  }, [pathOrUrl, fallback]);

  if (!url) {
    return <div className={`bg-grape-800 animate-pulse ${props.className || ""}`} />;
  }

  return <img src={url} {...props} />;
}
