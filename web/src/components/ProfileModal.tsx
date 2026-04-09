import { useEffect } from "react";
import db from "../db.ts";
import Spinner from "./Spinner.tsx";
import ProfileCard from "./ProfileCard.tsx";

interface ProfileModalProps {
  userId: string;
  communityCode: string;
  onClose: () => void;
}

export default function ProfileModal({ userId, communityCode, onClose }: ProfileModalProps) {
  const { data, isLoading } = db.useQuery({
    profiles: {
      $: {
        where: {
          "user.id": userId,
          communityCode,
        },
      },
    },
  });

  const profile = data?.profiles?.[0];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto relative no-scrollbar rounded-2xl shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-black/50 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/70 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {isLoading ? (
          <div className="bg-grape-950 aspect-[4/5] rounded-2xl flex items-center justify-center border border-grape-800">
            <Spinner message="Loading profile..." size="md" />
          </div>
        ) : profile ? (
          <ProfileCard
            name={profile.name}
            age={profile.age}
            bio={profile.bio}
            description={profile.aiDescription}
            photoUrl={profile.photoUrl}
            photoUrls={profile.photoUrls ? JSON.parse(profile.photoUrls) : []}
            relationshipStatus={profile.relationshipStatus}
            kinkTags={profile.kinkTags ? JSON.parse(profile.kinkTags) : []}
            phone={profile.phone}
            large
          />
        ) : (
          <div className="bg-grape-950 aspect-[4/5] rounded-2xl flex items-center justify-center border border-grape-800 p-6 text-center">
            <div className="text-grape-400">Profile not found for this community.</div>
          </div>
        )}
      </div>
    </div>
  );
}
