import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import db from "../db.ts";
import { API_URL } from "../../../constants.ts";

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
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      <div className="min-h-screen bg-[#0f0a1a] flex flex-col items-center justify-center">
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <button
          onClick={() => navigate("/app/compare")}
          className="text-grape-400 hover:text-grape-300 text-sm"
        >
          Back to Compare
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-grape-900/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span
            onClick={() => navigate("/")}
            className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
          >
            NOFOBO <span className="text-grape-500 text-sm font-normal ml-2">Admin</span>
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app/compare")}
              className="text-grape-400 hover:text-grape-300 text-sm font-medium transition-colors"
            >
              Compare
            </button>
            <button
              onClick={() => db.auth.signOut()}
              className="text-grape-600 hover:text-grape-400 text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

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
                  <button
                    onClick={() => loadRankings(p.userId)}
                    className="w-full text-left p-4 flex items-center gap-4 hover:bg-grape-900/30 transition-colors"
                  >
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-grape-500 to-purple-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
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
                    <div className="text-grape-500 text-xs flex-shrink-0">
                      {p.comparisonsCount} comparisons
                    </div>
                    <div className="text-grape-600 flex-shrink-0">
                      {expandedUserId === p.userId ? "▲" : "▼"}
                    </div>
                  </button>

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
    </div>
  );
}
