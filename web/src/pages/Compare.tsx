import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import db from "../db.ts";
import { API_URL, MIN_COMPARISONS_FOR_MATCHING } from "../../../constants.ts";
import ProfileCard from "../components/ProfileCard.tsx";

interface PairProfile {
  userId: string;
  profileId: string;
  name: string;
  age: number;
  aiDescription: string;
  photoUrl?: string;
}

export default function Compare() {
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const [pair, setPair] = useState<[PairProfile, PairProfile] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalComparisons, setTotalComparisons] = useState(0);
  const [message, setMessage] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);

  const getAuthToken = () => {
    return db.auth._currentUserCached?.token ?? "";
  };

  const loadPair = useCallback(async () => {
    setLoading(true);
    setChosen(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/compare/pair`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.pair) {
        setPair(data.pair);
        setTotalComparisons(data.totalComparisons ?? 0);
        setMessage("");
      } else {
        setPair(null);
        setMessage(data.reason ?? "No pairs available right now");
      }
    } catch (e) {
      console.error("Load pair error:", e);
      setMessage("Failed to load pair. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadPair();
  }, [user]);

  const handleChoice = async (winnerIdx: number) => {
    if (!pair || submitting) return;
    setSubmitting(true);
    setChosen(winnerIdx);

    const winnerId = pair[winnerIdx].userId;
    const loserId = pair[1 - winnerIdx].userId;

    try {
      const token = getAuthToken();
      await fetch(`${API_URL}/api/compare/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ winnerId, loserId }),
      });

      // Brief pause to show selection, then load next pair
      setTimeout(() => {
        setSubmitting(false);
        loadPair();
      }, 600);
    } catch (e) {
      console.error("Submit error:", e);
      setSubmitting(false);
    }
  };

  const progressPercent = Math.min(
    100,
    (totalComparisons / MIN_COMPARISONS_FOR_MATCHING) * 100,
  );

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-grape-900/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xl font-black text-white">NOFOBO</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/match")}
              className="text-grape-400 hover:text-grape-300 text-sm font-medium transition-colors"
            >
              My Match
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

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-grape-400 text-sm">
              {totalComparisons} comparisons made
            </span>
            <span className="text-grape-400 text-sm">
              {totalComparisons >= MIN_COMPARISONS_FOR_MATCHING
                ? "Ready for matching!"
                : `${MIN_COMPARISONS_FOR_MATCHING - totalComparisons} more needed for matching`}
            </span>
          </div>
          <div className="w-full h-2 bg-grape-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-grape-600 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Who do you vibe with more?
        </h1>
        <p className="text-grape-400 text-center mb-8">
          Just go with your gut. There are no wrong answers.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-grape-400 text-xl">
              Finding your next pair...
            </div>
          </div>
        ) : message ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">{"\u{1f389}"}</div>
            <p className="text-grape-300 text-lg mb-4">{message}</p>
            <button
              onClick={() => navigate("/match")}
              className="bg-grape-600 hover:bg-grape-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Check Your Match
            </button>
          </div>
        ) : pair ? (
          <div className="grid md:grid-cols-2 gap-6">
            {pair.map((profile, idx) => (
              <button
                key={profile.userId}
                onClick={() => handleChoice(idx)}
                disabled={submitting}
                className={`text-left transition-all duration-300 ${
                  chosen === idx
                    ? "scale-105 ring-2 ring-grape-400"
                    : chosen !== null
                      ? "opacity-40 scale-95"
                      : "hover:scale-[1.02]"
                }`}
              >
                <ProfileCard
                  name={profile.name}
                  age={profile.age}
                  description={profile.aiDescription}
                  photoUrl={profile.photoUrl}
                />
              </button>
            ))}
          </div>
        ) : null}

        {/* Skip button */}
        {pair && !submitting && (
          <div className="text-center mt-6">
            <button
              onClick={loadPair}
              className="text-grape-600 hover:text-grape-400 text-sm transition-colors"
            >
              Skip this pair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
