// NOFOBO Backend - Deno Server
// Handles AI onboarding, profile generation, pair selection, and weekly matching

import { id } from "@instantdb/admin";
import adminDb from "./db.ts";
import {
  continueOnboarding,
  generateProfileFromLinks,
  fetchLinkSummary,
  extractUrls,
} from "./ai.ts";
import {
  runMatching,
  updateElo,
  selectNextPair,
  type UserEloData,
} from "./galeShapley.ts";
import { ELO_DEFAULT } from "../../constants.ts";

// --- CORS ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- Auth helper ---
async function verifyAuth(
  req: Request,
): Promise<{ id: string; email: string } | null> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const user = await adminDb.auth.verifyToken(token);
    if (!user) return null;
    return { id: user.id, email: user.email ?? "" };
  } catch {
    return null;
  }
}

// --- Route Handler ---
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check
  if (path === "/api/health") {
    return json({ status: "ok", app: "NOFOBO" });
  }

  // --- Onboarding Chat ---
  if (path === "/api/onboarding/chat" && req.method === "POST") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const chatHistory = body.messages ?? [];
    const userLinks: string[] = body.links ?? [];

    try {
      // Collect all URLs: from step-1 links + any URLs in user messages
      const allUrls = new Set<string>(userLinks);
      for (const msg of chatHistory) {
        if (msg.role === "user") {
          for (const url of extractUrls(msg.content)) {
            allUrls.add(url);
          }
        }
      }

      // Scrape URLs and build context
      let linkContext = "";
      if (allUrls.size > 0) {
        const summaries = await Promise.all(
          [...allUrls].map(async (url) => {
            const summary = await fetchLinkSummary(url);
            return summary ? `[Content from ${url}]:\n${summary}` : "";
          }),
        );
        const validSummaries = summaries.filter(Boolean);
        if (validSummaries.length > 0) {
          linkContext = "\n\n--- Scraped content from user's links ---\n" +
            validSummaries.join("\n\n") +
            "\n--- End of scraped content ---\n\nUse the above scraped content to inform your questions and eventually the profile you write. Reference specific details you find interesting.";
        }
      }

      const response = await continueOnboarding(chatHistory, linkContext);
      return json({ response });
    } catch (e) {
      console.error("Onboarding chat error:", e);
      return json({ error: "AI service error" }, 500);
    }
  }

  // --- Generate Profile from Links/Bio ---
  if (path === "/api/profile/generate" && req.method === "POST") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { bio, links } = body;

    try {
      // Optionally fetch link content for richer profile
      const linkSummaries = await Promise.all(
        (links ?? []).map((l: string) => fetchLinkSummary(l)),
      );
      const enrichedBio =
        bio +
        linkSummaries
          .filter(Boolean)
          .map((s: string) => `\n\nFrom link: ${s}`)
          .join("");

      const profile = await generateProfileFromLinks(enrichedBio, links ?? []);
      return json({ profile });
    } catch (e) {
      console.error("Profile generation error:", e);
      return json({ error: "AI service error" }, 500);
    }
  }

  // --- Get Next Comparison Pair ---
  if (path === "/api/compare/pair" && req.method === "GET") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    try {
      // Get user's profile to know their preferences
      const { profiles } = await adminDb.query({
        profiles: { $: { where: { "user.id": user.id } } },
      });
      const myProfile = profiles[0];
      if (!myProfile) return json({ error: "Profile not found" }, 404);

      // Get all eligible profiles
      const lookingFor = myProfile.lookingFor;
      const genderFilter =
        lookingFor === "everyone" ? {} : { gender: lookingFor };

      const { profiles: candidates } = await adminDb.query({
        profiles: {
          $: { where: { ...genderFilter, onboardingComplete: true } },
          user: {},
        },
      });

      // Filter out self
      const otherCandidates = candidates.filter(
        (p) => p.user?.id !== user.id,
      );

      if (otherCandidates.length < 2) {
        return json({ pair: null, reason: "Not enough candidates yet" });
      }

      // Get user's existing comparisons
      const { comparisons } = await adminDb.query({
        comparisons: {
          $: { where: { "voter.id": user.id } },
          winner: {},
          loser: {},
        },
      });

      const comparedPairs = new Set<string>();
      for (const c of comparisons) {
        const wId = c.winner?.id;
        const lId = c.loser?.id;
        if (wId && lId) comparedPairs.add(`${wId}:${lId}`);
      }

      // Get user's ELO ratings
      const { eloRatings } = await adminDb.query({
        eloRatings: {
          $: { where: { "rater.id": user.id } },
          target: {},
        },
      });

      const userElo = new Map<string, number>();
      for (const r of eloRatings) {
        const targetId = r.target?.id;
        if (targetId) userElo.set(targetId, r.score);
      }

      // Select next pair using user IDs (not profile IDs)
      const candidateUserIds = otherCandidates
        .map((p) => p.user?.id)
        .filter(Boolean) as string[];

      const pair = selectNextPair(userElo, comparedPairs, candidateUserIds);
      if (!pair) {
        return json({
          pair: null,
          reason: "You've compared all available candidates!",
        });
      }

      // Return full profile data for both candidates
      const pairProfiles = pair.map((userId) =>
        otherCandidates.find((p) => p.user?.id === userId),
      );

      return json({
        pair: pairProfiles.map((p) => ({
          userId: p?.user?.id,
          profileId: p?.id,
          name: p?.name,
          age: p?.age,
          aiDescription: p?.aiDescription,
          photoUrl: p?.photoUrl,
        })),
        totalComparisons: comparisons.length,
      });
    } catch (e) {
      console.error("Pair selection error:", e);
      return json({ error: "Failed to select pair" }, 500);
    }
  }

  // --- Submit Comparison ---
  if (path === "/api/compare/submit" && req.method === "POST") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { winnerId, loserId } = body;

    if (!winnerId || !loserId) {
      return json({ error: "winnerId and loserId required" }, 400);
    }

    try {
      // Create comparison record
      const comparisonId = id();
      await adminDb.transact([
        adminDb.tx.comparisons[comparisonId]
          .update({ createdAt: Date.now() })
          .link({ voter: user.id, winner: winnerId, loser: loserId }),
      ]);

      // Update ELO ratings
      const { eloRatings } = await adminDb.query({
        eloRatings: {
          $: { where: { "rater.id": user.id } },
          target: {},
        },
      });

      let winnerElo = ELO_DEFAULT;
      let loserElo = ELO_DEFAULT;
      let winnerRatingId: string | null = null;
      let loserRatingId: string | null = null;

      for (const r of eloRatings) {
        const targetId = r.target?.id;
        if (targetId === winnerId) {
          winnerElo = r.score;
          winnerRatingId = r.id;
        }
        if (targetId === loserId) {
          loserElo = r.score;
          loserRatingId = r.id;
        }
      }

      const newElo = updateElo(winnerElo, loserElo);

      const txns = [];

      if (winnerRatingId) {
        txns.push(
          adminDb.tx.eloRatings[winnerRatingId].update({
            score: newElo.winner,
            comparisonsCount:
              (eloRatings.find((r) => r.id === winnerRatingId)
                ?.comparisonsCount ?? 0) + 1,
          }),
        );
      } else {
        const newId = id();
        txns.push(
          adminDb.tx.eloRatings[newId]
            .update({ score: newElo.winner, comparisonsCount: 1 })
            .link({ rater: user.id, target: winnerId }),
        );
      }

      if (loserRatingId) {
        txns.push(
          adminDb.tx.eloRatings[loserRatingId].update({
            score: newElo.loser,
            comparisonsCount:
              (eloRatings.find((r) => r.id === loserRatingId)
                ?.comparisonsCount ?? 0) + 1,
          }),
        );
      } else {
        const newId = id();
        txns.push(
          adminDb.tx.eloRatings[newId]
            .update({ score: newElo.loser, comparisonsCount: 1 })
            .link({ rater: user.id, target: loserId }),
        );
      }

      await adminDb.transact(txns);

      return json({ success: true, newElo });
    } catch (e) {
      console.error("Comparison submit error:", e);
      return json({ error: "Failed to submit comparison" }, 500);
    }
  }

  // --- Run Weekly Matching (admin endpoint) ---
  if (path === "/api/match/run" && req.method === "POST") {
    try {
      return await runWeeklyMatching();
    } catch (e) {
      console.error("Matching error:", e);
      return json({ error: "Matching failed" }, 500);
    }
  }

  // --- Get Current Match ---
  if (path === "/api/match/current" && req.method === "GET") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    try {
      // Find latest match cycle
      const { matchCycles } = await adminDb.query({
        matchCycles: {
          $: { where: { status: "complete" }, order: { createdAt: "desc" }, limit: 1 },
          matches: { user1: { profile: {} }, user2: { profile: {} } },
        },
      });

      if (!matchCycles.length) {
        return json({ match: null, reason: "No matching cycle completed yet" });
      }

      const cycle = matchCycles[0];
      const myMatch = cycle.matches?.find(
        (m) =>
          m.user1?.id === user.id || m.user2?.id === user.id,
      );

      if (!myMatch) {
        return json({
          match: null,
          reason:
            "No match found this week. Keep comparing to improve next week!",
        });
      }

      const matchedUser =
        myMatch.user1?.id === user.id ? myMatch.user2 : myMatch.user1;
      const matchedProfile = matchedUser?.profile;

      return json({
        match: {
          userId: matchedUser?.id,
          name: matchedProfile?.name,
          age: matchedProfile?.age,
          aiDescription: matchedProfile?.aiDescription,
          photoUrl: matchedProfile?.photoUrl,
          revealed: myMatch.revealed,
        },
        cycleWeek: cycle.weekStart,
      });
    } catch (e) {
      console.error("Get match error:", e);
      return json({ error: "Failed to get match" }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}

// --- Weekly Matching Logic ---
async function runWeeklyMatching(): Promise<Response> {
  const weekStart = getWeekStart();

  // Check if already run this week
  const { matchCycles: existing } = await adminDb.query({
    matchCycles: { $: { where: { weekStart } } },
  });
  if (existing.length > 0) {
    return json({ error: "Matching already run this week", weekStart });
  }

  // Create cycle
  const cycleId = id();
  await adminDb.transact([
    adminDb.tx.matchCycles[cycleId].update({
      weekStart,
      status: "matching",
      createdAt: Date.now(),
    }),
  ]);

  // Get all users with complete profiles
  const { profiles } = await adminDb.query({
    profiles: {
      $: { where: { onboardingComplete: true } },
      user: {},
    },
  });

  // Get all ELO ratings
  const { eloRatings } = await adminDb.query({
    eloRatings: { rater: {}, target: {} },
  });

  // Build user data
  const users: UserEloData[] = profiles
    .filter((p) => p.user)
    .map((p) => {
      const userId = p.user!.id;
      const ratings = new Map<string, number>();

      for (const r of eloRatings) {
        if (r.rater?.id === userId && r.target?.id) {
          ratings.set(r.target.id, r.score);
        }
      }

      return {
        userId,
        gender: p.gender,
        lookingFor: p.lookingFor,
        ratings,
      };
    });

  // Run matching
  const result = runMatching(users);

  // Save matches
  const txns = [];
  for (const [user1Id, user2Id] of result.matches) {
    const matchId = id();
    txns.push(
      adminDb.tx.matches[matchId]
        .update({ createdAt: Date.now(), revealed: false })
        .link({ cycle: cycleId, user1: user1Id, user2: user2Id }),
    );
  }

  // Update cycle status
  txns.push(
    adminDb.tx.matchCycles[cycleId].update({ status: "complete" }),
  );

  await adminDb.transact(txns);

  return json({
    success: true,
    weekStart,
    matchCount: result.matches.size,
    unmatchedCount: result.unmatched.length,
  });
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setUTCDate(diff));
  return monday.toISOString().split("T")[0];
}

// --- Server ---
const port = parseInt(Deno.env.get("PORT") ?? "8000");
console.log(`NOFOBO server running on port ${port}`);

Deno.serve({ port }, handler);
