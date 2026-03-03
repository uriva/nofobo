interface ProfileCardProps {
  name: string;
  age: number;
  description: string;
  photoUrl?: string;
  large?: boolean;
}

export default function ProfileCard({
  name,
  age,
  description,
  photoUrl,
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
        </div>
      </div>

      {/* Description */}
      <p
        className={`text-grape-200 leading-relaxed whitespace-pre-wrap ${
          large ? "text-base" : "text-sm"
        }`}
      >
        {description}
      </p>
    </div>
  );
}
