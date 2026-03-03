import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import db from "../db.ts";
import { API_URL } from "../../../constants.ts";
import ProfileCard from "../components/ProfileCard.tsx";

interface MatchData {
  userId: string;
  name: string;
  age: number;
  aiDescription: string;
  photoUrl?: string;
  revealed: boolean;
}

export default function Match() {
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [cycleWeek, setCycleWeek] = useState("");

  useEffect(() => {
    if (user) loadMatch();
  }, [user]);

  const getAuthToken = () => {
    return user?.refresh_token ?? "";
  };

  const loadMatch = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/match/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.match) {
        setMatch(data.match);
        setRevealed(data.match.revealed);
        setCycleWeek(data.cycleWeek ?? "");
      } else {
        setMessage(data.reason ?? "No match yet");
      }
    } catch (e) {
      console.error("Load match error:", e);
      setMessage("Failed to load match");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-grape-900/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xl font-black text-white">NOFOBO</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/compare")}
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

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-lg w-full">
          {loading ? (
            <div className="text-center">
              <div className="animate-pulse text-grape-400 text-xl">
                Checking for your match...
              </div>
            </div>
          ) : match && !revealed ? (
            /* Unrevealed match - dramatic reveal */
            <div className="text-center">
              <div className="text-6xl mb-6 animate-pulse">{"\u{1f48c}"}</div>
              <h1 className="text-3xl font-black text-white mb-4">
                You Have a Match!
              </h1>
              <p className="text-grape-300 mb-8">
                The Gale-Shapley algorithm found your most stable match this
                week.
              </p>
              {cycleWeek && (
                <p className="text-grape-500 text-sm mb-8">
                  Week of {cycleWeek}
                </p>
              )}
              <button
                onClick={() => setRevealed(true)}
                className="bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 text-white px-10 py-4 rounded-full font-bold text-lg transition-all hover:shadow-xl hover:shadow-grape-600/30 hover:-translate-y-0.5 animate-bounce"
              >
                Reveal Your Match
              </button>
            </div>
          ) : match && revealed ? (
            /* Revealed match */
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">{"\u{2728}"}</div>
                <h1 className="text-3xl font-black text-white mb-2">
                  Meet {match.name}
                </h1>
                <p className="text-grape-400">
                  Your NOFOBO match for the week of {cycleWeek}
                </p>
              </div>

              <ProfileCard
                name={match.name}
                age={match.age}
                description={match.aiDescription}
                photoUrl={match.photoUrl}
                large
              />

              <div className="bg-grape-950/50 border border-grape-900/50 rounded-2xl p-6 text-center">
                <p className="text-grape-300 text-sm leading-relaxed">
                  This match is <strong className="text-grape-200">stable</strong>
                  {" "}&mdash; the Gale-Shapley algorithm guarantees that neither
                  you nor {match.name} would prefer to be matched with someone
                  else who would also prefer you. In other words:{" "}
                  <strong className="text-grape-200">
                    no fear of better option.
                  </strong>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/compare")}
                  className="flex-1 border border-grape-700 text-grape-300 hover:bg-grape-950 py-3 rounded-xl font-semibold transition-all"
                >
                  Keep Comparing
                </button>
              </div>
            </div>
          ) : (
            /* No match */
            <div className="text-center">
              <div className="text-6xl mb-6">{"\u{1f52e}"}</div>
              <h1 className="text-3xl font-black text-white mb-4">
                No Match Yet
              </h1>
              <p className="text-grape-300 mb-2">{message}</p>
              <p className="text-grape-500 text-sm mb-8">
                Matching happens every Sunday. Keep comparing to build your
                preference list!
              </p>
              <button
                onClick={() => navigate("/compare")}
                className="bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 text-white px-8 py-3 rounded-full font-semibold transition-all"
              >
                Start Comparing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
