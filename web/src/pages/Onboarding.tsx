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

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = db.useAuth();

  // Step: "code" or "profile"
  const [step, setStep] = useState<"code" | "profile">("code");

  // Form state
  const [communityCode, setCommunityCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [attractedTo, setAttractedTo] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [matchWithStatuses, setMatchWithStatuses] = useState<string[]>([]);
  const [kinkTags, setKinkTags] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
        }
      : null,
  );

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
    if (!VALID_COMMUNITY_CODES.includes(code)) {
      setCodeError("Invalid community code. Check with your organizer.");
      return;
    }
    setCodeError("");
    setStep("profile");
  };

  const handlePhotoSelect = (e: { target: HTMLInputElement }) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const toggleMatchStatus = (status: string) => {
    setMatchWithStatuses((prev: string[]) =>
      prev.includes(status)
        ? prev.filter((s: string) => s !== status)
        : [...prev, status],
    );
  };

  const toggleKinkTag = (tag: string) => {
    setKinkTags((prev: string[]) =>
      prev.includes(tag) ? prev.filter((t: string) => t !== tag) : [...prev, tag],
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
    matchWithStatuses.length > 0 &&
    bio.trim();

  const saveProfile = async () => {
    if (!user || !isFormValid) return;
    setSaving(true);
    try {
      const profileId = id();

      // Upload photo if selected
      let photoUrl: string | undefined;
      if (photoFile) {
        const photoPath = `profiles/${user.id}/photo`;
        await db.storage.uploadFile(photoPath, photoFile);
        // deno-lint-ignore no-explicit-any
        const fileResult = await (db as any).queryOnce({
          $files: { $: { where: { path: photoPath } } },
        });
        const files = fileResult.data?.$files;
        if (files && files.length > 0) {
          photoUrl = (files[0] as { url?: string }).url;
        }
      }

      const profileData: Record<string, unknown> = {
        name: name.trim(),
        age: parseInt(age),
        gender,
        attractedTo,
        relationshipStatus,
        matchWithStatuses: JSON.stringify(matchWithStatuses),
        kinkTags: JSON.stringify(kinkTags),
        bio: bio.trim(),
        communityCode: communityCode.trim().toLowerCase(),
        onboardingComplete: true,
        createdAt: Date.now(),
      };
      if (photoUrl) profileData.photoUrl = photoUrl;

      await db.transact([
        db.tx.profiles[profileId]
          .update(profileData)
          .link({ user: user.id }),
      ]);

      navigate("/app/compare");
    } catch (e) {
      console.error("Save profile error:", e);
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
              Your organizer should have shared a code with you.
              This keeps your community private.
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
              className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
            >
              Continue
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

          {/* Match With Statuses */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              I'm open to matching with (select all that apply)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {RELATIONSHIP_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleMatchStatus(status)}
                  className={`py-3 px-4 rounded-xl border font-medium text-left transition-all ${
                    matchWithStatuses.includes(status)
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
              {KINK_TAGS.map((tag) => (
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

          {/* Photo */}
          <div>
            <label className="block text-grape-300 text-sm mb-2 font-medium">
              Your photo
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            {photoPreview ? (
              <div className="flex items-center gap-4">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-grape-600"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="text-grape-400 hover:text-grape-300 text-sm font-medium transition-colors"
                  >
                    Change photo
                  </button>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-grape-800 rounded-xl px-4 py-6 text-grape-500 hover:border-grape-600 hover:text-grape-400 transition-colors flex flex-col items-center gap-2"
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm font-medium">Upload a photo</span>
                <span className="text-xs text-grape-600">Max 5MB</span>
              </button>
            )}
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
