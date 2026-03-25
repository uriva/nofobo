// NOFOBO Backend - Deno Server
// Handles profile creation, community-scoped pair selection, and ELO ranking

import { id } from "@instantdb/admin";
import adminDb from "./db.ts";
import {
  updateElo,
  selectNextPair,
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

// --- Attraction compatibility ---
// Returns true if user A can see user B in comparisons
function isAttractionCompatible(
  myGender: string,
  myAttractedTo: string,
  theirGender: string,
  theirAttractedTo: string,
): boolean {
  // Check: I'm attracted to their gender
  const iLikeThem =
    myAttractedTo === "both" ||
    (myAttractedTo === "men" && theirGender === "man") ||
    (myAttractedTo === "women" && theirGender === "woman");

  // Check: they're attracted to my gender
  const theyLikeMe =
    theirAttractedTo === "both" ||
    (theirAttractedTo === "men" && myGender === "man") ||
    (theirAttractedTo === "women" && myGender === "woman");

  return iLikeThem && theyLikeMe;
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

  // --- Get Next Comparison Pair ---
  if (path === "/api/compare/pair" && req.method === "GET") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    try {
      // Get user's profile
      const { profiles: myProfiles } = await adminDb.query({
        profiles: { $: { where: { "user.id": user.id } } },
      });
      const myProfile = myProfiles[0];
      if (!myProfile) return json({ error: "Profile not found" }, 404);

      const myCommunity = myProfile.communityCode;
      const myGender = myProfile.gender;
      const myAttractedTo = myProfile.attractedTo ?? "both";
      const myMatchStatuses: string[] = JSON.parse(
        myProfile.matchWithStatuses ?? "[]",
      );

      // Get optional filters from query params
      const minAge = url.searchParams.get("minAge");
      const maxAge = url.searchParams.get("maxAge");
      const filterTags = url.searchParams.get("tags"); // comma-separated

      // Get all profiles in same community
      const { profiles: candidates } = await adminDb.query({
        profiles: {
          $: {
            where: {
              communityCode: myCommunity,
              onboardingComplete: true,
            },
          },
          user: {},
        },
      });

      // Filter: not self, attraction compatible, relationship status match, age, tags
      const eligible = candidates.filter((p) => {
        if (p.user?.id === user.id) return false;

        // Attraction compatibility (mutual)
        if (
          !isAttractionCompatible(
            myGender,
            myAttractedTo,
            p.gender,
            p.attractedTo ?? "both",
          )
        )
          return false;

        // Relationship status filter: their status must be in my "match with" list
        if (myMatchStatuses.length > 0 && p.relationshipStatus) {
          if (!myMatchStatuses.includes(p.relationshipStatus)) return false;
        }

        // Age filter
        if (minAge && p.age < parseInt(minAge)) return false;
        if (maxAge && p.age > parseInt(maxAge)) return false;

        // Kink tag filter (if specified, at least one overlap required)
        if (filterTags) {
          const required = filterTags.split(",").map((t) => t.trim());
          const theirTags: string[] = JSON.parse(p.kinkTags ?? "[]");
          if (!required.some((r) => theirTags.includes(r))) return false;
        }

        return true;
      });

      if (eligible.length < 2) {
        return json({
          pair: null,
          reason: "Not enough compatible profiles yet. Check back later!",
        });
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

      // Select next pair using user IDs
      const candidateUserIds = eligible
        .map((p) => p.user?.id)
        .filter(Boolean) as string[];

      const pair = selectNextPair(userElo, comparedPairs, candidateUserIds);
      if (!pair) {
        return json({
          pair: null,
          reason: "You've compared all available profiles!",
        });
      }

      // Return full profile data for both candidates
      const pairProfiles = pair.map((userId) =>
        eligible.find((p) => p.user?.id === userId),
      );

      return json({
        pair: pairProfiles.map((p) => ({
          userId: p?.user?.id,
          profileId: p?.id,
          name: p?.name,
          age: p?.age,
          bio: p?.bio ?? p?.aiDescription ?? "",
          photoUrl: p?.photoUrl,
          relationshipStatus: p?.relationshipStatus,
          kinkTags: JSON.parse(p?.kinkTags ?? "[]"),
        })),
        totalComparisons: comparisons.length,
        eligibleCount: eligible.length,
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

  // --- Demote (push someone to bottom of rankings) ---
  if (path === "/api/elo/demote" && req.method === "POST") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { targetUserId } = body;
    if (!targetUserId) {
      return json({ error: "targetUserId required" }, 400);
    }

    try {
      const DEMOTED_SCORE = 0;

      const { eloRatings } = await adminDb.query({
        eloRatings: {
          $: { where: { "rater.id": user.id, "target.id": targetUserId } },
        },
      });

      if (eloRatings.length > 0) {
        await adminDb.transact([
          adminDb.tx.eloRatings[eloRatings[0].id].update({
            score: DEMOTED_SCORE,
          }),
        ]);
      } else {
        const newId = id();
        await adminDb.transact([
          adminDb.tx.eloRatings[newId]
            .update({ score: DEMOTED_SCORE, comparisonsCount: 0 })
            .link({ rater: user.id, target: targetUserId }),
        ]);
      }

      return json({ success: true, demoted: targetUserId });
    } catch (e) {
      console.error("Demote error:", e);
      return json({ error: "Failed to demote" }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}

// --- Server ---
const port = parseInt(Deno.env.get("PORT") ?? "8000");
console.log(`NOFOBO server running on port ${port}`);

Deno.serve({ port }, handler);
