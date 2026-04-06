import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import db from "../db.ts";

interface CommunityContextType {
  activeCommunityCode: string | null;
  setActiveCommunityCode: (code: string) => void;
  myProfiles: any[];
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = db.useAuth();
  const { data } = db.useQuery(user ? { 
    profiles: { $: { where: { "user.id": user.id } } },
    communities: {}
  } : null);

  const myProfiles = data?.profiles || [];
  const [activeCommunityCode, setActiveCommunityCode] = useState<string | null>(null);

  useEffect(() => {
    // If we have profiles but no active community selected, default to the first one
    if (myProfiles.length > 0 && !activeCommunityCode) {
      // Also check local storage to remember the last selected
      const saved = localStorage.getItem("activeCommunityCode");
      if (saved && myProfiles.some(p => p.communityCode === saved)) {
        setActiveCommunityCode(saved);
      } else {
        setActiveCommunityCode(myProfiles[0].communityCode);
      }
    }
  }, [myProfiles, activeCommunityCode]);

  // Persist to local storage when changed
  useEffect(() => {
    if (activeCommunityCode) {
      localStorage.setItem("activeCommunityCode", activeCommunityCode);
    }
  }, [activeCommunityCode]);

  return (
    <CommunityContext.Provider value={{ activeCommunityCode, setActiveCommunityCode, myProfiles }}>
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error("useCommunity must be used within a CommunityProvider");
  }
  return context;
}
