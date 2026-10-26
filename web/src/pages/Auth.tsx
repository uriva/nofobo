import { useState } from "react";
import { Navigate, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import db from "../db.ts";
import StorageImage from "../components/StorageImage.tsx";

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

  const { data: commData } = db.useQuery(
    inviteCode
      ? {
          communities: { $: { where: { code: inviteCode } } },
        }
      : null,
  );
  const invitedCommunity = commData?.communities?.[0];

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
    <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full">
        {/* Back link */}
        <button
          onClick={() => navigate("/")}
          className="text-grape-500 hover:text-grape-400 mb-6 flex items-center gap-2 transition-colors text-sm"
        >
          &larr; About NOFOBO
        </button>

        <div className="bg-grape-950/50 border border-grape-900/50 rounded-2xl overflow-hidden">
          {invitedCommunity?.coverImageUrl && (
            <div className="w-full h-36 relative border-b border-grape-900/50">
              <StorageImage
                pathOrUrl={invitedCommunity.coverImageUrl}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a1a] to-transparent" />
            </div>
          )}

          <div className="p-8">
            <div className="text-center mb-6">
              {invitedCommunity ? (
                <>
                  <div className="inline-block mb-3 px-3 py-1 rounded-full bg-grape-900/80 border border-grape-700 text-grape-300 text-xs font-semibold uppercase tracking-wider">
                    Community Invite
                  </div>
                  <h1 className="text-3xl font-black text-white mb-2">
                    Join {invitedCommunity.name}
                  </h1>
                  <p className="text-grape-300 text-sm leading-relaxed">
                    NOFOBO finds everyone in the community <strong>one optimal match</strong> using Nobel Prize–winning math — no endless swiping.
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

            {invitedCommunity && step === "email" && (
              <div className="mb-6 bg-[#0f0a1a]/70 border border-grape-800/70 rounded-xl p-4 space-y-2.5 text-left">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-grape-800 text-grape-200 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <p className="text-grape-300 text-xs leading-relaxed">
                    <strong className="text-white">Create your profile</strong> (takes ~1 minute).
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-grape-800 text-grape-200 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <p className="text-grape-300 text-xs leading-relaxed">
                    <strong className="text-white">Compare pairs</strong> as members sign up to build your personal preference ranking.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-grape-800 text-grape-200 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <p className="text-grape-300 text-xs leading-relaxed">
                    <strong className="text-white">Get your 1-on-1 match</strong> once everyone is in!
                  </p>
                </div>
              </div>
            )}

            {invitedCommunity && step === "code" && (
              <p className="text-grape-400 text-sm text-center mb-6">
                We sent a 6-digit login code to <strong className="text-white">{sentTo}</strong>
              </p>
            )}

          {step === "email" ? (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                placeholder="your@email.com"
                className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500 transition-colors"
                autoFocus
              />
              <button
                onClick={handleSendCode}
                disabled={loading || !email.trim()}
                className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all"
              >
                {loading ? "Sending..." : "Send Magic Code"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                placeholder="Enter 6-digit code"
                className="w-full bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500 transition-colors text-center text-2xl tracking-widest"
                autoFocus
                maxLength={6}
              />
              <button
                onClick={handleVerifyCode}
                disabled={loading || !code.trim()}
                className="w-full bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
              <button
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                }}
                className="w-full text-grape-500 hover:text-grape-400 text-sm transition-colors"
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
          </div>
        </div>

        <p className="text-center text-grape-600 text-xs mt-6">
          No password needed. We'll send you a magic code every time you sign
          in.
        </p>
      </div>
    </div>
  );
}
