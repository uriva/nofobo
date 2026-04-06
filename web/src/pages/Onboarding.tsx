import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { id } from "@instantdb/react";
import db from "../db.ts";

const VALID_COMMUNITY_CODES = ["burningdesire"];

const RELATIONSHIP_STATUSES = [
  "Very single",
  "Somewhat single",
  "In a non-exclusive relationship",
  "In a committed relationship but open to play",
];

const KINK_TAGS = [
  "Dom",
  "Sub",
  "Switch",
  "Voyeur",
  "Exhibitionist",
  "Bondage",
  "Role play",
  "Sensory play",
  "Impact play",
  "Group play",
];

const MAX_PHOTOS = 6;

interface PhotoItem {
  file: File;
  preview: string;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = db.useAuth();

  // Step: "code" or "profile" or "create_community"
  const [step, setStep] = useState<"code" | "profile" | "create_community">("code");

  // Form state
  const [communityCode, setCommunityCode] = useState("");
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityCode, setNewCommunityCode] = useState("");
  const [newCommunityTags, setNewCommunityTags] = useState("");
  const [codeError, setCodeError] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [attractedTo, setAttractedTo] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [kinkTags, setKinkTags] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Check if already onboarded
  const { data } = db.useQuery(
    user
      ? {
          profiles: {
            $: {
              where: { "user.id": user.id, onboardingComplete: true },
              limit: 1,
            },
          },
          communities: {}
        }
      : null,
  );

  const communities = data?.communities || [];

  useEffect(() => {
    if (data?.profiles?.length) {
      navigate("/app/compare");
    }
  }, [data]);

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
    setCodeError("");
    setStep("profile");
  };

  const handleCreateCommunity = async () => {
    const name = newCommunityName.trim();
    const code = newCommunityCode.trim().toLowerCase();
    
    if (!name || !code) {
      setCodeError("Please enter both a name and a code.");
      return;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exists = VALID_COMMUNITY_CODES.includes(code) || communities.some((c: any) => c.code === code);
    if (exists) {
      setCodeError("This code is already taken. Please choose another.");
      return;
    }

    try {
      const commId = id();
      
      const tagsList = newCommunityTags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await db.transact([
        db.tx.communities[commId].update({
          name: name,
          code: code,
          tags: tagsList.length > 0 ? JSON.stringify(tagsList) : undefined,
          createdAt: Date.now()
        }).link({ creator: user.id })
      ]);
      
      setCommunityCode(code);
      setCodeError("");
      setStep("profile");
    } catch (e) {
      console.error(e);
      setCodeError("Failed to create community. Try again.");
    }
  };

  const handlePhotoSelect = (e: { target: HTMLInputElement }) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: PhotoItem[] = [];
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = Math.min(files.length, remaining);

    for (let i = 0; i < toAdd; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) continue;
      newPhotos.push({ file, preview: URL.createObjectURL(file) });
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    // Reset input so selecting the same file again works
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggleKinkTag = (tag: string) => {
    setKinkTags((prev: string[]) =>
      prev.includes(tag)
        ? prev.filter((t: string) => t !== tag)
        : [...prev, tag],
    );
  };

  const isFormValid =
    communityCode.trim() &&
    name.trim() &&
    age &&
    parseInt(age) >= 18 &&
    gender &&
    attractedTo &&
    relationshipStatus &&
    bio.trim();

  // Determine which tags to show for this community
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentCommunity = communities.find((c: any) => c.code === communityCode.trim().toLowerCase());
  const availableTags = currentCommunity?.tags ? JSON.parse(currentCommunity.tags) : KINK_TAGS;

  const saveProfile = async () => {
    if (!user || !isFormValid) return;
    setSaving(true);
    setSaveError("");
    try {
      const profileId = id();

      // Upload photos
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photoPath = `profiles/${user.id}/photo-${i}-${Date.now()}`;
        await db.storage.uploadFile(photoPath, photos[i].file);
        // deno-lint-ignore no-explicit-any
        const downloadData = await (db as any).storage.getDownloadUrl(photoPath);
        const url = downloadData?.url || downloadData;
        if (url && typeof url === "string") {
          photoUrls.push(url);
        }
      }

      const profileData: Record<string, unknown> = {
        name: name.trim(),
        age: parseInt(age),
        gender,
        attractedTo,
        relationshipStatus,
        kinkTags: JSON.stringify(kinkTags),
        bio: bio.trim(),
        location: location.trim() || undefined,
        communityCode: communityCode.trim().toLowerCase(),
        onboardingComplete: true,
        createdAt: Date.now(),
      };
      if (photoUrls.length > 0) {
        profileData.photoUrl = photoUrls[0]; // backward compat
        profileData.photoUrls = JSON.stringify(photoUrls);
      }

      await db.transact([
        db.tx.profiles[profileId].update(profileData).link({ user: user.id }),
      ]);

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

  // Step 1: Community code gate
  if (step === "code") {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
        <div className="border-b border-grape-900/50 px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <span
              onClick={() => navigate("/")}
              className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
            >
              NOFOBO
            </span>
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
              className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-4 text-white text-center text-lg placeholder:text-grape-600 focus:outline-none focus:border-grape-500 mb-3"
              placeholder="community code"
              autoFocus
            />

            {codeError && (
              <p className="text-red-400 text-sm mb-3">{codeError}</p>
            )}

            <button
              onClick={handleCodeSubmit}
              disabled={!communityCode.trim()}
              className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all mb-4"
            >
              Continue
            </button>

            <button
              onClick={() => {
                setStep("create_community");
                setCodeError("");
              }}
              className="w-full bg-transparent border border-grape-700 hover:border-grape-500 hover:bg-grape-900 text-grape-300 py-3 rounded-xl font-medium transition-all"
            >
              Or create a new community
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1.5: Create Community
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
                setStep("code");
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
              Give your community a name, and choose a unique code that people can use to join.
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
                  className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-4 text-white text-center text-lg placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
                  placeholder="Community Name (e.g. Burners)"
                  autoFocus
                />
              </div>
              
              <div>
                <input
                  type="text"
                  value={newCommunityCode}
                  onChange={(e) => {
                    setNewCommunityCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''));
                    setCodeError("");
                  }}
                  className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-4 text-white text-center text-lg placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
                  placeholder="unique-code"
                />
                <p className="text-grape-600 text-xs mt-2">Only letters, numbers, hyphens, and underscores</p>
              </div>

              <div>
                <input
                  type="text"
                  value={newCommunityTags}
                  onChange={(e) => {
                    setNewCommunityTags(e.target.value);
                  }}
                  className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-4 text-white text-center text-lg placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
                  placeholder="Custom tags (e.g. Burner, Raver, Sub)"
                />
                <p className="text-grape-600 text-xs mt-2">Optional. Comma separated list of tags for your community members to pick from.</p>
              </div>
            </div>

            {codeError && (
              <p className="text-red-400 text-sm mb-3">{codeError}</p>
            )}

            <button
              onClick={handleCreateCommunity}
              disabled={!newCommunityName.trim() || !newCommunityCode.trim()}
              className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
            >
              Create & Continue
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
      <div className="border-b border-grape-900/50 px-6 py-4">
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

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            Set up your profile
          </h1>
          <p className="text-grape-400">
            Fill in your details to start comparing and finding your match
          </p>
        </div>

        <div className="space-y-8">
          {/* Name */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
              placeholder="Alex"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              Your age
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
              placeholder="28"
              min="18"
              max="120"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
              placeholder="San Francisco, CA"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              I am
            </label>
            <div className="grid grid-cols-2 gap-3">
              {["man", "woman"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`py-3 rounded-xl border font-medium capitalize transition-all ${
                    gender === g
                      ? "border-grape-500 bg-grape-600/20 text-white"
                      : "border-grape-800 text-grape-400 hover:border-grape-600"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Attracted To */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              Attracted to
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "men", label: "Men" },
                { value: "women", label: "Women" },
                { value: "both", label: "Both" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAttractedTo(opt.value)}
                  className={`py-3 rounded-xl border font-medium transition-all ${
                    attractedTo === opt.value
                      ? "border-grape-500 bg-grape-600/20 text-white"
                      : "border-grape-800 text-grape-400 hover:border-grape-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship Status */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              My relationship status
            </label>
            <div className="grid grid-cols-1 gap-2">
              {RELATIONSHIP_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => setRelationshipStatus(status)}
                  className={`py-3 px-4 rounded-xl border font-medium text-left transition-all ${
                    relationshipStatus === status
                      ? "border-grape-500 bg-grape-600/20 text-white"
                      : "border-grape-800 text-grape-400 hover:border-grape-600"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Kink Tags */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              Tags (select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag: string) => (
                <button
                  key={tag}
                  onClick={() => toggleKinkTag(tag)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    kinkTags.includes(tag)
                      ? "border-grape-500 bg-grape-600/20 text-white"
                      : "border-grape-800 text-grape-400 hover:border-grape-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              Photos ({photos.length}/{MAX_PHOTOS})
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
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square">
                  <img
                    src={photo.preview}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover rounded-xl border-2 border-grape-600"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors"
                  >
                    x
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-grape-800 rounded-xl text-grape-500 hover:border-grape-600 hover:text-grape-400 transition-colors flex flex-col items-center justify-center gap-1"
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
                  <span className="text-xs">Add photo</span>
                </button>
              )}
            </div>
            <p className="text-grape-600 text-xs mt-2">Max 5MB each</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              About you
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500 h-32 resize-none"
              placeholder="Write a bit about yourself, what you're into, what you're looking for..."
            />
          </div>

          {/* Error */}
          {saveError && (
            <p className="text-red-400 text-sm text-center">{saveError}</p>
          )}

          {/* Submit */}
          <button
            onClick={saveProfile}
            disabled={!isFormValid || saving}
            className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
          >
            {saving ? "Saving..." : "Create Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
