import { useState } from "react";
import { useNavigate } from "react-router-dom";
import db from "../db.ts";
import { API_URL } from "../../../constants.ts";
import ProfileCard from "../components/ProfileCard.tsx";
import Layout from "../components/Layout.tsx";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const [editInput, setEditInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Query user's profile
  const { data, isLoading } = db.useQuery(
    user
      ? {
          profiles: {
            $: { where: { "user.id": user.id }, limit: 1 },
          },
        }
      : null,
  );

  const profile = data?.profiles?.[0] as
    | {
        id: string;
        name: string;
        age: number;
        gender: string;
        lookingFor: string;
        aiDescription: string;
        photoUrl?: string;
      }
    | undefined;

  const getAuthToken = () => user?.refresh_token ?? "";

  const handleEditRequest = async () => {
    if (!editInput.trim() || loading) return;
    setLoading(true);
    setSuccessMsg("");
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/profile/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ editRequest: editInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEditInput("");
        setSuccessMsg("Profile updated!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setSuccessMsg(data.error ?? "Failed to update");
      }
    } catch (e) {
      console.error("Edit error:", e);
      setSuccessMsg("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Your Profile</h1>
          <p className="text-grape-400">
            Ask AI to make changes — you can't edit the text directly
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-grape-400 text-xl">
              Loading your profile...
            </div>
          </div>
        ) : !profile ? (
          <div className="text-center py-20">
            <p className="text-grape-300 mb-4">No profile found.</p>
            <button
              onClick={() => navigate("/app/onboarding")}
              className="bg-grape-600 hover:bg-grape-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Complete Onboarding
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current profile display */}
            <ProfileCard
              name={profile.name}
              age={profile.age}
              description={profile.aiDescription}
              photoUrl={profile.photoUrl}
              large
            />

            {/* AI edit input */}
            <div className="bg-grape-950/50 border border-grape-900/50 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-3">
                Request a change
              </h2>
              <p className="text-grape-400 text-sm mb-4">
                Tell the AI what you'd like changed. For example: "Add that I
                play guitar", "Remove the part about cooking", "Make it
                shorter", "Mention that I'm training for a marathon".
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEditRequest()}
                  className="flex-1 bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
                  placeholder="Describe what you want changed..."
                  disabled={loading}
                />
                <button
                  onClick={handleEditRequest}
                  disabled={loading || !editInput.trim()}
                  className="bg-grape-600 hover:bg-grape-500 disabled:opacity-50 text-white px-6 rounded-xl font-semibold transition-colors"
                >
                  {loading ? "Updating..." : "Update"}
                </button>
              </div>
              {successMsg && (
                <p className="mt-3 text-sm text-grape-300">{successMsg}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
