import { useEffect, useMemo, useRef, useState } from "react";
import { id } from "@instantdb/react";
import { useNavigate } from "react-router-dom";
import db from "../db.ts";
import { API_URL } from "../../../constants.ts";
import ProfileCard from "../components/ProfileCard.tsx";
import StorageImage from "../components/StorageImage.tsx";
import Layout from "../components/Layout.tsx";
import { useCommunity } from "../components/CommunityContext.tsx";

// deno-lint-ignore no-explicit-any
const firstOf = <T,>(x: any): T | undefined =>
  Array.isArray(x) ? x[0] : x;

export default function Match() {
  const navigate = useNavigate();
  const { user } = db.useAuth();
  const { activeCommunityCode } = useCommunity();
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [demoting, setDemoting] = useState(false);
  const [demoted, setDemoted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Query matches where the user participates, newest first.
  // deno-lint-ignore no-explicit-any
  const matchesQuery = (db as any).useQuery(
    user
      ? {
        matches: {
          $: {
            where: {
              or: [
                { "user1.id": user.id },
                { "user2.id": user.id },
              ],
            },
            order: { createdAt: "desc" },
          },
          user1: { profile: {} },
          user2: { profile: {} },
          cycle: {},
        },
      }
      : null,
  );

  const loading = !matchesQuery.data;

  // Pick the most recent match and derive the "other" user's info
  const matchInfo = useMemo(() => {
    // deno-lint-ignore no-explicit-any
    const m = matchesQuery.data?.matches?.[0] as any;
    if (!m || !user) return null;

    const u1 = firstOf<{ id: string; profile?: unknown }>(m.user1);
    const u2 = firstOf<{ id: string; profile?: unknown }>(m.user2);
    const other = u1?.id === user.id ? u2 : u1;
    // deno-lint-ignore no-explicit-any
    const otherProfile = firstOf<any>(other?.profile);
    const cycle = firstOf<{ weekStart?: string }>(m.cycle);
    const photoUrls = otherProfile?.photoUrls ?? [];

    return {
      matchId: m.id as string,
      revealed: !!m.revealed,
      cycleWeek: cycle?.weekStart ?? "",
      userId: other?.id ?? "",
      name: otherProfile?.name ?? "Unknown",
      age: otherProfile?.age ?? 0,
      aiDescription: otherProfile?.aiDescription ?? otherProfile?.bio ?? "",
      photoUrl: otherProfile?.photoUrl ?? photoUrls[0],
    };
  }, [matchesQuery.data, user]);

  // Live chat messages for the current match
  // deno-lint-ignore no-explicit-any
  const chatQuery = (db as any).useQuery(
    matchInfo?.matchId
      ? {
        chatMessages: {
          $: {
            where: { "match.id": matchInfo.matchId },
            order: { createdAt: "asc" },
          },
          sender: {},
        },
      }
      : null,
  );

  const chatMessages = chatQuery.data?.chatMessages ?? [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  const getAuthToken = () => user?.refresh_token ?? "";

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !user || !matchInfo?.matchId) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      const msgId = id();
      // deno-lint-ignore no-explicit-any
      await (db as any).transact([
        // deno-lint-ignore no-explicit-any
        (db.tx as any).chatMessages[msgId]
          .update({ text, createdAt: Date.now() })
          .link({ match: matchInfo.matchId, sender: user.id }),
      ]);
    } catch (e) {
      console.error("Send message error:", e);
      setChatInput(text); // Restore on failure
    }
  };

  const handleReveal = async () => {
    if (!matchInfo?.matchId) return;
    try {
      await db.transact([
        db.tx.matches[matchInfo.matchId].update({ revealed: true }),
      ]);
    } catch (e) {
      console.error("Reveal update error:", e);
    }
  };

  const handleDemote = async () => {
    if (!matchInfo?.userId || !user || !activeCommunityCode) return;
    setDemoting(true);
    try {
      const res = await fetch(`${API_URL}/api/elo/demote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          targetUserId: matchInfo.userId,
          community: activeCommunityCode,
        }),
      });
      const data = await res.json();
      if (data.success) setDemoted(true);
    } catch (e) {
      console.error("Demote error:", e);
    } finally {
      setDemoting(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-lg w-full">
          {loading
            ? (
              <div className="text-center">
                <div className="animate-pulse text-grape-400 text-xl">
                  Checking for your match...
                </div>
              </div>
            )
            : matchInfo && !matchInfo.revealed
            ? (
              /* Unrevealed match */
              <div className="text-center">
                <div className="text-6xl mb-6 animate-pulse">
                  {"\u{1f48c}"}
                </div>
                <h1 className="text-3xl font-black text-white mb-4">
                  You Have a Match!
                </h1>
                <p className="text-grape-300 mb-8">
                  The Gale-Shapley algorithm found your most stable match this
                  week.
                </p>
                {matchInfo.cycleWeek && (
                  <p className="text-grape-500 text-sm mb-8">
                    Week of {matchInfo.cycleWeek}
                  </p>
                )}
                <button
                  onClick={handleReveal}
                  className="bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 text-white px-10 py-4 rounded-full font-bold text-lg transition-all hover:shadow-xl hover:shadow-grape-600/30 hover:-translate-y-0.5 animate-bounce"
                >
                  Reveal Your Match
                </button>
              </div>
            )
            : matchInfo && matchInfo.revealed
            ? (
              /* Revealed match with chat */
              <div className="space-y-6">
                {!showChat
                  ? (
                    <>
                      <div className="text-center mb-6">
                        <div className="text-4xl mb-3">{"\u{2728}"}</div>
                        <h1 className="text-3xl font-black text-white mb-2">
                          Meet {matchInfo.name}
                        </h1>
                        <p className="text-grape-400">
                          Your NOFOBO match for the week of{" "}
                          {matchInfo.cycleWeek}
                        </p>
                      </div>

                      <ProfileCard
                        name={matchInfo.name}
                        age={matchInfo.age}
                        description={matchInfo.aiDescription}
                        photoUrl={matchInfo.photoUrl}
                        large
                      />

                      <div className="bg-grape-950/50 border border-grape-900/50 rounded-2xl p-6 text-center">
                        <p className="text-grape-300 text-sm leading-relaxed">
                          This match is{" "}
                          <strong className="text-grape-200">stable</strong>
                          {" "}&mdash; the Gale-Shapley algorithm guarantees
                          that neither you nor {matchInfo.name}{" "}
                          would prefer to be matched with someone else who
                          would also prefer you. In other words:{" "}
                          <strong className="text-grape-200">
                            no fear of better option.
                          </strong>
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => navigate("/app/compare")}
                          className="flex-1 border border-grape-700 text-grape-300 hover:bg-grape-950 py-3 rounded-xl font-semibold transition-all"
                        >
                          Keep Comparing
                        </button>
                        <button
                          onClick={() => setShowChat(true)}
                          className="flex-1 bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 text-white py-3 rounded-xl font-bold transition-all"
                        >
                          Chat with {matchInfo.name}
                        </button>
                      </div>

                      {demoted
                        ? (
                          <div className="bg-grape-950/50 border border-grape-900/50 rounded-xl p-4 text-center">
                            <p className="text-grape-400 text-sm">
                              Got it &mdash; {matchInfo.name}{" "}
                              won&rsquo;t be matched with you again. Keep
                              comparing to improve next week&rsquo;s match.
                            </p>
                          </div>
                        )
                        : (
                          <button
                            onClick={handleDemote}
                            disabled={demoting}
                            className="w-full text-grape-600 hover:text-grape-400 text-sm py-2 transition-colors disabled:opacity-50"
                          >
                            {demoting
                              ? "Updating..."
                              : `Dated ${matchInfo.name} and it's not a fit? Remove from future matches`}
                          </button>
                        )}
                    </>
                  )
                  : (
                    /* Chat view */
                    <div className="flex flex-col h-[calc(100vh-8rem)]">
                      <div className="flex items-center gap-3 pb-4 border-b border-grape-800 mb-4">
                        <button
                          onClick={() => setShowChat(false)}
                          className="text-grape-400 hover:text-grape-300 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        {matchInfo.photoUrl
                          ? (
                            <StorageImage
                              pathOrUrl={matchInfo.photoUrl}
                              alt={matchInfo.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )
                          : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-grape-500 to-purple-400 flex items-center justify-center text-white font-bold">
                              {matchInfo.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        <div>
                          <div className="font-bold text-white">
                            {matchInfo.name}
                          </div>
                          <div className="text-grape-500 text-xs">
                            Your match &middot; Week of {matchInfo.cycleWeek}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                        {chatMessages.length === 0 && (
                          <div className="text-center py-12">
                            <div className="text-4xl mb-3">{"\u{1f44b}"}</div>
                            <p className="text-grape-400 text-sm">
                              Say hi to {matchInfo.name}! You're matched for
                              this week.
                            </p>
                          </div>
                        )}
                        {chatMessages.map(
                          (msg: {
                            id: string;
                            text: string;
                            createdAt: number;
                            sender?: { id: string } | { id: string }[];
                          }) => {
                            const senderUser = firstOf<{ id: string }>(
                              msg.sender,
                            );
                            const isMe = senderUser?.id === user?.id;
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${
                                  isMe ? "justify-end" : "justify-start"
                                }`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                    isMe
                                      ? "bg-grape-600 text-white"
                                      : "bg-grape-950 border border-grape-800 text-grape-200"
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed">
                                    {msg.text}
                                  </p>
                                  <p
                                    className={`text-xs mt-1 ${
                                      isMe ? "text-grape-300" : "text-grape-600"
                                    }`}
                                  >
                                    {new Date(msg.createdAt).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          },
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && sendChatMessage()}
                          className="flex-1 bg-[#0f0a1a] border border-grape-800 rounded-xl px-4 py-3 text-white placeholder:text-grape-600 focus:outline-none focus:border-grape-500"
                          placeholder={`Message ${matchInfo.name}...`}
                        />
                        <button
                          onClick={sendChatMessage}
                          disabled={!chatInput.trim()}
                          className="bg-grape-600 hover:bg-grape-500 disabled:opacity-50 text-white px-6 rounded-xl font-semibold transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            )
            : (
              /* No match */
              <div className="text-center">
                <div className="text-6xl mb-6">{"\u{1f52e}"}</div>
                <h1 className="text-3xl font-black text-white mb-4">
                  No Match Yet
                </h1>
                <p className="text-grape-500 text-sm mb-8">
                  Matching happens every Sunday. Keep comparing to build your
                  preference list!
                </p>
                <button
                  onClick={() => navigate("/app/compare")}
                  className="bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 text-white px-8 py-3 rounded-full font-semibold transition-all"
                >
                  Start Comparing
                </button>
              </div>
            )}
        </div>
      </div>
    </Layout>
  );
}
