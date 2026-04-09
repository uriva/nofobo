import { useState } from "react";

interface ProfileCardProps {
  name: string;
  age: number;
  bio?: string;
  description?: string;
  photoUrl?: string;
  photoUrls?: string[];
  relationshipStatus?: string;
  kinkTags?: string[];
  phone?: string;
  large?: boolean;
}

export default function ProfileCard({
  name,
  age,
  bio,
  description,
  photoUrl,
  photoUrls = [],
  relationshipStatus,
  kinkTags,
  phone,
  large,
}: ProfileCardProps) {
  const displayBio = bio || description || "";
  const [photoIdx, setPhotoIdx] = useState(0);

  // Use photoUrls if available, otherwise fallback to photoUrl as a single-element array
  const validPhotos = photoUrls.length > 0 ? photoUrls : (photoUrl ? [photoUrl] : []);
  const currentPhoto = validPhotos[photoIdx];

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIdx((prev) => (prev > 0 ? prev - 1 : validPhotos.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIdx((prev) => (prev < validPhotos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      className={`bg-grape-950 border border-grape-800 rounded-2xl overflow-hidden transition-all flex flex-col h-full`}
    >
      {/* Big Photo Area */}
      {validPhotos.length > 0 ? (
        <div className="relative w-full aspect-[4/5] bg-grape-900 group">
          <img
            src={currentPhoto}
            alt={`${name} photo ${photoIdx + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* Photo Navigation Overlays */}
          {validPhotos.length > 1 && (
            <>
              <div className="absolute top-2 left-0 right-0 flex justify-center gap-1.5 px-4 z-10">
                {validPhotos.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full flex-1 shadow-sm transition-all ${
                      i === photoIdx ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={handlePrevPhoto}
                className="absolute top-0 bottom-0 left-0 w-1/3 flex items-center justify-start px-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-black/30 to-transparent"
              >
                <div className="bg-black/40 text-white rounded-full p-2 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </div>
              </button>
              
              <button
                onClick={handleNextPhoto}
                className="absolute top-0 bottom-0 right-0 w-1/3 flex items-center justify-end px-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-black/30 to-transparent"
              >
                <div className="bg-black/40 text-white rounded-full p-2 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="w-full aspect-[4/5] bg-gradient-to-br from-grape-600 to-purple-800 flex items-center justify-center text-white text-6xl font-bold shadow-inner">
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Content Area */}
      <div className={`flex flex-col flex-1 ${large ? "p-6" : "p-5"}`}>
        <div className="mb-3">
          <div
            className={`font-bold text-white leading-tight ${
              large ? "text-2xl" : "text-xl"
            }`}
          >
            {name}, {age}
          </div>
          {relationshipStatus && (
            <div className="text-grape-400 text-sm mt-1 font-medium">
              {relationshipStatus}
            </div>
          )}
          {phone && (
            <div className="text-grape-400 text-sm mt-1 font-medium flex items-center gap-1.5">
              📞 {phone}
            </div>
          )}
        </div>

        {/* Tags */}
        {kinkTags && kinkTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {kinkTags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium bg-grape-900 border border-grape-800 text-grape-300 px-2.5 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        {displayBio && (
          <p
            className={`text-grape-200 leading-relaxed whitespace-pre-wrap flex-1 ${
              large ? "text-base" : "text-sm"
            }`}
          >
            {displayBio}
          </p>
        )}
      </div>
    </div>
  );
}
