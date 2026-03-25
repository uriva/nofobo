import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import db from "../db.ts";
import { API_URL } from "../../../constants.ts";

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
  createdAt: number;
}

const ADMIN_EMAILS = ["uri.valevski@gmail.com"];

export default function MyDecisions() {
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [flipping, setFlipping] = useState<string | null>(null);

  const getAuthToken = () => user?.refresh_token ?? "";

  const loadDecisions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/my/comparisons`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      setDecisions(data.comparisons ?? []);
    } catch (e) {
      console.error("Load decisions error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadDecisions();
  }, [user]);

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
      }
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      setFlipping(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-grape-900/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span
            onClick={() => navigate("/")}
            className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
          >
            NOFOBO
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app/compare")}
              className="text-grape-400 hover:text-grape-300 text-sm font-medium transition-colors"
            >
              Back to Compare
            </button>
            {user?.email && ADMIN_EMAILS.includes(user.email) && (
              <button
                onClick={() => navigate("/app/admin")}
                className="text-grape-400 hover:text-grape-300 text-sm font-medium transition-colors"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">My Decisions</h1>
        <p className="text-grape-400 mb-6">
          {decisions.length} comparison{decisions.length !== 1 ? "s" : ""} made.
          Tap the swap button to change your mind, or delete to remove.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-grape-400 text-xl">Loading...</div>
          </div>
        ) : decisions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-grape-400">No comparisons yet. Go compare some profiles!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {decisions.map((d) => (
              <div
                key={d.comparisonId}
                className="bg-grape-950 border border-grape-800 rounded-xl p-4 flex items-center gap-4"
              >
                {/* Winner */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {d.winnerPhotoUrl ? (
                    <img
                      src={d.winnerPhotoUrl}
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
                <div className="text-grape-600 text-xs font-medium flex-shrink-0">vs</div>

                {/* Loser */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {d.loserPhotoUrl ? (
                    <img
                      src={d.loserPhotoUrl}
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
    </div>
  );
}
