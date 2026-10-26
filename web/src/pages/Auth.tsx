import { useState, useRef } from "react";
import { Navigate, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import db from "../db.ts";
import StorageImage from "../components/StorageImage.tsx";
import AlgoComic from "../components/AlgoComic.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const firstOf = (x: any) => (Array.isArray(x) ? x[0] : x);

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code")?.trim().toLowerCase() || "";
  const { user } = db.useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);

  const { data: commData } = db.useQuery(
    inviteCode
      ? {
          communities: {
            $: { where: { code: inviteCode } },
            creator: { profile: {} },
          },
        }
      : null,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invitedCommunity: any = commData?.communities?.[0];
  const creatorObj = firstOf(invitedCommunity?.creator);
  const creatorProfiles = Array.isArray(creatorObj?.profile)
    ? creatorObj.profile
    : creatorObj?.profile
      ? [creatorObj.profile]
      : [];
  const creatorProfile = creatorProfiles[0];
  const ownerName: string | undefined = creatorProfile?.name;
  const ownerPhoto: string | undefined =
    creatorProfile?.photoUrl ||
    (Array.isArray(creatorProfile?.photoUrls) ? creatorProfile.photoUrls[0] : undefined);
  const ownerMessage: string | undefined = invitedCommunity?.description?.trim();

  // If already logged in, redirect
  if (user) {
    return <Navigate to={`/app/onboarding${location.search}`} replace />;
  }

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setSentTo(email.trim());
      setStep("code");
    } catch (e: any) {
      setError(e?.message ?? "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      await db.auth.signInWithMagicCode({ email: sentTo, code: code.trim() });
      navigate(`/app/onboarding${window.location.search}`);
    } catch (e: any) {
      setError(e?.message ?? "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-2xl w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <span
            onClick={() => navigate("/")}
            className="text-xl font-black text-white cursor-pointer hover:text-grape-300 transition-colors"
          >
            NOFOBO
          </span>
          <button
            onClick={() => navigate("/")}
            className="text-grape-400 hover:text-white flex items-center gap-1.5 transition-colors text-xs sm:text-sm"
          >
            About NOFOBO &rarr;
          </button>
        </div>

        {/* Invite & Sign-In Card */}
        <div className="bg-grape-950/70 border border-grape-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Banner Image */}
          {invitedCommunity?.coverImageUrl ? (
            <div className="w-full h-44 sm:h-56 relative border-b border-grape-800/70">
              <StorageImage
                pathOrUrl={invitedCommunity.coverImageUrl}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-transparent to-transparent" />
            </div>
          ) : invitedCommunity ? (
            <div className="w-full h-24 sm:h-28 relative border-b border-grape-800/60 bg-gradient-to-r from-grape-900 via-purple-900 to-grape-950 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
              <span className="px-3.5 py-1 rounded-full bg-[#0f0a1a]/70 border border-grape-600/60 text-grape-200 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                Community Invite
              </span>
            </div>
          ) : null}

          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              {invitedCommunity ? (
                <>
                  {invitedCommunity.coverImageUrl && (
                    <div className="inline-block mb-3 px-3 py-1 rounded-full bg-grape-900/80 border border-grape-700 text-grape-300 text-xs font-semibold uppercase tracking-wider">
                      Community Invite
                    </div>
                  )}
                  <h1 className="text-2xl sm:text-4xl font-black text-white mb-3 leading-tight">
                    Find your stable match in{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-grape-300 to-purple-200">
                      {invitedCommunity.name}
                    </span>{" "}
                    community
                  </h1>
                  <p className="text-grape-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                    Instead of endless swiping, everyone compares pairs of profiles and our Nobel Prize–winning algorithm finds you <strong>one optimal match</strong>.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-black text-white mb-2">
                    Join NOFOBO
                  </h1>
                  <p className="text-grape-400 text-sm">
                    {step === "email"
                      ? "Enter your email to get started"
                      : `We sent a code to ${sentTo}`}
                  </p>
                </>
              )}
            </div>

            {/* Community Owner Text / Organizer Welcome */}
            {invitedCommunity && (ownerMessage || ownerName) && (
              <div className="mb-6 bg-[#0f0a1a]/80 border border-grape-700/80 rounded-xl p-4 text-left">
                <div className="flex items-center gap-3 mb-2">
                  {ownerPhoto ? (
                    <StorageImage
                      pathOrUrl={ownerPhoto}
                      alt={ownerName || "Organizer"}
                      className="w-9 h-9 rounded-full object-cover border border-grape-500 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-grape-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(ownerName || invitedCommunity.name || "O").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-white text-xs sm:text-sm font-bold">
                      {ownerName ? `Hosted by ${ownerName}` : `${invitedCommunity.name} Organizer`}
                    </div>
                    <div className="text-grape-400 text-xs">
                      Community Owner
                    </div>
                  </div>
                </div>
                {ownerMessage ? (
                  <p className="text-grape-200 text-sm leading-relaxed whitespace-pre-wrap pl-1">
                    “{ownerMessage}”
                  </p>
                ) : (
                  <p className="text-grape-300 text-xs sm:text-sm leading-relaxed pl-1">
                    Welcome to <strong>{invitedCommunity.name}</strong>! Create your profile below — as everyone in the community signs up, you'll compare pairs and get your 1-on-1 match.
                  </p>
                )}
              </div>
            )}

            {invitedCommunity && step === "code" && (
              <p className="text-grape-300 text-sm text-center mb-6">
                We sent a 6-digit login code to <strong className="text-white">{sentTo}</strong>
              </p>
            )}

            <div className="max-w-md mx-auto">
              {step === "email" ? (
                <div className="space-y-3.5">
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                    placeholder="Enter your email (you@email.com)"
                    className="w-full bg-[#0f0a1a] border border-grape-700/80 rounded-xl px-4 py-3.5 text-white placeholder:text-grape-500 focus:outline-none focus:border-grape-400 transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={handleSendCode}
                    disabled={loading || !email.trim()}
                    className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-grape-900/40"
                  >
                    {loading
                      ? "Sending..."
                      : invitedCommunity
                        ? `Join ${invitedCommunity.name} with Email`
                        : "Continue with Email"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                    placeholder="6-digit code"
                    className="w-full bg-[#0f0a1a] border border-grape-700/80 rounded-xl px-4 py-3.5 text-white placeholder:text-grape-500 focus:outline-none focus:border-grape-400 transition-colors text-center text-2xl tracking-widest"
                    autoFocus
                    maxLength={6}
                  />
                  <button
                    onClick={handleVerifyCode}
                    disabled={loading || !code.trim()}
                    className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold transition-all"
                  >
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </button>
                  <button
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setError("");
                    }}
                    className="w-full text-grape-400 hover:text-white text-sm transition-colors"
                  >
                    Use a different email
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-950/50 border border-red-800/50 rounded-xl text-red-300 text-sm text-center">
                  {error}
                </div>
              )}

              <p className="text-center text-grape-400 text-xs mt-4">
                No password needed — we'll send a one-time login code to your email.
              </p>
            </div>
          </div>
        </div>

        {/* What is a Stable Match? + Mobile-Friendly Algorithm Comic */}
        <div className="mt-8 bg-grape-950/50 border border-grape-800/80 rounded-2xl p-5 sm:p-8 space-y-6">
          <div className="text-center sm:text-left">
            <div className="inline-block mb-2 px-3 py-1 rounded-full bg-grape-900/80 border border-grape-700 text-grape-300 text-xs font-semibold">
              Nobel Prize–Winning Math
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
              What is a stable match?
            </h2>
            <p className="text-grape-200 text-sm sm:text-base leading-relaxed mb-4">
              Dating apps fail because juggling 20 conversations means nobody gets your real attention — and you're always wondering if there's a "better option" out there (<strong>FOBO</strong>).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="bg-[#0f0a1a]/70 border border-grape-800/80 rounded-xl p-3.5">
                <div className="text-grape-300 font-bold text-xs uppercase tracking-wider mb-1">
                  1. Simple A-or-B Picks
                </div>
                <p className="text-grape-200 text-xs leading-relaxed">
                  Once members join, you just pick who you vibe with more between two profiles at a time.
                </p>
              </div>
              <div className="bg-[#0f0a1a]/70 border border-grape-800/80 rounded-xl p-3.5">
                <div className="text-grape-300 font-bold text-xs uppercase tracking-wider mb-1">
                  2. Private ELO Ranking
                </div>
                <p className="text-grape-200 text-xs leading-relaxed">
                  Your choices build a 100% private preference list — there is no public popularity score.
                </p>
              </div>
              <div className="bg-[#0f0a1a]/70 border border-grape-800/80 rounded-xl p-3.5">
                <div className="text-grape-300 font-bold text-xs uppercase tracking-wider mb-1">
                  3. Gale-Shapley Match
                </div>
                <p className="text-grape-200 text-xs leading-relaxed">
                  The algorithm pairs everyone so <strong>no two people would rather be with each other</strong> than their match.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold text-base sm:text-lg mb-3 text-center">
              How the Algorithm Works — In 8 Panels
            </h3>
            <AlgoComic />
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => emailInputRef.current?.focus(), 400);
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 text-white px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all"
            >
              {invitedCommunity
                ? `Scroll Up & Join ${invitedCommunity.name}`
                : "Scroll Up & Get Started"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
