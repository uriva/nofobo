interface ProfileCardProps {
  name: string;
  age: number;
  bio?: string;
  description?: string;
  photoUrl?: string;
  relationshipStatus?: string;
  kinkTags?: string[];
  large?: boolean;
}

export default function ProfileCard({
  name,
  age,
  bio,
  description,
  photoUrl,
  relationshipStatus,
  kinkTags,
  large,
}: ProfileCardProps) {
  const displayBio = bio || description || "";
  
  return (
    <div
      className={`bg-grape-950 border border-grape-800 rounded-2xl overflow-hidden transition-all flex flex-col h-full`}
    >
      {/* Big Photo Area */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="w-full aspect-[4/5] object-cover bg-grape-900"
        />
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
