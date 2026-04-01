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
  bio: string;
  photoUrl?: string;
  relationshipStatus?: string;
  kinkTags?: string[];
}

const KINK_TAG_OPTIONS = [
  "Dom", "Sub", "Switch", "Voyeur", "Exhibitionist",
  "Bondage", "Role play", "Sensory play", "Impact play", "Group play",
];

const ADMIN_EMAILS = ["uri.valevski@gmail.com", "BurningMan@alumni.stanford.edu"];

const RELATIONSHIP_STATUSES = [
  "Very single",
  "Somewhat single",
  "In a non-exclusive relationship",
  "In a committed relationship but open to play",
];

export default function Compare() {
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const [pair, setPair] = useState<[PairProfile, PairProfile] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalComparisons, setTotalComparisons] = useState(0);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [message, setMessage] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  const getAuthToken = () => {
    return user?.refresh_token ?? "";
  };

  const loadPair = useCallback(async () => {
    setLoading(true);
    setChosen(null);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (minAge) params.set("minAge", minAge);
      if (maxAge) params.set("maxAge", maxAge);
      if (filterTags.length > 0) params.set("tags", filterTags.join(","));
      if (filterStatuses.length > 0) params.set("statuses", filterStatuses.join(","));
      const qs = params.toString() ? `?${params.toString()}` : "";

      const res = await fetch(`${API_URL}/api/compare/pair${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.pair) {
        setPair(data.pair);
        setTotalComparisons(data.totalComparisons ?? 0);
        setEligibleCount(data.eligibleCount ?? 0);
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
  }, [minAge, maxAge, filterTags, filterStatuses]);

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

      setTimeout(() => {
        setSubmitting(false);
        loadPair();
      }, 600);
    } catch (e) {
      console.error("Submit error:", e);
      setSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setFilterTags((prev: string[]) =>
      prev.includes(tag) ? prev.filter((t: string) => t !== tag) : [...prev, tag],
    );
  };

  const toggleStatus = (status: string) => {
    setFilterStatuses((prev: string[]) =>
      prev.includes(status) ? prev.filter((s: string) => s !== status) : [...prev, status],
    );
  };

  const hasActiveFilters = filterTags.length > 0 || filterStatuses.length > 0 || minAge || maxAge;

  const progressPercent = Math.min(
    100,
    (totalComparisons / MIN_COMPARISONS_FOR_MATCHING) * 100,
  );

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-grape-900/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span onClick={() => navigate("/")} className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors">NOFOBO</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app/decisions")}
              className="text-grape-400 hover:text-grape-300 text-sm font-medium transition-colors"
            >
              My Decisions
            </button>
            {user?.email && ADMIN_EMAILS.includes(user.email) && (
              <button
                onClick={() => navigate("/app/admin")}
                className="text-grape-400 hover:text-grape-300 text-sm font-medium transition-colors"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`text-sm font-medium transition-colors ${showFilters ? "text-grape-300" : "text-grape-400 hover:text-grape-300"}`}
            >
              Filters {hasActiveFilters ? `(active)` : ""}
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

      {/* Filters panel */}
      {showFilters && (
        <div className="border-b border-grape-900/50 px-6 py-4 bg-grape-950/50">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Age range */}
            <div>
              <label className="text-grape-400 text-sm font-medium block mb-2">Age Range</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  className="w-20 bg-grape-900 border border-grape-700 rounded-lg px-3 py-1.5 text-white text-sm"
                />
                <span className="text-grape-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  className="w-20 bg-grape-900 border border-grape-700 rounded-lg px-3 py-1.5 text-white text-sm"
                />
              </div>
            </div>

            {/* Relationship status */}
            <div>
              <label className="text-grape-400 text-sm font-medium block mb-2">Relationship Status</label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      filterStatuses.includes(status)
                        ? "bg-grape-600 border-grape-500 text-white"
                        : "bg-grape-950 border-grape-700 text-grape-400 hover:border-grape-500"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Kink tags */}
            <div>
              <label className="text-grape-400 text-sm font-medium block mb-2">Kink Tags (at least one overlap)</label>
              <div className="flex flex-wrap gap-2">
                {KINK_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      filterTags.includes(tag)
                        ? "bg-grape-600 border-grape-500 text-white"
                        : "bg-grape-950 border-grape-700 text-grape-400 hover:border-grape-500"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Apply / Clear */}
            <div className="flex gap-3">
              <button
                onClick={() => loadPair()}
                className="bg-grape-600 hover:bg-grape-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Apply Filters
              </button>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setMinAge("");
                    setMaxAge("");
                    setFilterTags([]);
                    setFilterStatuses([]);
                  }}
                  className="text-grape-500 hover:text-grape-300 text-sm px-4 py-2 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-grape-400 text-sm">
              {totalComparisons} comparisons made
            </span>
            <span className="text-grape-400 text-sm">
              {eligibleCount} people in your pool
            </span>
          </div>
          <div className="w-full h-2 bg-grape-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-grape-600 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-grape-500 text-xs mt-1 text-right">
            {totalComparisons >= MIN_COMPARISONS_FOR_MATCHING
              ? "Enough data for great rankings!"
              : `${MIN_COMPARISONS_FOR_MATCHING - totalComparisons} more for solid rankings`}
          </div>
        </div>

        {!message && (
          <>
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Who do you vibe with more?
            </h1>
            <p className="text-grape-400 text-center mb-8">
              Just go with your gut. There are no wrong answers.
            </p>
          </>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-grape-400 text-xl">
              Finding your next pair...
            </div>
          </div>
        ) : message ? (
          <div className="text-center py-20">
            <p className="text-grape-300 text-lg mb-4">{message}</p>
            <p className="text-grape-500 text-sm">
              {totalComparisons > 0
                ? `You've made ${totalComparisons} comparisons so far. Nice work!`
                : "More people need to join before you can start comparing."}
            </p>
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
                  bio={profile.bio}
                  photoUrl={profile.photoUrl}
                  relationshipStatus={profile.relationshipStatus}
                  kinkTags={profile.kinkTags}
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
