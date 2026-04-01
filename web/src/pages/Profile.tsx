import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import db from "../db.ts";
import Layout from "../components/Layout.tsx";

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
  file?: File;
  preview: string;
  existingUrl?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user } = db.useAuth();

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

  // deno-lint-ignore no-explicit-any
  const profile = data?.profiles?.[0] as any;

  // Form state
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
  const [saveMessage, setSaveMessage] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Initialize state when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAge(profile.age ? String(profile.age) : "");
      setGender(profile.gender || "");
      setAttractedTo(profile.attractedTo || "");
      setRelationshipStatus(profile.relationshipStatus || "");
      try {
        setKinkTags(JSON.parse(profile.kinkTags || "[]"));
      } catch {
        setKinkTags([]);
      }
      setBio(profile.bio || profile.aiDescription || "");
      setLocation(profile.location || "");
      
      try {
        const urls = JSON.parse(profile.photoUrls || "[]");
        if (urls.length === 0 && profile.photoUrl) urls.push(profile.photoUrl);
        setPhotos(urls.map((url: string) => ({ preview: url, existingUrl: url })));
      } catch {
        if (profile.photoUrl) {
          setPhotos([{ preview: profile.photoUrl, existingUrl: profile.photoUrl }]);
        }
      }
    }
  }, [profile]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed && removed.file) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggleKinkTag = (tag: string) => {
    setKinkTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const isFormValid =
    name.trim() &&
    age &&
    parseInt(age) >= 18 &&
    gender &&
    attractedTo &&
    relationshipStatus &&
    bio.trim();

  const saveProfile = async () => {
    if (!user || !profile || !isFormValid) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        if (photos[i].existingUrl) {
          photoUrls.push(photos[i].existingUrl!);
        } else if (photos[i].file) {
          const photoPath = `profiles/${user.id}/photo-${i}-${Date.now()}`;
          await db.storage.uploadFile(photoPath, photos[i].file!);
          // deno-lint-ignore no-explicit-any
          const downloadData = await (db as any).storage.getDownloadUrl(photoPath);
          const url = downloadData?.url || downloadData;
          if (url && typeof url === "string") {
            photoUrls.push(url);
          }
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
      };

      if (photoUrls.length > 0) {
        profileData.photoUrl = photoUrls[0];
        profileData.photoUrls = JSON.stringify(photoUrls);
      } else {
        profileData.photoUrl = null;
        profileData.photoUrls = "[]";
      }

      await db.transact([
        db.tx.profiles[profile.id].update(profileData),
      ]);

      setSaveMessage("Profile saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error("Save profile error:", e);
      setSaveMessage(e instanceof Error ? e.message : "Failed to save profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Edit Your Profile</h1>
          <p className="text-grape-400">
            Update your details and photos
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
          <div className="space-y-8 bg-grape-950/50 border border-grape-900/50 rounded-2xl p-6 md:p-8">
             {/* Name */}
            <div>
              <label className="block text-grape-300 text-sm mb-2 font-medium">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
              />
            </div>
            
             {/* Age & Location */}
             <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-grape-300 text-sm mb-2 font-medium">Your age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
                  min="18"
                  max="120"
                />
              </div>
              <div>
                <label className="block text-grape-300 text-sm mb-2 font-medium">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
                  placeholder="San Francisco, CA"
                />
              </div>
            </div>

            {/* Gender & Attracted To */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-grape-300 text-sm mb-2 font-medium">I am</label>
                <div className="flex flex-col gap-2">
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
              <div>
                <label className="block text-grape-300 text-sm mb-2 font-medium">Attracted to</label>
                <div className="flex flex-col gap-2">
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
            <div className="pt-4 border-t border-grape-800/50">
              <button
                onClick={saveProfile}
                disabled={!isFormValid || saving}
                className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
              {saveMessage && (
                <p className={`mt-3 text-sm text-center ${saveMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                  {saveMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
