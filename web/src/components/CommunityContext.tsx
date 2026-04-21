import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import db from "../db.ts";

interface CommunityContextType {
  activeCommunityCode: string | null;
  setActiveCommunityCode: (code: string) => void;
  myProfiles: any[];
  allCommunities: any[];
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = db.useAuth();
  const { data } = db.useQuery(user ? { 
    profiles: { $: { where: { "user.id": user.id } }, community: {} },
    communities: {}
  } : null);

  const myProfiles = data?.profiles || [];
  const allCommunities = data?.communities || [];
  const [activeCommunityCode, setActiveCommunityCode] = useState<string | null>(null);

  useEffect(() => {
    // If no active community selected, try to load from storage or default to first profile
    if (!activeCommunityCode) {
      const saved = localStorage.getItem("activeCommunityCode");
      if (saved) {
        setActiveCommunityCode(saved);
      } else if (myProfiles.length > 0 && myProfiles[0].community?.code) {
        setActiveCommunityCode(myProfiles[0].community.code);
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
    <CommunityContext.Provider value={{ activeCommunityCode, setActiveCommunityCode, myProfiles, allCommunities }}>
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
