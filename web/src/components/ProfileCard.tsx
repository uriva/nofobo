interface ProfileCardProps {
  name: string;
  age: number;
  bio: string;
  photoUrl?: string;
  relationshipStatus?: string;
  kinkTags?: string[];
  large?: boolean;
}

export default function ProfileCard({
  name,
  age,
  bio,
  photoUrl,
  relationshipStatus,
  kinkTags,
  large,
}: ProfileCardProps) {
  return (
    <div
      className={`bg-grape-950 border border-grape-800 rounded-2xl overflow-hidden transition-all ${
        large ? "p-8" : "p-6"
      }`}
    >
      {/* Avatar */}
      <div className="flex items-center gap-3 mb-4">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className={`rounded-full object-cover ${
              large ? "w-16 h-16" : "w-12 h-12"
            }`}
          />
        ) : (
          <div
            className={`rounded-full bg-gradient-to-br from-grape-500 to-purple-400 flex items-center justify-center text-white font-bold ${
              large ? "w-16 h-16 text-2xl" : "w-12 h-12 text-lg"
            }`}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div
            className={`font-bold text-white ${large ? "text-xl" : "text-lg"}`}
          >
            {name}, {age}
          </div>
          {relationshipStatus && (
            <div className="text-grape-400 text-sm">{relationshipStatus}</div>
          )}
        </div>
      </div>

      {/* Tags */}
      {kinkTags && kinkTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {kinkTags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-grape-900 text-grape-300 px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Bio */}
      <p
        className={`text-grape-200 leading-relaxed whitespace-pre-wrap ${
          large ? "text-base" : "text-sm"
        }`}
      >
        {bio}
      </p>
    </div>
  );
}
