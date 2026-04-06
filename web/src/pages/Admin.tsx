import { useState, useEffect } from "react";
import db from "../db.ts";
import { API_URL } from "../../../constants.ts";
import Layout from "../components/Layout.tsx";
import { useCommunity } from "../components/CommunityContext.tsx";
import ProfileModal from "../components/ProfileModal.tsx";

interface AdminProfile {
  userId: string;
  profileId: string;
  name: string;
  age: number;
  gender: string;
  attractedTo: string;
  relationshipStatus: string;
  kinkTags: string[];
  bio: string;
  photoUrl?: string;
  location?: string;
  comparisonsCount: number;
}

interface UserRanking {
  targetUserId: string;
  targetName: string;
  score: number;
  comparisonsCount: number;
}

interface MatchPair {
  user1: { userId: string; name: string };
  user2: { userId: string; name: string };
}

export default function Admin() {
  const { user } = db.useAuth();
  const { activeCommunityCode } = useCommunity();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Rankings for expanded profile
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(false);

  // Matching
  const [matchResults, setMatchResults] = useState<MatchPair[] | null>(null);
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([]);
  const [runningMatch, setRunningMatch] = useState(false);

  const getAuthToken = () => user?.refresh_token ?? "";

  const loadProfiles = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/admin/profiles`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (res.status === 403) {
        setError("You don't have admin access.");
        return;
      }
      const data = await res.json();
      setProfiles(data.profiles ?? []);
    } catch (e) {
      console.error("Load profiles error:", e);
      setError("Failed to load profiles.");
    } finally {
      setLoading(false);
    }
  };

  const loadRankings = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    setLoadingRankings(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/rankings/${userId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      setRankings(data.rankings ?? []);
    } catch (e) {
      console.error("Load rankings error:", e);
    } finally {
      setLoadingRankings(false);
    }
  };

  const runMatching = async () => {
    setRunningMatch(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      const data = await res.json();
      setMatchResults(data.matches ?? []);
      setUnmatchedNames(data.unmatchedNames ?? []);
    } catch (e) {
      console.error("Run matching error:", e);
    } finally {
      setRunningMatch(false);
    }
  };

  useEffect(() => {
    if (user) loadProfiles();
  }, [user]);

  if (error) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-grape-400 text-xl">Loading...</div>
          </div>
        ) : (
          <>
            {/* Stats + Actions */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white">Community Admin</h1>
                <p className="text-grape-400 text-sm mt-1">
                  {profiles.length} profile{profiles.length !== 1 ? "s" : ""} registered
                </p>
              </div>
              <button
                onClick={runMatching}
                disabled={runningMatch}
                className="bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all"
              >
                {runningMatch ? "Computing..." : "Run Matching"}
              </button>
            </div>

            {/* Match Results */}
            {matchResults && (
              <div className="mb-8 bg-grape-950 border border-grape-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">
                  Matching Results ({matchResults.length} pair{matchResults.length !== 1 ? "s" : ""})
                </h2>
                {matchResults.length === 0 ? (
                  <p className="text-grape-400">No matches could be computed. Need more comparisons.</p>
                ) : (
                  <div className="space-y-2">
                    {matchResults.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-grape-500 w-6">{i + 1}.</span>
                        <span className="text-white font-medium">{m.user1.name}</span>
                        <span className="text-grape-600">+</span>
                        <span className="text-white font-medium">{m.user2.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {unmatchedNames.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-grape-800">
                    <p className="text-grape-500 text-sm">
                      Unmatched: {unmatchedNames.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Profile list */}
            <div className="space-y-3">
              {profiles.map((p) => (
                <div key={p.profileId} className="bg-grape-950 border border-grape-800 rounded-xl overflow-hidden">
                  {/* Profile row */}
                  <div className="w-full text-left flex items-center gap-4 hover:bg-grape-900/30 transition-colors pr-4">
                    <button
                      onClick={() => setSelectedUserId(p.userId)}
                      className="p-4 cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-grape-500 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </button>
                    <button 
                      onClick={() => loadRankings(p.userId)}
                      className="flex-1 flex items-center min-w-0 py-4"
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-white font-medium text-sm">
                          {p.name}, {p.age}
                          {p.location && (
                            <span className="text-grape-500 ml-2">{p.location}</span>
                          )}
                        </div>
                        <div className="text-grape-400 text-xs">
                          {p.gender} · attracted to {p.attractedTo} · {p.relationshipStatus}
                        </div>
                      </div>
                      <div className="text-grape-500 text-xs flex-shrink-0 px-4">
                        {p.comparisonsCount} comparisons
                      </div>
                      <div className="text-grape-600 flex-shrink-0">
                        {expandedUserId === p.userId ? "▲" : "▼"}
                      </div>
                    </button>
                  </div>

                  {/* Expanded rankings */}
                  {expandedUserId === p.userId && (
                    <div className="border-t border-grape-800 p-4 bg-grape-900/20">
                      <div className="mb-2 text-grape-400 text-xs font-medium">
                        {p.name}'s preference ranking (by ELO)
                      </div>
                      {p.kinkTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {p.kinkTags.map((tag) => (
                            <span key={tag} className="text-xs bg-grape-900 text-grape-300 px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {p.bio && (
                        <p className="text-grape-300 text-xs mb-3 italic">"{p.bio}"</p>
                      )}
                      {loadingRankings ? (
                        <div className="text-grape-500 text-sm animate-pulse">Loading rankings...</div>
                      ) : rankings.length === 0 ? (
                        <div className="text-grape-500 text-sm">No rankings yet (no comparisons made).</div>
                      ) : (
                        <div className="space-y-1">
                          {rankings.map((r, i) => (
                            <div key={r.targetUserId} className="flex items-center gap-3 text-sm">
                              <span className="text-grape-600 w-6 text-right">{i + 1}.</span>
                              <span className="text-white flex-1">{r.targetName}</span>
                              <span className="text-grape-500 text-xs">ELO {r.score}</span>
                              <span className="text-grape-600 text-xs">({r.comparisonsCount} votes)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedUserId && activeCommunityCode && (
        <ProfileModal
          userId={selectedUserId}
          communityCode={activeCommunityCode}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </Layout>
  );
}
