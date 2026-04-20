import { useState, useEffect, useMemo } from "react";
import db from "../db.ts";
import Spinner from "../components/Spinner.tsx";
import { API_URL } from "../../../constants.ts";
import Layout from "../components/Layout.tsx";
import { useCommunity } from "../components/CommunityContext.tsx";
import ProfileModal from "../components/ProfileModal.tsx";
import StorageImage from "../components/StorageImage.tsx";
import { useNavigate } from "react-router-dom";

interface Decision {
  comparisonId: string;
  winnerId: string;
  winnerName: string;
  winnerAge: number;
  winnerPhotoUrl?: string;
  loserId: string;
  loserName: string;
  loserAge: number;
  loserPhotoUrl?: string;
  communityCode: string;
  createdAt: number;
}

interface Ranking {
  targetUserId: string;
  targetName: string;
  score: number;
  comparisonsCount: number;
}

const ADMIN_EMAILS = ["uri.valevski@gmail.com", "BurningMan@alumni.stanford.edu"];

export default function MyDecisions() {
  const { user } = db.useAuth();
  const { activeCommunityCode } = useCommunity();
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [flipping, setFlipping] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"rankings" | "history">("rankings");

  const getAuthToken = () => user?.refresh_token ?? "";

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };
      const [compsRes, rankRes] = await Promise.all([
        fetch(`${API_URL}/api/my/comparisons`, { headers }),
        fetch(`${API_URL}/api/my/rankings`, { headers })
      ]);
      
      if (compsRes.ok) {
        const compsData = await compsRes.json();
        setDecisions(compsData.comparisons ?? []);
      }
      
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        setRankings(rankData.rankings ?? []);
      }
    } catch (e) {
      console.error("Load data error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const filteredDecisions = useMemo(() => {
    if (!activeCommunityCode) return [];
    return decisions.filter(d => d.communityCode === activeCommunityCode);
  }, [decisions, activeCommunityCode]);

  // Rankings don't have community attached in their backend response yet, 
  // but they are derived from the same pool. In a real scenario we'd filter them too.
  // For now, we'll display what we get from the backend which already scoped to the rater.

  const flipDecision = async (comparisonId: string) => {
    setFlipping(comparisonId);
    try {
      const res = await fetch(`${API_URL}/api/compare/flip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ comparisonId }),
      });
      if (res.ok) {
        // Update locally: swap winner and loser
        setDecisions((prev) =>
          prev.map((d) => {
            if (d.comparisonId !== comparisonId) return d;
            return {
              ...d,
              winnerId: d.loserId,
              winnerName: d.loserName,
              winnerAge: d.loserAge,
              winnerPhotoUrl: d.loserPhotoUrl,
              loserId: d.winnerId,
              loserName: d.winnerName,
              loserAge: d.winnerAge,
              loserPhotoUrl: d.winnerPhotoUrl,
            };
          }),
        );
        // Reload entirely to get updated rankings
        loadData();
      }
    } catch (e) {
      console.error("Flip error:", e);
    } finally {
      setFlipping(null);
    }
  };

  const deleteDecision = async (comparisonId: string) => {
    setFlipping(comparisonId);
    try {
      const res = await fetch(`${API_URL}/api/compare/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ comparisonId }),
      });
      if (res.ok) {
        setDecisions((prev) => prev.filter((d) => d.comparisonId !== comparisonId));
        // Reload entirely to get updated rankings
        loadData();
      }
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      setFlipping(null);
    }
  };

  return (
    <Layout>
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">My Decisions</h1>
        <p className="text-grape-400 mb-6">
          {filteredDecisions.length} comparison{filteredDecisions.length !== 1 ? "s" : ""} made.
          Tap the swap button to change your mind, or delete to remove.
        </p>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-grape-800">
          <button
            onClick={() => setActiveTab("rankings")}
            className={`pb-3 font-semibold transition-colors ${
              activeTab === "rankings"
                ? "text-grape-400 border-b-2 border-grape-400"
                : "text-grape-600 hover:text-grape-500"
            }`}
          >
            My Rankings
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 font-semibold transition-colors ${
              activeTab === "history"
                ? "text-grape-400 border-b-2 border-grape-400"
                : "text-grape-600 hover:text-grape-500"
            }`}
          >
            Decision History
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner message="Loading..." size="lg" />
          </div>
        ) : activeTab === "rankings" ? (
          /* Rankings Tab */
          rankings.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">{"\u{1f3c6}"}</div>
              <h2 className="text-xl text-white font-bold mb-2">No Rankings Yet</h2>
              <p className="text-grape-400 mb-6">
                Go to the Compare tab to start building your preferences!
              </p>
              <button
                onClick={() => navigate("/app/compare")}
                className="bg-grape-600 hover:bg-grape-500 text-white px-6 py-2 rounded-full font-semibold transition-colors"
              >
                Start Comparing
              </button>
            </div>
          ) : (
            <div className="bg-grape-950 border border-grape-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-grape-900 border-b border-grape-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-grape-400 uppercase">Rank</th>
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-grape-400 uppercase">Profile</th>
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-grape-400 uppercase">Score</th>
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-grape-400 uppercase">Comparisons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-grape-800/50">
                    {rankings.map((r, idx) => (
                      <tr key={r.targetUserId} className="hover:bg-grape-900/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            idx === 0 ? "bg-yellow-500/20 text-yellow-500" :
                            idx === 1 ? "bg-gray-400/20 text-gray-400" :
                            idx === 2 ? "bg-amber-700/20 text-amber-600" :
                            "bg-grape-800 text-grape-400"
                          }`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedUserId(r.targetUserId)}
                            className="font-bold text-white hover:text-grape-300 transition-colors"
                          >
                            {r.targetName}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-grape-200">{Math.round(r.score)}</td>
                        <td className="px-6 py-4 text-grape-400">{r.comparisonsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : filteredDecisions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-grape-400">No comparisons yet. Go compare some profiles!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDecisions.map((d) => (
              <div
                key={d.comparisonId}
                className="bg-grape-950 border border-grape-800 rounded-xl p-4 flex items-center gap-4"
              >
                {/* Winner */}
                <div 
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-grape-900/50 p-1.5 rounded-lg transition-colors -ml-1.5"
                  onClick={() => setSelectedUserId(d.winnerId)}
                >
                  {d.winnerPhotoUrl ? (
                    <StorageImage
                      pathOrUrl={d.winnerPhotoUrl}
                      alt={d.winnerName}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-grape-500 to-purple-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {d.winnerName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {d.winnerName}, {d.winnerAge}
                    </div>
                    <div className="text-green-400 text-xs">Preferred</div>
                  </div>
                </div>

                {/* VS */}
                <div className="text-grape-600 text-xs font-medium flex-shrink-0 px-2">vs</div>

                {/* Loser */}
                <div 
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-grape-900/50 p-1.5 rounded-lg transition-colors -ml-1.5"
                  onClick={() => setSelectedUserId(d.loserId)}
                >
                  {d.loserPhotoUrl ? (
                    <StorageImage
                      pathOrUrl={d.loserPhotoUrl}
                      alt={d.loserName}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-grape-800 flex items-center justify-center text-grape-400 font-bold text-sm flex-shrink-0">
                      {d.loserName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-grape-300 font-medium text-sm truncate">
                      {d.loserName}, {d.loserAge}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => flipDecision(d.comparisonId)}
                    disabled={flipping === d.comparisonId}
                    className="text-grape-400 hover:text-grape-200 disabled:opacity-50 text-xs px-3 py-1.5 border border-grape-700 rounded-lg hover:border-grape-500 transition-colors"
                    title="Swap preference"
                  >
                    {flipping === d.comparisonId ? "..." : "Swap"}
                  </button>
                  <button
                    onClick={() => deleteDecision(d.comparisonId)}
                    disabled={flipping === d.comparisonId}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs px-3 py-1.5 border border-grape-700 rounded-lg hover:border-red-500 transition-colors"
                    title="Delete comparison"
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
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
