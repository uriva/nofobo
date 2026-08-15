import { useState, useMemo, useRef, useEffect } from "react";
import QRCode from "qrcode";
import db from "../db.ts";
import Spinner from "../components/Spinner.tsx";
import { API_URL } from "../../../constants.ts";
import Layout from "../components/Layout.tsx";
import { useCommunity } from "../components/CommunityContext.tsx";
import ProfileModal from "../components/ProfileModal.tsx";
import StorageImage from "../components/StorageImage.tsx";

const firstOf = <T,>(x: T | T[] | undefined | null): T | undefined =>
  Array.isArray(x) ? x[0] : (x ?? undefined);

interface AdminProfile {
  userId: string;
  profileId: string;
  name: string;
  age: number;
  gender: string;
  attractedTo: string;
  relationshipStatus: string;
  tags: string[];
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
  const { activeCommunityCode, setActiveCommunityCode } = useCommunity();
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Rankings for expanded profile
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

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

  // Invite Link & QR Code
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const inviteUrl = useMemo(() => {
    const code = community?.code || activeCommunityCode || "";
    return `${window.location.origin}/app/onboarding?code=${code}`;
  }, [community?.code, activeCommunityCode]);

  useEffect(() => {
    if (inviteUrl) {
      QRCode.toDataURL(inviteUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0f0a1a",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code generation error:", err));
    }
  }, [inviteUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: profilesData, isLoading: loadingProfiles } = db.useQuery(
    activeCommunityCode
      ? {
          profiles: {
            $: {
              where: {
                "community.code": activeCommunityCode,
                onboardingComplete: true,
              },
            },
            user: {},
            votedComparisons: {},
          },
        }
      : null,
  );

  const profiles: AdminProfile[] = useMemo(() => {
    const raw = profilesData?.profiles ?? [];
    const byUser = new Map<string, typeof raw[number]>();
    for (const p of raw) {
      const uid = firstOf(p.user)?.id;
      if (!uid) continue;
      const existing = byUser.get(uid);
      if (!existing || p.createdAt > existing.createdAt) byUser.set(uid, p);
    }
    return Array.from(byUser.values()).map((p) => {
      const uid = firstOf(p.user)?.id ?? "";
      const photoUrls = (p.photoUrls as string[] | undefined) ?? [];
      return {
        userId: uid,
        profileId: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        attractedTo: (p.attractedTo as unknown as string) ?? "both",
        relationshipStatus: p.relationshipStatus ?? "",
        tags: (p.tags as string[] | undefined) ?? [],
        bio: p.bio ?? p.aiDescription ?? "",
        photoUrl: p.photoUrl ?? photoUrls[0] ?? undefined,
        location: p.location ?? undefined,
        phone: p.phone ?? undefined,
        comparisonsCount: p.votedComparisons?.length ?? 0,
      };
    });
  }, [profilesData]);

  const { data: rankingsData, isLoading: loadingRankings } = db.useQuery(
    expandedUserId
      ? {
          eloRatings: {
            $: { where: { "raterProfile.user.id": expandedUserId } },
            targetProfile: { user: {} },
          },
        }
      : null,
  );

