import { useState, useEffect, useRef } from "react";
import db from "../db.ts";
import Spinner from "../components/Spinner.tsx";
import { API_URL } from "../../../constants.ts";
import Layout from "../components/Layout.tsx";
import { useCommunity } from "../components/CommunityContext.tsx";
import ProfileModal from "../components/ProfileModal.tsx";
import StorageImage from "../components/StorageImage.tsx";

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
  phone?: string;
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

  // Tags
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editingTagsInput, setEditingTagsInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);

  // Cover Image
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Settings
  const [isEditingAdmins, setIsEditingAdmins] = useState(false);
  const [editingAdminsInput, setEditingAdminsInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Community info
  const [isEditingCommunityInfo, setIsEditingCommunityInfo] = useState(false);
  const [editingCommunityName, setEditingCommunityName] = useState("");
  const [editingCommunityCode, setEditingCommunityCode] = useState("");
  const [savingCommunityInfo, setSavingCommunityInfo] = useState(false);
  
  const { data: communityData } = db.useQuery(activeCommunityCode ? {
    communities: { $: { where: { code: activeCommunityCode } } }
  } : null);
  const community = communityData?.communities?.[0];

  const getAuthToken = () => user?.refresh_token ?? "";

  const loadProfiles = async () => {
    if (!activeCommunityCode) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/admin/profiles?community=${activeCommunityCode}`, {
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
    if (!activeCommunityCode) return;
    setExpandedUserId(userId);
    setLoadingRankings(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/rankings/${userId}?community=${activeCommunityCode}`, {
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
    if (!activeCommunityCode) return;
    setRunningMatch(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/match?community=${activeCommunityCode}`, {
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

  const handleSaveTags = async () => {
    if (!community || !activeCommunityCode) return;
    setSavingTags(true);
    try {
      const tagsArray = editingTagsInput
        ? editingTagsInput.split(",").map(t => t.trim()).filter(Boolean)
        : null;

      await db.transact([
        db.tx.communities[community.id]
          .update({ tags: tagsArray ? (tagsArray) : undefined }),
      ]);
      setIsEditingTags(false);
    } catch (e) {
      console.error("Save tags error:", e);
      alert("Failed to save tags");
    } finally {
      setSavingTags(false);
    }
  };

  const handleSaveAdmins = async () => {
    if (!community || !activeCommunityCode) return;
    setSavingSettings(true);
    try {
      const adminArray = editingAdminsInput
        ? editingAdminsInput.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
        : null;

      await db.transact([
        db.tx.communities[community.id]
          .update({ adminEmails: adminArray ? (adminArray) : undefined }),
      ]);
      setIsEditingAdmins(false);
    } catch (e) {
      console.error("Save admins error:", e);
      alert("Failed to save admins");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleRequirePhone = async () => {
    const current = !!community.requirePhone;
    await db.transact([
      db.tx.communities[community.id].update({ requirePhone: !current }),
    ]);
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !community) return;
    
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Max 5MB.");
      return;
    }

    setUploadingCover(true);
    try {
      const coverPath = `communities/${community.id}/cover-${Date.now()}`;
      await db.storage.uploadFile(coverPath, file);
      await db.transact([
        db.tx.communities[community.id].update({ coverImageUrl: coverPath }),
      ]);
    } catch (e) {
      console.error("Cover image upload failed:", e);
      alert("Failed to upload cover image.");
    } finally {
      setUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveCommunityInfo = async () => {
    if (!community || !activeCommunityCode) return;
    setSavingCommunityInfo(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/community?community=${activeCommunityCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: ({
          name: editingCommunityName.trim(),
          code: editingCommunityCode.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update community info");
        return;
      }

      setIsEditingCommunityInfo(false);
    } catch (e) {
      console.error("Save community info error:", e);
      alert("Failed to save community info");
    } finally {
      setSavingCommunityInfo(false);
    }
  };

  useEffect(() => {
    if (user) loadProfiles();
  }, [user, activeCommunityCode]);

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
            <Spinner message="Loading..." size="lg" />
          </div>
        ) : (
          <>
            {/* Stats + Actions */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
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

            {/* Community Tags */}
            <div className="mb-8 bg-grape-950 border border-grape-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Community Tags</h2>
                {!isEditingTags && (
                  <button
                    onClick={() => {
                      setEditingTagsInput(
                        community?.tags ? community.tags.join(", ") : ""
                      );
                      setIsEditingTags(true);
                    }}
                    className="text-grape-400 hover:text-white text-sm font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {isEditingTags ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingTagsInput}
                    onChange={(e) => setEditingTagsInput(e.target.value)}
                    placeholder="e.g. tag1, tag2, tag3"
                    className="w-full bg-grape-900 border border-grape-800 rounded-lg px-4 py-2 text-white placeholder-grape-600 focus:outline-none focus:border-grape-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingTags(false)}
                      disabled={savingTags}
                      className="px-4 py-2 rounded-lg text-grape-400 hover:text-white text-sm font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTags}
                      disabled={savingTags}
                      className="bg-grape-600 hover:bg-grape-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {savingTags ? "Saving..." : "Save Tags"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {community?.tags ? (
                    community.tags.map((tag: string) => (
                      <span key={tag} className="bg-grape-900 text-grape-300 px-3 py-1 rounded-full text-sm">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-grape-500 text-sm">No custom tags set.</p>
                  )}
                </div>
              )}
            </div>

            {/* Community Settings */}
            <div className="mb-8 bg-grape-950 border border-grape-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">Community Settings</h2>
              
              <div className="space-y-6">
                {/* Require Phone Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Require Phone Number</h3>
                    <p className="text-grape-400 text-sm">Users must provide a phone number during onboarding</p>
                  </div>
                  <button
                    onClick={handleToggleRequirePhone}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      community?.requirePhone ? "bg-grape-500" : "bg-grape-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        community?.requirePhone ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="border-t border-grape-800" />

                {/* Community Name & Code Editor */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-medium">Community Name & Code</h3>
                      <p className="text-grape-400 text-sm">Name: <span className="text-white">{community?.name}</span> · Code: <span className="text-white">{community?.code}</span></p>
                    </div>
                    {!isEditingCommunityInfo && (
                      <button
                        onClick={() => {
                          setEditingCommunityName(community?.name || "");
                          setEditingCommunityCode(community?.code || "");
                          setIsEditingCommunityInfo(true);
                        }}
                        className="text-grape-400 hover:text-white text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditingCommunityInfo ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-grape-400 text-sm mb-2">Community Name</label>
                        <input
                          type="text"
                          value={editingCommunityName}
                          onChange={(e) => setEditingCommunityName(e.target.value)}
                          placeholder="e.g. Burning Desire"
                          className="w-full bg-grape-900 border border-grape-800 rounded-lg px-4 py-2 text-white placeholder-grape-600 focus:outline-none focus:border-grape-500"
                        />
                      </div>
                      <div>
                        <label className="block text-grape-400 text-sm mb-2">Community Code</label>
                        <input
                          type="text"
                          value={editingCommunityCode}
                          onChange={(e) => setEditingCommunityCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                          placeholder="e.g. burning-desire"
                          className="w-full bg-grape-900 border border-grape-800 rounded-lg px-4 py-2 text-white placeholder-grape-600 focus:outline-none focus:border-grape-500"
                        />
                        <p className="text-grape-600 text-xs mt-1">Only lowercase letters, numbers, hyphens, and underscores</p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsEditingCommunityInfo(false)}
                          disabled={savingCommunityInfo}
                          className="px-4 py-2 rounded-lg text-grape-400 hover:text-white text-sm font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCommunityInfo}
                          disabled={savingCommunityInfo}
                          className="bg-grape-600 hover:bg-grape-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {savingCommunityInfo ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-grape-800" />

                {/* Cover Image */}
                <div>
                  <h3 className="text-white font-medium mb-1">Community Cover Image</h3>
                  <p className="text-grape-400 text-sm mb-3">Upload a cover image for your community landing page.</p>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleCoverImageChange}
                    />
                    <div 
                      className="w-full sm:w-48 aspect-video bg-grape-900 border-2 border-dashed border-grape-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-grape-500 overflow-hidden transition-colors"
                      onClick={() => !uploadingCover && fileInputRef.current?.click()}
                    >
                      {uploadingCover ? (
                        <Spinner message="" size="sm" />
                      ) : community?.coverImageUrl ? (
                        <StorageImage 
                          pathOrUrl={community.coverImageUrl} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="text-grape-500 text-sm font-medium">+ Add Cover</span>
                      )}
                    </div>
                    {community?.coverImageUrl && !uploadingCover && (
                      <button 
                        onClick={async () => {
                          if (confirm("Remove cover image?")) {
                            await db.transact([
                              db.tx.communities[community.id].update({ coverImageUrl: undefined })
                            ]);
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-grape-800" />

                {/* Admins Editor */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-medium">Community Admins</h3>
                      <p className="text-grape-400 text-sm">Users who can access this dashboard</p>
                    </div>
                    {!isEditingAdmins && (
                      <button
                        onClick={() => {
                          setEditingAdminsInput(
                            community?.adminEmails ? community.adminEmails.join(", ") : ""
                          );
                          setIsEditingAdmins(true);
                        }}
                        className="text-grape-400 hover:text-white text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditingAdmins ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingAdminsInput}
                        onChange={(e) => setEditingAdminsInput(e.target.value)}
                        placeholder="e.g. user1@example.com, user2@example.com"
                        className="w-full bg-grape-900 border border-grape-800 rounded-lg px-4 py-2 text-white placeholder-grape-600 focus:outline-none focus:border-grape-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsEditingAdmins(false)}
                          disabled={savingSettings}
                          className="px-4 py-2 rounded-lg text-grape-400 hover:text-white text-sm font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveAdmins}
                          disabled={savingSettings}
                          className="bg-grape-600 hover:bg-grape-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {savingSettings ? "Saving..." : "Save Admins"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {community?.adminEmails ? (
                        community.adminEmails.map((email: string) => (
                          <span key={email} className="bg-grape-900 text-grape-300 px-3 py-1 rounded-full text-sm">
                            {email}
                          </span>
                        ))
                      ) : (
                        <p className="text-grape-500 text-sm">No additional admins assigned.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
                      {p.photoUrl && !p.photoUrl.includes("pic-unavailable") ? (
                        <StorageImage
                          pathOrUrl={p.photoUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
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
                          {p.gender} · attracted to {(() => { try { const a = JSON.parse(p.attractedTo); return Array.isArray(a) ? a.join(", ") : p.attractedTo; } catch { return p.attractedTo === "both" ? "men, women" : p.attractedTo; } })()} · {p.relationshipStatus}
                        </div>
                        {p.phone && (
                          <div className="text-grape-400 text-xs mt-1">
                            📞 {p.phone}
                          </div>
                        )}
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
                        <div className="py-2 scale-75 origin-left"><Spinner message="Loading rankings..." size="sm" /></div>
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
