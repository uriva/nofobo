import { useState } from "react";
import { useNavigate } from "react-router-dom";
import db from "../db.ts";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  // If already logged in, redirect
  if (user) {
    navigate("/onboarding");
    return null;
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
      navigate("/onboarding");
    } catch (e: any) {
      setError(e?.message ?? "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Back link */}
        <button
          onClick={() => navigate("/")}
          className="text-grape-500 hover:text-grape-400 mb-8 flex items-center gap-2 transition-colors"
        >
          &larr; Back to home
        </button>

        <div className="bg-grape-950/50 border border-grape-900/50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2">
              Join NOFOBO
            </h1>
            <p className="text-grape-400">
              {step === "email"
                ? "Enter your email to get started"
                : `We sent a code to ${sentTo}`}
            </p>
          </div>

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

        <p className="text-center text-grape-600 text-xs mt-6">
          No password needed. We'll send you a magic code every time you sign
          in.
        </p>
      </div>
    </div>
  );
}
