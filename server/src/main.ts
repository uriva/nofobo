// deno-lint-ignore-file no-explicit-any
// NOFOBO Backend - Deno Server
// Handles profile creation, community-scoped pair selection, and ELO ranking

import { id } from "@instantdb/admin";
import adminDb from "./db.ts";
import {
  runMatching,
  selectNextPair,
  updateElo,
  type UserEloData,
} from "./galeShapley.ts";
import { ELO_DEFAULT } from "../../constants.ts";

// Admin email whitelist
const ADMIN_EMAILS = [
  "uri.valevski@gmail.com",
  "BurningMan@alumni.stanford.edu",
];

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
  const iLikeThem = myAttractedTo === "both" ||
    (myAttractedTo === "men" && theirGender === "man") ||
    (myAttractedTo === "women" && theirGender === "woman");

  // Check: they're attracted to my gender
  const theyLikeMe = theirAttractedTo === "both" ||
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
      const requestedCommunity = url.searchParams.get("community");
      let myProfile = myProfiles[0];
      if (requestedCommunity) {
        myProfile = myProfiles.find((p: any) =>
          p.communityCode === requestedCommunity
        ) ?? myProfiles[0];
      }

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
      const filterStatuses = url.searchParams.get("statuses"); // comma-separated

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
      const eligible = candidates.filter((p: any) => {
        if (p.user?.id === user.id) return false;

        // Attraction compatibility (mutual)
        if (
          !isAttractionCompatible(
            myGender,
            myAttractedTo,
            p.gender,
            p.attractedTo ?? "both",
          )
        ) {
          return false;
        }

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
          if (!required.some((r: any) => theirTags.includes(r))) return false;
        }

        // Relationship status filter (from query params)
        if (filterStatuses) {
          const allowed = filterStatuses.split(",").map((s) => s.trim());
          if (p.relationshipStatus && !allowed.includes(p.relationshipStatus)) {
            return false;
          }
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
        .map((p: any) => p.user?.id)
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
        eligible.find((p: any) => p.user?.id === userId)
      );

      return json({
        pair: pairProfiles.map((p: any) => ({
          userId: p?.user?.id,
          profileId: p?.id,
          name: p?.name,
          age: p?.age,
          bio: p?.bio ?? p?.aiDescription ?? "",
          photoUrl: p?.photoUrl,
          photoUrls: JSON.parse(p?.photoUrls ?? "[]"),
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
            comparisonsCount: (eloRatings.find((r: any) =>
              r.id === winnerRatingId
            )
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
            comparisonsCount: (eloRatings.find((r: any) =>
              r.id === loserRatingId
            )
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

  // --- Get My Comparisons (for My Decisions page) ---
  if (path === "/api/my/comparisons" && req.method === "GET") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    try {
      const { comparisons } = await adminDb.query({
        comparisons: {
          $: { where: { "voter.id": user.id } },
          winner: { profile: {} } as any,
          loser: { profile: {} } as any,
        },
      });

      // Map winner/loser profile IDs to user IDs and profile data
      const result = comparisons.map((c: any) => {
        const winner = c.winner;
        const loser = c.loser;
        const winnerProfile = winner?.profile;
        const loserProfile = loser?.profile;
        const winnerPhotoUrls = JSON.parse(winnerProfile?.photoUrls ?? "[]");
        const loserPhotoUrls = JSON.parse(loserProfile?.photoUrls ?? "[]");
        return {
          comparisonId: c.id,
          winnerId: winner?.id ?? "",
          winnerName: winnerProfile?.name ?? "Unknown",
          winnerAge: winnerProfile?.age ?? 0,
          winnerPhotoUrl: winnerProfile?.photoUrl ?? winnerPhotoUrls[0] ??
            undefined,
          loserId: loser?.id ?? "",
          loserName: loserProfile?.name ?? "Unknown",
          loserAge: loserProfile?.age ?? 0,
          loserPhotoUrl: loserProfile?.photoUrl ?? loserPhotoUrls[0] ??
            undefined,
          communityCode: winnerProfile?.communityCode ?? "",
          createdAt: c.createdAt ?? 0,
        };
      });

      // Sort newest first
      result.sort((a: any, b: any) => b.createdAt - a.createdAt);

      return json({ comparisons: result });
    } catch (e) {
      console.error("My comparisons error:", e);
      return json({ error: "Failed to load comparisons" }, 500);
    }
  }

  // --- Flip a Comparison (swap winner/loser) ---
  if (path === "/api/compare/flip" && req.method === "POST") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { comparisonId } = body;
    if (!comparisonId) {
      return json({ error: "comparisonId required" }, 400);
    }

    try {
      // Get the comparison and verify ownership
      const { comparisons } = await adminDb.query({
        comparisons: {
          $: { where: { id: comparisonId, "voter.id": user.id } },
          winner: {},
          loser: {},
        },
      });

      if (comparisons.length === 0) {
        return json({ error: "Comparison not found" }, 404);
      }

      const comp = comparisons[0];
      const oldWinnerId = comp.winner?.id;
      const oldLoserId = comp.loser?.id;

      if (!oldWinnerId || !oldLoserId) {
        return json({ error: "Invalid comparison data" }, 500);
      }

      // Swap the winner/loser links
      await adminDb.transact([
        adminDb.tx.comparisons[comparisonId]
          .unlink({ winner: oldWinnerId, loser: oldLoserId })
          .link({ winner: oldLoserId, loser: oldWinnerId }),
      ]);

      // Recalculate ELO: undo old result, apply new result
      // Get current ELO ratings for these two targets
      const { eloRatings } = await adminDb.query({
        eloRatings: {
          $: { where: { "rater.id": user.id } },
          target: {},
        },
      });

      let oldWinnerElo = ELO_DEFAULT;
      let oldLoserElo = ELO_DEFAULT;
      let oldWinnerRatingId: string | null = null;
      let oldLoserRatingId: string | null = null;

      for (const r of eloRatings) {
        const targetId = r.target?.id;
        if (targetId === oldWinnerId) {
          oldWinnerElo = r.score;
          oldWinnerRatingId = r.id;
        }
        if (targetId === oldLoserId) {
          oldLoserElo = r.score;
          oldLoserRatingId = r.id;
        }
      }

      // Reverse the original ELO change, then apply new one
      // Step 1: Undo — old winner loses, old loser wins
      const undo = updateElo(oldLoserElo, oldWinnerElo);
      // Step 2: Apply flip — old loser is new winner, old winner is new loser
      const redo = updateElo(undo.winner, undo.loser);

      const txns = [];
      if (oldWinnerRatingId) {
        txns.push(
          adminDb.tx.eloRatings[oldWinnerRatingId].update({
            score: redo.loser,
          }),
        );
      }
      if (oldLoserRatingId) {
        txns.push(
          adminDb.tx.eloRatings[oldLoserRatingId].update({
            score: redo.winner,
          }),
        );
      }

      if (txns.length > 0) await adminDb.transact(txns);

      return json({ success: true });
    } catch (e) {
      console.error("Flip comparison error:", e);
      return json({ error: "Failed to flip comparison" }, 500);
    }
  }

  // --- Delete a Comparison ---
  if (path === "/api/compare/delete" && req.method === "POST") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { comparisonId } = body;
    if (!comparisonId) {
      return json({ error: "comparisonId required" }, 400);
    }

    try {
      // Verify ownership
      const { comparisons } = await adminDb.query({
        comparisons: {
          $: { where: { id: comparisonId, "voter.id": user.id } },
        },
      });

      if (comparisons.length === 0) {
        return json({ error: "Comparison not found" }, 404);
      }

      // Delete the comparison
      await adminDb.transact([
        adminDb.tx.comparisons[comparisonId].delete(),
      ]);

      // Note: We don't reverse the ELO changes on delete — the ELO ratings
      // reflect all historical decisions. A full ELO recalc could be added
      // later if needed.

      return json({ success: true });
    } catch (e) {
      console.error("Delete comparison error:", e);
      return json({ error: "Failed to delete comparison" }, 500);
    }
  }

  // --- Admin: Get All Profiles in Community ---
  if (path === "/api/admin/profiles" && req.method === "GET") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);
    if (!ADMIN_EMAILS.includes(user.email)) {
      return json({ error: "Forbidden" }, 403);
    }

    try {
      // Get admin's profile to find their community
      const { profiles: myProfiles } = await adminDb.query({
        profiles: { $: { where: { "user.id": user.id } } },
      });
      const myCommunity = myProfiles[0]?.communityCode;
      if (!myCommunity) {
        return json({ error: "Admin has no community" }, 400);
      }

      // Get all profiles in community
      const { profiles } = await adminDb.query({
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

      // Get comparison counts per user
      const { comparisons: allComps } = await adminDb.query({
        comparisons: {
          voter: {},
        },
      });

      const compCountByUser = new Map<string, number>();
      for (const c of allComps) {
        const voterId = c.voter?.id;
        if (voterId) {
          compCountByUser.set(voterId, (compCountByUser.get(voterId) ?? 0) + 1);
        }
      }

      const result = profiles.map((p: any) => {
        const photoUrls = JSON.parse(p.photoUrls ?? "[]");
        return {
          userId: p.user?.id ?? "",
          profileId: p.id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          attractedTo: p.attractedTo ?? "both",
          relationshipStatus: p.relationshipStatus ?? "",
          kinkTags: JSON.parse(p.kinkTags ?? "[]"),
          bio: p.bio ?? p.aiDescription ?? "",
          photoUrl: p.photoUrl ?? photoUrls[0] ?? undefined,
          location: p.location ?? undefined,
          comparisonsCount: compCountByUser.get(p.user?.id ?? "") ?? 0,
        };
      });

      return json({ profiles: result });
    } catch (e) {
      console.error("Admin profiles error:", e);
      return json({ error: "Failed to load profiles" }, 500);
    }
  }

  // --- Admin: Get User Rankings ---
  if (path.startsWith("/api/admin/rankings/") && req.method === "GET") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);
    if (!ADMIN_EMAILS.includes(user.email)) {
      return json({ error: "Forbidden" }, 403);
    }

    const targetUserId = path.replace("/api/admin/rankings/", "");
    if (!targetUserId) {
      return json({ error: "userId required" }, 400);
    }

    try {
      // Get the target user's ELO ratings
      const { eloRatings } = await adminDb.query({
        eloRatings: {
          $: { where: { "rater.id": targetUserId } },
          target: {},
        },
      });

      // Get all profiles to map user IDs to names
      const { profiles } = await adminDb.query({
        profiles: {
          user: {},
        },
      });

      const userProfileMap = new Map<string, any>();
      for (const p of profiles) {
        const uid = p.user?.[0]?.id;
        if (uid) userProfileMap.set(uid, p);
      }

      const rankings = eloRatings
        .map((r: any) => {
          const tUserId = r.target?.[0]?.id ?? "";
          const targetProfile = userProfileMap.get(tUserId);
          return {
            targetUserId: tUserId,
            targetName: targetProfile?.name ?? "Unknown",
            score: r.score,
            comparisonsCount: r.comparisonsCount ?? 0,
          };
        })
        .sort((a: any, b: any) => b.score - a.score);

      return json({ rankings });
    } catch (e) {
      console.error("Admin rankings error:", e);
      return json({ error: "Failed to load rankings" }, 500);
    }
  }

  // --- Admin: Run Matching ---
  if (path === "/api/admin/match" && req.method === "POST") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);
    if (!ADMIN_EMAILS.includes(user.email)) {
      return json({ error: "Forbidden" }, 403);
    }

    try {
      // Get admin's community
      const { profiles: myProfiles } = await adminDb.query({
        profiles: { $: { where: { "user.id": user.id } } },
      });
      const myCommunity = myProfiles[0]?.communityCode;
      if (!myCommunity) {
        return json({ error: "Admin has no community" }, 400);
      }

      // Get all completed profiles in community
      const { profiles } = await adminDb.query({
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

      // Get all ELO ratings for these users
      const userIds = profiles
        .map((p: any) => p.user?.id)
        .filter(Boolean) as string[];

      const { eloRatings: allRatings } = await adminDb.query({
        eloRatings: {
          rater: {},
          target: {},
        },
      });

      // Build UserEloData for each user
      const userIdSet = new Set(userIds);
      const users: UserEloData[] = profiles.map((p: any) => {
        const userId = p.user?.id ?? "";
        const ratings = new Map<string, number>();

        for (const r of allRatings) {
          if (r.rater?.id === userId && userIdSet.has(r.target?.id ?? "")) {
            ratings.set(r.target!.id, r.score);
          }
        }

        return {
          userId,
          gender: p.gender,
          attractedTo: p.attractedTo ?? "both",
          ratings,
        };
      });

      // Run Gale-Shapley matching
      const result = runMatching(users);

      // Build profile name lookup
      const nameByUserId = new Map<string, string>();
      for (const p of profiles) {
        if (p.user?.id) nameByUserId.set(p.user.id, p.name);
      }

      // Format matches
      const matches = [...result.matches.entries()].map(
        ([proposer, receiver]) => ({
          user1: {
            userId: proposer,
            name: nameByUserId.get(proposer) ?? "Unknown",
          },
          user2: {
            userId: receiver,
            name: nameByUserId.get(receiver) ?? "Unknown",
          },
        }),
      );

      const unmatchedNames = result.unmatched.map(
        (uid) => nameByUserId.get(uid) ?? "Unknown",
      );

      return json({ matches, unmatchedNames });
    } catch (e) {
      console.error("Admin matching error:", e);
      return json({ error: "Failed to run matching" }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}

// --- Server ---
const port = parseInt(Deno.env.get("PORT") ?? "8000");
console.log(`NOFOBO server running on port ${port}`);

Deno.serve({ port }, handler);