  const rankings: UserRanking[] = useMemo(() => {
    const raw = rankingsData?.eloRatings ?? [];
    return raw
      .map((r) => {
        const target = firstOf(r.targetProfile);
        const tUid = firstOf(target?.user)?.id ?? "";
        return {
          targetUserId: tUid,
          targetName: target?.name ?? "Unknown",
          score: r.score,
          comparisonsCount: r.comparisonsCount ?? 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [rankingsData]);

  const loading = !!activeCommunityCode && loadingProfiles;

  const getAuthToken = () => user?.refresh_token ?? "";

  const toggleExpanded = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
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

  const handleToggleRelationshipStatus = async () => {
    const current = !!community.askRelationshipStatus;
    await db.transact([
      db.tx.communities[community.id].update({ askRelationshipStatus: !current }),
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
    const name = editingCommunityName.trim();
    const code = editingCommunityCode.trim().toLowerCase();

    if (!name || !code) {
      alert("Name and code are required");
      return;
    }

    if (!/^[a-z0-9-_]+$/.test(code)) {
      alert("Code must contain only lowercase letters, numbers, hyphens, and underscores");
      return;
    }

    setSavingCommunityInfo(true);
    try {
      // If the code is changing, check it doesn't conflict
      if (code !== activeCommunityCode) {
        const { data: conflict } = await db.queryOnce({
          communities: { $: { where: { code } } },
        });
        if (conflict?.communities?.length) {
          alert("Code already exists");
          return;
        }
      }

      await db.transact([
        db.tx.communities[community.id].update({ name, code }),
      ]);

      // Switch the active community code if it changed
      if (code !== activeCommunityCode) {
        setActiveCommunityCode(code);
      }
      setIsEditingCommunityInfo(false);
    } catch (e) {
      console.error("Save community info error:", e);
      alert(e instanceof Error ? e.message : "Failed to save community info");
    } finally {
      setSavingCommunityInfo(false);
    }
  };

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
                <div>
                  <h2 className="text-lg font-bold text-white">Community Tags</h2>
                  <p className="text-grape-400 text-sm">
                    Tags for members to choose from on their profiles (e.g. hobbies, interests, vibes).
                  </p>
                </div>
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
                    placeholder="e.g. Climber, Foodie, Poly, Burner"
                    className="w-full bg-grape-900 border border-grape-800 rounded-lg px-4 py-2 text-white placeholder-grape-600 focus:outline-none focus:border-grape-500"
                  />
                  <p className="text-grape-500 text-xs">Separate tags with commas.</p>
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
                {/* Invite Link & QR Code */}
                <div>
                  <h3 className="text-white font-medium mb-1">Invite Link & QR Code</h3>
                  <p className="text-grape-400 text-sm mb-4">
                    Share this link or QR code with members to invite them directly to your community.
                  </p>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-4">
                    <div className="relative flex-1 w-full">
                      <input
                        type="text"
                        readOnly
                        value={inviteUrl}
                        className="w-full bg-grape-900 border border-grape-800 rounded-lg pl-4 pr-24 py-2.5 text-white text-sm focus:outline-none"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="absolute right-2 top-1.5 bg-grape-700 hover:bg-grape-600 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>

                    <button
                      onClick={() => setShowQR(!showQR)}
                      className="w-full md:w-auto bg-transparent border border-grape-700 hover:border-grape-500 text-grape-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-center"
                    >
                      {showQR ? "Hide QR Code" : "Show QR Code"}
                    </button>
                  </div>

                  {showQR && qrDataUrl && (
                    <div className="flex flex-col items-center justify-center p-6 bg-grape-900/30 rounded-lg border border-grape-800">
                      <div className="p-4 bg-white rounded-xl shadow-lg mb-4">
                        <img src={qrDataUrl} alt="Community QR Code" className="w-48 h-48" />
                      </div>
                      <a
                        href={qrDataUrl}
                        download={`invite-qr-${community?.code || activeCommunityCode}.png`}
                        className="text-grape-400 hover:text-white text-xs font-medium underline transition-colors"
                      >
                        Download QR Code PNG
                      </a>
                    </div>
                  )}
                </div>

                <div className="border-t border-grape-800" />

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

                {/* Ask Relationship Status Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Ask Relationship Status</h3>
                    <p className="text-grape-400 text-sm">Include relationship status field on member profiles</p>
                  </div>
                  <button
                    onClick={handleToggleRelationshipStatus}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      community?.askRelationshipStatus ? "bg-grape-500" : "bg-grape-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        community?.askRelationshipStatus ? "translate-x-6" : "translate-x-1"
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
                              db.tx.communities[community.id].update({ coverImageUrl: null })
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
                      onClick={() => toggleExpanded(p.userId)}
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
                          {p.gender} · attracted to {(() => { const a = p.attractedTo; return Array.isArray(a) ? a.join(", ") : (a === "both" ? "men, women" : a); })()}{p.relationshipStatus ? ` · ${p.relationshipStatus}` : ""}
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
                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {p.tags.map((tag) => (
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
