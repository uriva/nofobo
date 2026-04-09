export default function Spinner({
  message,
  size = "md",
  className = "",
}: {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-10 h-10 border-4",
    lg: "w-16 h-16 border-[5px]",
  };
  const textClasses = {
    sm: "text-xs",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Outer fast ring */}
        <div
          className={`${sizeClasses[size]} rounded-full border-grape-800/50 border-t-grape-400 animate-spin absolute`}
          style={{ animationDuration: "1s" }}
        />
        {/* Inner slow reverse ring */}
        <div
          className={`${sizeClasses[size]} rounded-full border-transparent border-r-purple-500 animate-spin`}
          style={{ animationDirection: "reverse", animationDuration: "1.5s", transform: "scale(0.8)" }}
        />
        {/* Center dot */}
        <div className="absolute w-1 h-1 bg-grape-300 rounded-full animate-ping" />
      </div>
      {message && (
        <div
          className={`text-transparent bg-clip-text bg-gradient-to-r from-grape-300 to-purple-400 font-semibold tracking-wide animate-pulse ${textClasses[size]}`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
