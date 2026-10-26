import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { id } from "@instantdb/react";
import db from "../db.ts";
import { extractPath } from "../utils/storage.ts";
import StorageImage from "../components/StorageImage.tsx";
import Spinner from "../components/Spinner.tsx";
import { normalizePhone } from "../utils/phone.ts";

const VALID_COMMUNITY_CODES = ["burningdesire"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const firstOf = (x: any) => (Array.isArray(x) ? x[0] : x);

const RELATIONSHIP_STATUSES = [
  "Very single",
  "Somewhat single",
  "In a non-exclusive relationship",
  "I’m in a relationship but want to make new connections",
];

const MAX_PHOTOS = 6;

function generateRandomCode(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUniqueCommunityCode(existingCommunities: any[]): string {
  let code = generateRandomCode(6);
  while (
    VALID_COMMUNITY_CODES.includes(code) ||
    existingCommunities.some((c: any) => c.code === code)
  ) {
    code = generateRandomCode(6);
  }
  return code;
}

interface PhotoItem {
  file: File;
  preview: string;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get("new") === "1";
  const initialCodeParam = searchParams.get("code")?.trim().toLowerCase() || "";

  // Step: "choose", "code", "create_community", or "profile"
  const [step, setStep] = useState<"choose" | "code" | "create_community" | "profile">(
    initialCodeParam ? "profile" : "choose",
  );

  // Form state
  const [communityCode, setCommunityCode] = useState(initialCodeParam);
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityTags, setNewCommunityTags] = useState("");
  const [newCommunityAskRelationshipStatus, setNewCommunityAskRelationshipStatus] = useState(false);
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [createdCommunity, setCreatedCommunity] = useState<any | null>(null);
  const [codeError, setCodeError] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [attractedTo, setAttractedTo] = useState<string[]>([]);
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const hasPrefilledRef = useRef(false);

  // Check user's profiles and communities
  const { data, isLoading: loadingData } = db.useQuery(
    user
      ? {
          profiles: {
            $: {
              where: { "user.id": user.id },
            },
            community: {},
          },
          communities: {},
        }
      : null,
  );

  const communities = useMemo(() => data?.communities || [], [data?.communities]);
  const completedProfiles = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (data?.profiles || []).filter((p: any) => p.onboardingComplete),
    [data?.profiles],
  );

  // Auto-fill and auto-advance community code from query param
  useEffect(() => {
    const codeParam = searchParams.get("code")?.trim().toLowerCase();
    if (codeParam && communities.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isValid = VALID_COMMUNITY_CODES.includes(codeParam) || communities.some((c: any) => c.code === codeParam);
      if (isValid) {
        setCommunityCode(codeParam);
        // If user already has a completed profile in this community, go straight to compare
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const alreadyInCommunity = completedProfiles.some((p: any) => firstOf(p.community)?.code === codeParam);
        if (alreadyInCommunity && !isNew) {
          localStorage.setItem("activeCommunityCode", codeParam);
          navigate("/app/compare");
        } else {
          setStep("profile");
        }
      } else {
        setCodeError(`Invalid community code: "${codeParam}"`);
        setStep("code");
      }
    }
  }, [searchParams, communities, completedProfiles, isNew, navigate]);

  // Determine which community settings/tags to show
  const currentCommunity = useMemo(() => {
    const normalized = communityCode.trim().toLowerCase();
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      communities.find((c: any) => c.code === normalized) ||
      (createdCommunity?.code === normalized ? createdCommunity : undefined)
    );
  }, [communities, communityCode, createdCommunity]);

  const availableTags: string[] = useMemo(
    () => (Array.isArray(currentCommunity?.tags) ? currentCommunity.tags : []),
    [currentCommunity?.tags],
  );
  const requirePhone = !!currentCommunity?.requirePhone;
  const askRelationshipStatus = !!currentCommunity?.askRelationshipStatus || currentCommunity?.code === "burningdesire";

  const handleCodeSubmit = () => {
    const code = communityCode.trim().toLowerCase();
    if (!code) {
      setCodeError("Please enter a community code");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isValid = VALID_COMMUNITY_CODES.includes(code) || communities.some((c: any) => c.code === code);
    if (!isValid) {
      setCodeError("Invalid community code. Ask your organizer or create a new community.");
      return;
    }

    setStep("profile");
  };

  const handleCreateCommunity = async () => {
    if (creatingCommunity) return;
    const commName = newCommunityName.trim();
    if (!commName) {
      setCodeError("Please enter a community name");
      return;
    }

    const code = getUniqueCommunityCode(communities);
    setCreatingCommunity(true);
    setCodeError("");

    try {
      const communityId = id();
      const tagsArray = newCommunityTags
        ? newCommunityTags.split(",").map(t => t.trim()).filter(Boolean)
        : null;

      const commData = {
        name: commName,
        code,
        tags: tagsArray ? tagsArray : undefined,
        askRelationshipStatus: newCommunityAskRelationshipStatus ? true : undefined,
        createdAt: Date.now(),
      };

      await db.transact([
        db.tx.communities[communityId]
          .update(commData)
          .link({ creator: user!.id }),
      ]);
      setCreatedCommunity({ id: communityId, ...commData });
      localStorage.setItem("activeCommunityCode", code);
      setCommunityCode(code);
      setStep("profile");
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : "Failed to create community");
    } finally {
      setCreatingCommunity(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_PHOTOS - existingPhotoUrls.length - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const newPhotos = filesToAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
    setSaveError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotoUrls(prev => {
      const newUrls = [...prev];
      newUrls.splice(index, 1);
      return newUrls;
    });
  };

  // Redirect already-onboarded users only if they landed on /app/onboarding directly without ?new=1 or ?code=
  useEffect(() => {
    const codeParam = searchParams.get("code")?.trim().toLowerCase();
    if (completedProfiles.length > 0 && !isNew && !codeParam && step === "choose" && !saving) {
      navigate("/app/compare");
    }
  }, [completedProfiles.length, isNew, searchParams, step, saving, navigate]);

  // Pre-fill profile form once from existing profile if user already has one
  useEffect(() => {
    if (completedProfiles.length > 0 && !hasPrefilledRef.current) {
      hasPrefilledRef.current = true;
      const p = completedProfiles[0];
      setName(prev => prev || p.name || "");
      setAge(prev => prev || p.age?.toString() || "");
      setGender(prev => prev || p.gender || "");
      setAttractedTo(prev => {
        if (prev.length > 0) return prev;
        const raw = p.attractedTo;
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === "string" && raw.startsWith("[")) {
          try {
            return JSON.parse(raw);
          } catch {
            /* fall through */
          }
        }
        if (raw === "both") return ["men", "women"];
        if (raw) return [raw];
        return [];
      });
      setRelationshipStatus(prev => prev || p.relationshipStatus || "");
      setBio(prev => prev || p.bio || "");
      setLocation(prev => prev || p.location || "");
      setPhone(prev => prev || p.phone || "");

      const urls = Array.isArray(p.photoUrls) ? p.photoUrls : [];
      if (urls.length > 0) {
        setExistingPhotoUrls(urls);
      } else if (p.photoUrl) {
        setExistingPhotoUrls([p.photoUrl]);
      }
    }
  }, [completedProfiles]);

  // Scope pre-filled tags to the selected community's availableTags without causing render loops
  useEffect(() => {
    if (!currentCommunity || completedProfiles.length === 0) return;
    const p = completedProfiles[0];
    const sourceTags: string[] = Array.isArray(p?.tags) ? p.tags : [];
    const filteredTags = sourceTags.filter((t: string) => availableTags.includes(t));
    setTags(prev => {
      if (prev.length > 0) return prev;
      if (prev.length === filteredTags.length && prev.every((t, i) => t === filteredTags[i])) {
        return prev;
      }
      return filteredTags;
    });
  }, [currentCommunity, availableTags, completedProfiles]);

  const toggleTag = (tag: string) => {
    setTags((prev: string[]) =>
      prev.includes(tag)
        ? prev.filter((t: string) => t !== tag)
        : [...prev, tag],
    );
  };

  const parsedAge = parseInt(age, 10);
  const isFormValid = Boolean(
    name.trim() &&
    age &&
    !isNaN(parsedAge) &&
    parsedAge >= 18 &&
    gender &&
    attractedTo.length > 0 &&
    (!askRelationshipStatus || relationshipStatus) &&
    bio.trim() &&
    (!requirePhone || phone.trim()) &&
    (photos.length > 0 || existingPhotoUrls.length > 0),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    if (!isFormValid) {
      const missing: string[] = [];
      if (!name.trim()) missing.push("name");
      if (!age || isNaN(parsedAge) || parsedAge < 18) missing.push("age (18+)");
      if (requirePhone && !phone.trim()) missing.push("phone number");
      if (!gender) missing.push("gender");
      if (attractedTo.length === 0) missing.push("who you're attracted to");
      if (askRelationshipStatus && !relationshipStatus) missing.push("relationship status");
      if (photos.length === 0 && existingPhotoUrls.length === 0) missing.push("at least 1 photo");
      if (!bio.trim()) missing.push("bio");
      setSaveError(`Please fill out required fields: ${missing.join(", ")}`);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const targetCode = communityCode.trim().toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let targetCommunity = communities.find((c: any) => c.code === targetCode) ||
        (createdCommunity?.code === targetCode ? createdCommunity : undefined);

      if (!targetCommunity) {
        const { data: commQuery } = await db.queryOnce({
          communities: { $: { where: { code: targetCode } } },
        });
        targetCommunity = commQuery?.communities?.[0];
      }

      if (!targetCommunity) {
        setSaveError("Community not found. Please go back and select a valid community.");
        setSaving(false);
        return;
      }

      // Reuse profile if user already has one for this community (or an unlinked profile); otherwise create a new profile for this community
      const allProfiles = data?.profiles || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingForCommunity = allProfiles.find((p: any) => {
        const comm = firstOf(p.community);
        return comm?.code === targetCode || comm?.id === targetCommunity.id;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unlinkedProfile = allProfiles.find((p: any) => !firstOf(p.community));
      const profileId = existingForCommunity?.id || unlinkedProfile?.id || id();

      // Upload photos
      const finalPhotoUrls: string[] = [...existingPhotoUrls].map(extractPath);
      for (let i = 0; i < photos.length; i++) {
        const photoPath = `profiles/${user.id}/photo-${i}-${Date.now()}`;
        await db.storage.uploadFile(photoPath, photos[i].file);
        finalPhotoUrls.push(photoPath);
      }

      const profileData: Record<string, unknown> = {
        name: name.trim(),
        age: parsedAge,
        gender,
        attractedTo,
        relationshipStatus: askRelationshipStatus ? (relationshipStatus || undefined) : undefined,
        tags,
        bio: bio.trim(),
        location: location.trim() || undefined,
        phone: normalizePhone(phone) || undefined,
        onboardingComplete: true,
        createdAt: Date.now(),
      };
      if (finalPhotoUrls.length > 0) {
        profileData.photoUrl = finalPhotoUrls[0]; // backward compat
        profileData.photoUrls = finalPhotoUrls;
      }

      try {
        await db.transact([
          db.tx.profiles[profileId]
            .update(profileData)
            .link({ user: user.id, community: targetCommunity.id }),
        ]);
      } catch (txErr) {
        // Fallback if DB schema still has a 1:1 constraint on profiles.user
        const fallbackId = allProfiles[0]?.id;
        if (fallbackId && fallbackId !== profileId) {
          await db.transact([
            db.tx.profiles[fallbackId]
              .update(profileData)
              .link({ user: user.id, community: targetCommunity.id }),
          ]);
        } else {
          throw txErr;
        }
      }

      localStorage.setItem("activeCommunityCode", targetCode);
      navigate("/app/compare");
    } catch (e) {
      console.error("Save profile error:", e);
      setSaveError(
        e instanceof Error ? e.message : "Failed to save profile. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (initialCodeParam && loadingData && !currentCommunity) {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center">
        <Spinner message="Loading community invite..." size="lg" />
      </div>
    );
  }

  // Step 0: Choose between entering a community code or creating a new community
  if (step === "choose") {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
        <div className="border-b border-grape-900/50 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span
              onClick={() => navigate("/")}
              className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
            >
              NOFOBO
            </span>
            {completedProfiles.length > 0 && (
              <button
                onClick={() => navigate("/app/compare")}
                className="text-grape-400 text-sm hover:text-white"
              >
                Back
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <h1 className="text-4xl font-black text-white mb-3">
              Join or create a community
            </h1>
            <p className="text-grape-400 mb-8">
              Enter an invite code from your organizer, or start a new community of your own.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setStep("code");
                  setCodeError("");
                }}
                className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 text-white py-4 rounded-xl font-bold text-lg transition-all"
              >
                Enter Community Code
              </button>

              <button
                onClick={() => {
                  setStep("create_community");
                  setCodeError("");
                }}
                className="w-full bg-grape-950 border border-grape-700 hover:border-grape-500 hover:bg-grape-900 text-white py-4 rounded-xl font-bold text-lg transition-all"
              >
                Create a Community
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 1a: Enter Community Code
  if (step === "code") {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
        <div className="border-b border-grape-900/50 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span
              onClick={() => navigate("/")}
              className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
            >
              NOFOBO
            </span>
            <button
              onClick={() => {
                setStep("choose");
                setCodeError("");
              }}
              className="text-grape-400 text-sm hover:text-white"
            >
              Back
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <h1 className="text-4xl font-black text-white mb-3">
              Enter your community code
            </h1>
            <p className="text-grape-400 mb-8">
              Your organizer should have shared a code with you. This keeps your
              community private.
            </p>

            <input
              type="text"
              value={communityCode}
              onChange={(e) => {
                setCommunityCode(e.target.value);
                setCodeError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
              className="w-full bg-grape-950/60 border border-grape-700/80 rounded-xl px-4 py-4 text-white text-center text-lg placeholder:text-grape-500 focus:outline-none focus:border-grape-400 mb-3"
              placeholder="community code"
              autoFocus
            />

            {codeError && (
              <p className="text-red-400 text-sm mb-3">{codeError}</p>
            )}

            <button
              onClick={handleCodeSubmit}
              disabled={!communityCode.trim()}
              className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1b: Create Community
  if (step === "create_community") {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
        <div className="border-b border-grape-900/50 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span
              onClick={() => navigate("/")}
              className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
            >
              NOFOBO
            </span>
            <button
              onClick={() => {
                setStep("choose");
                setCodeError("");
              }}
              className="text-grape-400 text-sm hover:text-white"
            >
              Back
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <h1 className="text-4xl font-black text-white mb-3">
              Create a community
            </h1>
            <p className="text-grape-400 mb-8">
              Give your community a name to get started.
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <input
                  type="text"
                  value={newCommunityName}
                  onChange={(e) => {
                    setNewCommunityName(e.target.value);
                    setCodeError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCommunity()}
                  className="w-full bg-grape-950/60 border border-grape-700/80 rounded-xl px-4 py-4 text-white text-center text-lg placeholder:text-grape-500 focus:outline-none focus:border-grape-400"
                  placeholder="Community Name (e.g. Burners)"
                  autoFocus
                />
              </div>

              <div>
                <input
                  type="text"
                  value={newCommunityTags}
                  onChange={(e) => {
                    setNewCommunityTags(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCommunity()}
                  className="w-full bg-grape-950/60 border border-grape-700/80 rounded-xl px-4 py-4 text-white text-center text-lg placeholder:text-grape-500 focus:outline-none focus:border-grape-400"
                  placeholder="Custom tags (e.g. Climber, Foodie, Poly)"
                />
                <p className="text-grape-400 text-xs mt-2">Optional. Comma-separated list of tags for members to pick from (e.g. hobbies, interests, vibes).</p>
              </div>

              <div className="flex items-center justify-between py-2 px-1 text-left gap-3">
                <div>
                  <span className="text-grape-200 text-sm font-medium block">Ask for Relationship Status</span>
                  <span className="text-grape-400 text-xs block">Include relationship status field on member profiles</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewCommunityAskRelationshipStatus(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                    newCommunityAskRelationshipStatus ? "bg-grape-500" : "bg-grape-800"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      newCommunityAskRelationshipStatus ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {codeError && (
              <p className="text-red-400 text-sm mb-3">{codeError}</p>
            )}

            <button
              onClick={handleCreateCommunity}
              disabled={!newCommunityName.trim() || creatingCommunity}
              className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
            >
              {creatingCommunity ? "Creating..." : "Create & Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Profile form
  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-grape-900/50 px-6 py-4 relative z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span
            onClick={() => navigate("/")}
            className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
          >
            NOFOBO
          </span>
          <span className="text-grape-400 text-sm">Create Your Profile</span>
        </div>
      </div>

      {currentCommunity?.coverImageUrl && (
        <div className="w-full h-48 sm:h-64 relative border-b border-grape-900/50">
          <StorageImage 
            pathOrUrl={currentCommunity.coverImageUrl} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a1a] to-transparent"></div>
        </div>
      )}

      <div className={`flex-1 max-w-2xl mx-auto w-full px-6 ${currentCommunity?.coverImageUrl ? 'py-4' : 'py-8'}`}>
        <div className="text-center mb-8 relative z-10">
          <div className="inline-block mb-3 px-3 py-1 rounded-full bg-grape-900/80 border border-grape-700 text-grape-300 text-xs font-semibold uppercase tracking-wider">
            Step 1 of 2 · Profile Setup
          </div>
          <h1 className="text-3xl font-black text-white mb-2 drop-shadow-md">
            Join {currentCommunity?.name || "the community"}
          </h1>
          <p className="text-grape-300 text-sm max-w-lg mx-auto leading-relaxed drop-shadow-md">
            Create your profile for this community. Next, you'll compare pairs of members as everyone joins, and NOFOBO will compute your <strong>1 optimal match</strong>.
          </p>
        </div>

        {completedProfiles.length > 0 && (
          <div className="mb-8 bg-grape-950/80 border border-grape-700/80 rounded-xl p-4 text-center">
            <p className="text-grape-200 text-sm">
              ✨ We pre-filled your details from your existing profile — review below and click <strong>Join {currentCommunity?.name || "Community"}</strong>!
            </p>
          </div>
        )}

        <div className="space-y-6 pb-8">
          {/* Name & Age */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-grape-200 text-sm mb-2 font-medium">
                Your first name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-grape-950/60 border border-grape-700/80 rounded-xl px-4 py-3 text-white placeholder:text-grape-500 focus:outline-none focus:border-grape-400"
                placeholder="Alex"
              />
            </div>

            <div>
              <label className="block text-grape-200 text-sm mb-2 font-medium">
                Your age
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-grape-950/60 border border-grape-700/80 rounded-xl px-4 py-3 text-white placeholder:text-grape-500 focus:outline-none focus:border-grape-400"
                placeholder="28"
                min="18"
                max="120"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-grape-200 text-sm mb-2 font-medium">
              Location <span className="text-grape-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-grape-950/60 border border-grape-700/80 rounded-xl px-4 py-3 text-white placeholder:text-grape-500 focus:outline-none focus:border-grape-400"
              placeholder="San Francisco, CA"
            />
          </div>

          {/* Phone */}
          {(requirePhone || phone.trim() !== "") && (
            <div>
              <label className="block text-grape-200 text-sm mb-2 font-medium">
                Phone Number {requirePhone && <span className="text-red-400">*</span>}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-grape-950/60 border border-grape-700/80 rounded-xl px-4 py-3 text-white placeholder:text-grape-500 focus:outline-none focus:border-grape-400"
                placeholder="+1 (555) 123-4567"
              />
              <p className="text-grape-400 text-xs mt-2">Only visible to community admins.</p>
            </div>
          )}

          {/* Gender */}
          <div>
            <label className="block text-grape-200 text-sm mb-2 font-medium">
              I look like a
            </label>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {["man", "woman", "nonbinary"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-3 px-2 rounded-xl border font-medium capitalize text-sm sm:text-base transition-all ${
                    gender === g
                      ? "border-grape-400 bg-grape-600/30 text-white shadow-sm"
                      : "border-grape-700/80 bg-grape-950/40 text-grape-300 hover:border-grape-500"
                  }`}
                >
                  {g === "nonbinary" ? "non-binary" : g}
                </button>
              ))}
            </div>
          </div>

          {/* Attracted To */}
          <div>
            <label className="block text-grape-200 text-sm mb-2 font-medium">
              I'm attracted to people who look like
            </label>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {[
                { value: "men", label: "Men" },
                { value: "women", label: "Women" },
                { value: "nonbinary", label: "Non-binary" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAttractedTo((prev) =>
                    prev.includes(opt.value)
                      ? prev.filter((v) => v !== opt.value)
                      : [...prev, opt.value]
                  )}
                  className={`py-3 px-2 rounded-xl border font-medium text-sm sm:text-base transition-all ${
                    attractedTo.includes(opt.value)
                      ? "border-grape-400 bg-grape-600/30 text-white shadow-sm"
                      : "border-grape-700/80 bg-grape-950/40 text-grape-300 hover:border-grape-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-grape-400 text-xs mt-2">Select all that apply</p>
          </div>

          {/* Relationship Status */}
          {askRelationshipStatus && (
            <div>
              <label className="block text-grape-200 text-sm mb-2 font-medium">
                My relationship status
              </label>
              <div className="grid grid-cols-1 gap-2">
                {RELATIONSHIP_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRelationshipStatus(status)}
                    className={`py-3 px-4 rounded-xl border font-medium text-left text-sm sm:text-base transition-all ${
                      relationshipStatus === status
                        ? "border-grape-400 bg-grape-600/30 text-white shadow-sm"
                        : "border-grape-700/80 bg-grape-950/40 text-grape-300 hover:border-grape-500"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-grape-200 text-sm mb-2 font-medium">
                Tags <span className="text-grape-400 font-normal">(optional — select any that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag: string) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      tags.includes(tag)
                        ? "border-grape-400 bg-grape-600/30 text-white"
                        : "border-grape-700/80 bg-grape-950/40 text-grape-300 hover:border-grape-500"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          <div>
            <label className="block text-grape-200 text-sm mb-2 font-medium">
              Photos <span className="text-grape-400 font-normal">(at least 1 · {existingPhotoUrls.length + photos.length}/{MAX_PHOTOS})</span>
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <div className="grid grid-cols-3 gap-3">
              {existingPhotoUrls.map((url, i) => (
                <div key={`existing-${i}`} className="relative aspect-square">
                  <StorageImage
                    pathOrUrl={url}
                    alt={`Existing Photo ${i + 1}`}
                    className="w-full h-full object-cover rounded-xl border-2 border-grape-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(i)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {photos.map((photo, i) => (
                <div key={`new-${i}`} className="relative aspect-square">
                  <StorageImage
                    pathOrUrl={photo.preview}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover rounded-xl border-2 border-grape-500"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {(existingPhotoUrls.length + photos.length) < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-grape-700 bg-grape-950/40 rounded-xl text-grape-300 hover:border-grape-500 hover:text-white transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-xs font-medium">Add photo</span>
                </button>
              )}
            </div>
            <p className="text-grape-400 text-xs mt-2">Max 5MB each</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-grape-200 text-sm mb-2 font-medium">
              About you
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-grape-950/60 border border-grape-700/80 rounded-xl px-4 py-3 text-white placeholder:text-grape-500 focus:outline-none focus:border-grape-400 h-32 resize-none"
              placeholder="Write a bit about yourself, what you're into, what you're looking for..."
            />
          </div>

          {/* Error */}
          {saveError && (
            <p className="text-red-400 text-sm text-center">{saveError}</p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
          >
            {saving
              ? "Joining..."
              : `Join ${currentCommunity?.name || "Community"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
