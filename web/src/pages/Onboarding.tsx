import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { id } from "@instantdb/react";
import db from "../db.ts";
import { API_URL } from "../../../constants.ts";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"basics" | "chat" | "review">("basics");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [links, setLinks] = useState("");
  const [generatedProfile, setGeneratedProfile] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      navigate("/compare");
    }
  }, [data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start AI chat when entering chat step
  useEffect(() => {
    if (step === "chat" && messages.length === 0) {
      startChat();
    }
  }, [step]);

  const getAuthToken = () => {
    // user from db.useAuth() has refresh_token directly
    return user?.refresh_token ?? "";
  };

  const handlePhotoSelect = (e: { target: HTMLInputElement }) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate: images only, max 5MB
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

  const startChat = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/onboarding/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [],
          links: links.split("\n").map((l) => l.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.response) {
        setMessages([{ role: "assistant", content: data.response }]);
      } else {
        console.error("No response from chat API:", data);
        throw new Error(data.error || "No response");
      }
    } catch (e) {
      console.error("Failed to start chat:", e);
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! Let's build your profile. What do you do for work?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/onboarding/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          links: links.split("\n").map((l) => l.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.response) {
        // Check if profile is ready
        const profileMatch = data.response.match(
          /\[PROFILE_READY\]([\s\S]*?)\[\/PROFILE_READY\]/,
        );
        if (profileMatch) {
          setGeneratedProfile(profileMatch[1].trim());
          setMessages([
            ...newMessages,
            {
              role: "assistant",
              content:
                "I've got everything I need! Here's your profile - take a look and let me know if you'd like any changes.",
            },
          ]);
          setStep("review");
        } else {
          setMessages([
            ...newMessages,
            { role: "assistant", content: data.response },
          ]);
        }
      } else {
        console.error("No response from chat API:", data);
        throw new Error(data.error || "No response");
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Sorry, I had a hiccup. Could you try saying that again?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profileId = id();
      const linksArray = links
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean);

      // Upload photo if selected
      let photoUrl: string | undefined;
      if (photoFile) {
        const photoPath = `profiles/${user.id}/photo`;
        await db.storage.uploadFile(photoPath, photoFile);
        // Query for the uploaded file to get its URL
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
        name,
        age: parseInt(age),
        gender,
        lookingFor,
        bio: messages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join(" | "),
        links: JSON.stringify(linksArray),
        aiDescription: generatedProfile,
        onboardingComplete: true,
        createdAt: Date.now(),
      };
      if (photoUrl) profileData.photoUrl = photoUrl;

      await db.transact([
        db.tx.profiles[profileId]
          .update(profileData)
          .link({ user: user.id }),
      ]);

      navigate("/compare");
    } catch (e) {
      console.error("Save profile error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col">
      {/* Header */}
      <div className="border-b border-grape-900/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-xl font-black text-white">NOFOBO</span>
          <span className="text-grape-400 text-sm">
            {step === "basics"
              ? "Step 1: The Basics"
              : step === "chat"
                ? "Step 2: Tell Us About You"
                : "Step 3: Review Your Profile"}
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        {/* Step 1: Basics */}
        {step === "basics" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white mb-2">
                Let's start with the basics
              </h1>
              <p className="text-grape-400">
                These help us find compatible matches for you
              </p>
            </div>

            <div>
              <label className="block text-grape-300 text-sm mb-2 font-medium">
                Your first name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
                placeholder="Alex"
              />
            </div>

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

            <div>
              <label className="block text-grape-300 text-sm mb-2 font-medium">
                I am
              </label>
              <div className="grid grid-cols-3 gap-3">
                {["man", "woman", "non-binary"].map((g) => (
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
              <label className="block text-grape-300 text-sm mb-2 font-medium">
                Looking for
              </label>
              <div className="grid grid-cols-3 gap-3">
                {["man", "woman", "everyone"].map((pref) => (
                  <button
                    key={pref}
                    onClick={() => setLookingFor(pref)}
                    className={`py-3 rounded-xl border font-medium capitalize transition-all ${
                      lookingFor === pref
                        ? "border-grape-500 bg-grape-600/20 text-white"
                        : "border-grape-800 text-grape-400 hover:border-grape-600"
                    }`}
                  >
                    {pref === "everyone" ? "Everyone" : pref}
                  </button>
                ))}
              </div>
            </div>

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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Upload a photo</span>
                  <span className="text-xs text-grape-600">Max 5MB</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-grape-300 text-sm mb-2 font-medium">
                Your links (one per line) - social media, portfolio, blog, etc.
              </label>
              <textarea
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500 h-24 resize-none"
                placeholder={"https://twitter.com/you\nhttps://yoursite.com"}
              />
            </div>

            <button
              onClick={() => setStep("chat")}
              disabled={!name || !age || !gender || !lookingFor}
              className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
            >
              Continue to AI Chat
            </button>
          </div>
        )}

        {/* Step 2: AI Chat */}
        {step === "chat" && (
          <div className="flex flex-col h-[calc(100vh-12rem)]">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-grape-600 text-white"
                        : "bg-grape-950 border border-grape-800 text-grape-200"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-grape-950 border border-grape-800 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-grape-500 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-grape-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-grape-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
                placeholder="Type your answer..."
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-grape-600 hover:bg-grape-500 disabled:opacity-50 text-white px-6 rounded-xl font-semibold transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white mb-2">
                Your NOFOBO Profile
              </h1>
              <p className="text-grape-400">
                This is what others will see when comparing
              </p>
            </div>

            {/* Profile preview */}
            <div className="bg-grape-950 border border-grape-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-grape-500 to-purple-400 flex items-center justify-center text-2xl text-white font-bold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-white text-lg">
                    {name}, {age}
                  </div>
                  <div className="text-grape-400 text-sm capitalize">
                    {gender} &middot; Looking for {lookingFor}
                  </div>
                </div>
              </div>
              <p className="text-grape-200 leading-relaxed whitespace-pre-wrap">
                {generatedProfile}
              </p>
              {links && (
                <div className="mt-4 pt-4 border-t border-grape-800">
                  <p className="text-grape-500 text-xs mb-2">Links:</p>
                  <div className="flex flex-wrap gap-2">
                    {links
                      .split("\n")
                      .filter(Boolean)
                      .map((link, i) => (
                        <span
                          key={i}
                          className="text-xs text-grape-400 bg-grape-900 px-2 py-1 rounded"
                        >
                          {link.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("chat");
                  setGeneratedProfile("");
                }}
                className="flex-1 border border-grape-700 text-grape-300 hover:bg-grape-950 py-3 rounded-xl font-semibold transition-all"
              >
                Redo Chat
              </button>
              <button
                onClick={saveProfile}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all"
              >
                {loading ? "Saving..." : "Looks Great!"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
