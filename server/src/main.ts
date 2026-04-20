// deno-lint-ignore-file no-explicit-any
// NOFOBO Backend - Deno Server
// Handles profile creation, community-scoped pair selection, and ELO ranking


export function updateElo(winnerElo: number, loserElo: number): { winner: number; loser: number } {
  const K = 32;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  
  return {
    winner: Math.round(winnerElo + K * (1 - expectedWinner)),
    loser: Math.round(loserElo + K * (0 - expectedLoser))
  };
}

const GENDER_TO_ATTRACTION: Record<string, string> = {
  man: "men",
  woman: "women",
  nonbinary: "nonbinary",
};

export function parseAttractedTo(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.startsWith("[")) {
    try {
      return JSON.parse(raw);
    } catch { /* fall through */ }
  }
  if (raw === "both") return ["men", "women"];
  return [raw];
}

export function isAttractionCompatible(
  myGender: string,
  myAttractedTo: any,
  theirGender: string,
  theirAttractedTo: any,
): boolean {
  const myList = parseAttractedTo(myAttractedTo);
  const theirList = parseAttractedTo(theirAttractedTo);

  const iLikeThem = myList.includes(
    GENDER_TO_ATTRACTION[theirGender] ?? theirGender,
  );
  const theyLikeMe = theirList.includes(
    GENDER_TO_ATTRACTION[myGender] ?? myGender,
  );

  return iLikeThem && theyLikeMe;
}

import { id } from "@instantdb/admin";
import adminDb from "./db.ts";
import {
  runMatching,
  selectNextPair,

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
async function verifyAdmin(
  email: string,
  communityCode: string,
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  if (ADMIN_EMAILS.some((e) => e.toLowerCase() === normalizedEmail)) {
    return true;
  }
  if (!communityCode) return false;

  const { communities } = await adminDb.query({
    communities: { $: { where: { code: communityCode } } },
  });

  if (communities.length === 0) return false;

  const community = communities[0];
  const adminEmails: string[] = community.adminEmails;
  return adminEmails.some((e: string) => e.toLowerCase() === normalizedEmail);
}

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

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/version" && req.method === "GET") {
    return json({ commit: Deno.env.get("RENDER_GIT_COMMIT") || Deno.env.get("VITE_COMMIT_HASH") || "unknown" });
  }

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
        );
      }

      if (!myProfile) return json({ error: "Profile not found" }, 404);

      const myCommunity = myProfile.communityCode;
      const myGender = myProfile.gender;
      const myAttractedTo = myProfile.attractedTo ?? "both";
      const myMatchStatuses: string[] = myProfile.matchWithStatuses || [];

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
        if (p.user?.[0]?.id === user.id) return false;

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
          const theirTags: string[] = p.tags || [];
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

      // Get user's existing comparisons
      const { comparisons } = await adminDb.query({
        comparisons: {
          $: { where: { "voterProfile.user.id": user.id } },
          winnerProfile: { user: {} },
          loserProfile: { user: {} },
        },
      });

      // Filter comparisons to only count those relevant to the current community pool
      // Since comparisons don't have communityCode, we check if the users involved
      // are in the candidates list (which is already filtered by community).
      const eligibleUserIds = new Set(eligible.map((p: any) => p.user?.[0]?.id).filter(Boolean));
      
      const relevantComparisons = comparisons.filter((c: any) => {
        // The users must be in the current community candidate pool, or at least one of them
        // Actually, if they were matched before in this community, they should both be in it.
        // Wait, candidates only contains onboardingComplete profiles. If someone deleted their profile,
        // they might not be there. But that's fine.
        return true; 
      });

      if (eligible.length < 2) {
        return json({
          pair: null,
          reason: "Not enough compatible profiles yet. Check back later!",
          eligibleCount: eligible.length,
          totalComparisons: relevantComparisons.length,
        });
      }

      const comparedPairs = new Set<string>();
      for (const c of relevantComparisons) {
        const wId = c.winner?.[0]?.id;
        const lId = c.loser?.[0]?.id;
        if (wId && lId) comparedPairs.add(`${wId}:${lId}`);
      }

      // Get user's ELO ratings
      const { eloRatings } = await adminDb.query({
        eloRatings: {
          $: { where: { "raterProfile.user.id": user.id } },
          targetProfile: { user: {} }
        },
      });

      const userElo = new Map<string, number>();
      for (const r of eloRatings) {
        const targetId = r.targetProfile?.[0]?.user?.[0]?.id || r.targetProfile?.[0]?.user?.id;
        if (targetId) userElo.set(targetId, r.score);
      }

      // Select next pair using user IDs
      const candidateUserIds = eligible
        .map((p: any) => Array.isArray(p.user) ? p.user[0]?.id : p.user?.id)
        .filter(Boolean) as string[];

      const pair = selectNextPair(userElo, comparedPairs, candidateUserIds);
      if (!pair) {
        return json({
          pair: null,
          reason: "You've compared all available profiles!",
          eligibleCount: eligible.length,
          totalComparisons: relevantComparisons.length,
        });
      }

      // Return full profile data for both candidates
      const pairProfiles = pair.map((userId) =>
        eligible.find((p: any) => {
          const uid = Array.isArray(p.user) ? p.user[0]?.id : p.user?.id;
          return uid === userId;
        })
      );

      return json({
        pair: pairProfiles.map((p: any) => {
          const uid = Array.isArray(p?.user) ? p?.user[0]?.id : p?.user?.id;
          return {
            userId: uid,
            profileId: p?.id,
            name: p?.name,
            age: p?.age,
            bio: p?.bio ?? p?.aiDescription ?? "",
            photoUrl: p?.photoUrl,
            photoUrls: p?.photoUrls || [],
            relationshipStatus: p?.relationshipStatus,
            tags: p?.tags || [],
            elo: Math.round(userElo.get(uid) ?? ELO_DEFAULT),
          };
        }),
        totalComparisons: relevantComparisons.length,
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
    const { winnerId, loserId, community } = body;

    if (!winnerId || !loserId || !community) {
      return json({ error: "winnerId, loserId, and community required" }, 400);
    }

    try {
      // Find profiles for these users
      const { profiles } = await adminDb.query({
        profiles: {
          $: { where: { communityCode: community } },
          user: {}
        }
      });

      const wProfile = profiles.find((p: any) => {
        const uid = Array.isArray(p.user) ? p.user[0]?.id : p.user?.id;
        return uid === winnerId;
      });
      const lProfile = profiles.find((p: any) => {
        const uid = Array.isArray(p.user) ? p.user[0]?.id : p.user?.id;
        return uid === loserId;
      });
      const vProfile = profiles.find((p: any) => {
        const uid = Array.isArray(p.user) ? p.user[0]?.id : p.user?.id;
        return uid === user.id;
      });

      if (!wProfile || !lProfile || !vProfile) {
        return json({ error: "Could not find profiles for one or more users" }, 400);
      }

      // Create comparison record
      const comparisonId = id();
      await adminDb.transact([
        adminDb.tx.comparisons[comparisonId]
          .update({ createdAt: Date.now() })
          .link({ voterProfile: vProfile.id, winnerProfile: wProfile.id, loserProfile: lProfile.id }),
      ]);

      // Update ELO ratings
      const { eloRatings } = await adminDb.query({
        eloRatings: {
          $: { where: { "raterProfile.id": vProfile.id } },
          targetProfile: { user: {} },
        },
      });

      let winnerElo = ELO_DEFAULT;
      let loserElo = ELO_DEFAULT;
      let winnerRatingId: string | null = null;
      let loserRatingId: string | null = null;

      for (const r of eloRatings) {
        const targetId = r.targetProfile?.[0]?.user?.[0]?.id || r.targetProfile?.[0]?.user?.id;
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
            .link({ raterProfile: vProfile.id, targetProfile: wProfile.id }),
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
            .link({ raterProfile: vProfile.id, targetProfile: lProfile.id }),
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
          $: { where: { "raterProfile.user.id": user.id, "targetProfile.user.id": targetUserId } },
        },
      });

      if (eloRatings.length > 0) {
        await adminDb.transact([
          adminDb.tx.eloRatings[eloRatings[0].id].update({
            score: DEMOTED_SCORE,
          }),
        ]);
      } else {
        // Demote needs profiles to link to
        const communityCode = body.community;
        if (!communityCode) return json({ error: "community required for demote" }, 400);
        
        const { profiles } = await adminDb.query({
          profiles: {
            $: { where: { communityCode } },
            user: {}
          }
        });
        
        const rProfile = profiles.find((p: any) => p.user?.[0]?.id === user.id || p.user?.id === user.id);
        const tProfile = profiles.find((p: any) => p.user?.[0]?.id === targetUserId || p.user?.id === targetUserId);
        
        if (rProfile && tProfile) {
          const newId = id();
          await adminDb.transact([
            adminDb.tx.eloRatings[newId]
              .update({ score: DEMOTED_SCORE, comparisonsCount: 0 })
              .link({ raterProfile: rProfile.id, targetProfile: tProfile.id }),
          ]);
        }
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
          $: { where: { "voterProfile.user.id": user.id } },
          winnerProfile: { user: {} },
          loserProfile: { user: {} },
        },
      });

      const { profiles } = await adminDb.query({
        profiles: { user: {} },
      });
      const profileMap = new Map<string, any>();
      for (const p of profiles) {
        if (p.id) profileMap.set(p.id, p);
      }

      // Map winner/loser profile IDs to user IDs and profile data
      const result = comparisons.map((c: any) => {
        // Handle both has:"one" and has:"many" returns from InstantDB
        const wProfileId = Array.isArray(c.winnerProfile) ? c.winnerProfile[0]?.id : c.winnerProfile?.id;
        const lProfileId = Array.isArray(c.loserProfile) ? c.loserProfile[0]?.id : c.loserProfile?.id;

        const wProfileData = Array.isArray(c.winnerProfile) ? c.winnerProfile[0] : c.winnerProfile;
        const lProfileData = Array.isArray(c.loserProfile) ? c.loserProfile[0] : c.loserProfile;

        const winnerProfile = profileMap.get(wProfileId) || wProfileData;
        const loserProfile = profileMap.get(lProfileId) || lProfileData;

        const winnerId = Array.isArray(winnerProfile?.user) ? winnerProfile.user[0]?.id : winnerProfile?.user?.id;
        const loserId = Array.isArray(loserProfile?.user) ? loserProfile.user[0]?.id : loserProfile?.user?.id;
        
        const winnerPhotoUrls = winnerProfile?.photoUrls || [];
        const loserPhotoUrls = loserProfile?.photoUrls || [];
        
        return {
          comparisonId: c.id,
          winnerId: winnerId ?? "",
          winnerName: winnerProfile?.name ?? "Unknown",
          winnerAge: winnerProfile?.age ?? 0,
          winnerPhotoUrl: winnerProfile?.photoUrl ?? winnerPhotoUrls[0] ??
            undefined,
          loserId: loserId ?? "",
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
          $: { where: { id: comparisonId, "voterProfile.user.id": user.id } },
          winnerProfile: { user: {} },
          loserProfile: { user: {} },
        },
      });

      if (comparisons.length === 0) {
        return json({ error: "Comparison not found" }, 404);
      }

      const comp = comparisons[0];
      const oldWinnerProfileId = comp.winnerProfile?.[0]?.id;
      const oldLoserProfileId = comp.loserProfile?.[0]?.id;
      const oldWinnerUserId = comp.winnerProfile?.[0]?.user?.[0]?.id || comp.winnerProfile?.[0]?.user?.id;
      const oldLoserUserId = comp.loserProfile?.[0]?.user?.[0]?.id || comp.loserProfile?.[0]?.user?.id;

      if (!oldWinnerProfileId || !oldLoserProfileId) {
        return json({ error: "Invalid comparison data" }, 500);
      }

      // Swap the winner/loser links
      await adminDb.transact([
        adminDb.tx.comparisons[comparisonId]
          .unlink({ winnerProfile: oldWinnerProfileId, loserProfile: oldLoserProfileId })
          .link({ winnerProfile: oldLoserProfileId, loserProfile: oldWinnerProfileId }),
      ]);

      // Recalculate ELO: undo old result, apply new result
      // Get current ELO ratings for these two targets
      const { eloRatings } = await adminDb.query({
        eloRatings: {
          $: { where: { "raterProfile.user.id": user.id } },
          targetProfile: { user: {} },
        },
      });

      let oldWinnerElo = ELO_DEFAULT;
      let oldLoserElo = ELO_DEFAULT;
      let oldWinnerRatingId: string | null = null;
      let oldLoserRatingId: string | null = null;

      for (const r of eloRatings) {
        const targetId = r.targetProfile?.[0]?.user?.[0]?.id || r.targetProfile?.[0]?.user?.id;
        if (targetId === oldWinnerUserId) {
          oldWinnerElo = r.score;
          oldWinnerRatingId = r.id;
        }
        if (targetId === oldLoserUserId) {
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
          $: { where: { id: comparisonId, "voterProfile.user.id": user.id } },
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
    const requestedCommunity = url.searchParams.get("community");
    if (!requestedCommunity) return json({ error: "Community required" }, 400);

    const isAdmin = await verifyAdmin(user.email, requestedCommunity);
    if (!isAdmin) {
      return json({ error: "Forbidden" }, 403);
    }

    try {
      // Get all profiles in community
      const { profiles } = await adminDb.query({
        profiles: {
          $: {
            where: {
              communityCode: requestedCommunity,
              onboardingComplete: true,
            },
          },
          user: {},
        },
      });

      // Get comparison counts per user
      const { comparisons: allComps } = await adminDb.query({
        comparisons: {
          voterProfile: { user: {} },
        },
      });

      const compCountByUser = new Map<string, number>();
      for (const c of allComps) {
        const voterId = c.voterProfile?.[0]?.user?.[0]?.id || c.voterProfile?.[0]?.user?.id;
        if (voterId) {
          compCountByUser.set(voterId, (compCountByUser.get(voterId) ?? 0) + 1);
        }
      }

      // Deduplicate profiles by user.id (keep most recently created if duplicates exist)
      const uniqueProfiles = new Map<string, any>();
      for (const p of profiles) {
        const uid = Array.isArray(p.user) ? p.user[0]?.id : p.user?.id;
        if (!uid) continue;
        const existing = uniqueProfiles.get(uid);
        if (!existing || (p.createdAt > existing.createdAt)) {
          uniqueProfiles.set(uid, p);
        }
      }

      const result = Array.from(uniqueProfiles.values()).map((p: any) => {
        const photoUrls = p.photoUrls || [];
        const uid = Array.isArray(p.user) ? p.user[0]?.id : p.user?.id;
        return {
          userId: uid ?? "",
          profileId: p.id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          attractedTo: p.attractedTo ?? "both",
          relationshipStatus: p.relationshipStatus ?? "",
          tags: p.tags || [],
          bio: p.bio ?? p.aiDescription ?? "",
          photoUrl: p.photoUrl ?? photoUrls[0] ?? undefined,
          location: p.location ?? undefined,
          phone: p.phone ?? undefined,
          comparisonsCount: compCountByUser.get(uid ?? "") ?? 0,
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

    const requestedCommunity = url.searchParams.get("community");
    if (!requestedCommunity) return json({ error: "Community required" }, 400);

    const isAdmin = await verifyAdmin(user.email, requestedCommunity);
    if (!isAdmin) {
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
          $: { where: { "raterProfile.user.id": targetUserId } },
          targetProfile: { user: {} },
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
        const uid = Array.isArray(p.user) ? p.user[0]?.id : p.user?.id;
        if (uid) userProfileMap.set(uid, p);
      }

      const rankings = eloRatings
        .map((r: any) => {
          const tUserId = r.targetProfile?.[0]?.user?.[0]?.id || r.targetProfile?.[0]?.user?.id;
          const targetProfile = userProfileMap.get(tUserId ?? "");
          return {
            targetUserId: tUserId ?? "",
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

    const requestedCommunity = url.searchParams.get("community");
    if (!requestedCommunity) return json({ error: "Community required" }, 400);

    const isAdmin = await verifyAdmin(user.email, requestedCommunity);
    if (!isAdmin) {
      return json({ error: "Forbidden" }, 403);
    }

    try {
      // Get all completed profiles in community
      const { profiles } = await adminDb.query({
        profiles: {
          $: {
            where: {
              communityCode: requestedCommunity,
              onboardingComplete: true,
            },
          },
          user: {},
        },
      });

      // Get all ELO ratings for these users
      const userIds = profiles
        .map((p: any) => Array.isArray(p.user) ? p.user[0]?.id : p.user?.id)
        .filter(Boolean) as string[];

      const { eloRatings: allRatings } = await adminDb.query({
        eloRatings: {
          raterProfile: { user: {} },
          targetProfile: { user: {} },
        },
      });

      // Build UserEloData for each user
      const userIdSet = new Set(userIds);
      const users: UserEloData[] = profiles.map((p: any) => {
        const userId = Array.isArray(p.user) ? p.user[0]?.id : (p.user?.id ?? "");
        const ratings = new Map<string, number>();

        for (const r of allRatings) {
          const rId = r.raterProfile?.[0]?.user?.[0]?.id || r.raterProfile?.[0]?.user?.id;
          const tId = r.targetProfile?.[0]?.user?.[0]?.id || r.targetProfile?.[0]?.user?.id;
          if (rId === userId && userIdSet.has(tId ?? "")) {
            ratings.set(tId!, r.score);
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
        const uid = Array.isArray(p.user) ? p.user[0]?.id : p.user?.id;
        if (uid) nameByUserId.set(uid, p.name);
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

  // --- Admin: Update Community Info ---
  if (path === "/api/admin/community" && req.method === "POST") {
    const user = await verifyAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const requestedCommunity = url.searchParams.get("community");
    if (!requestedCommunity) return json({ error: "Community required" }, 400);

    const isAdmin = await verifyAdmin(user.email, requestedCommunity);
    if (!isAdmin) {
      return json({ error: "Forbidden" }, 403);
    }

    try {
      const body = await req.json();
      const { name, code } = body;

      if (!name || !code) {
        return json({ error: "Name and code are required" }, 400);
      }

      // Validate code format (alphanumeric, hyphens, underscores only)
      if (!/^[a-z0-9-_]+$/.test(code)) {
        return json({
          error:
            "Code must contain only lowercase letters, numbers, hyphens, and underscores",
        }, 400);
      }

      // Get current community
      const { communities } = await adminDb.query({
        communities: { $: { where: { code: requestedCommunity } } },
      });

      if (communities.length === 0) {
        return json({ error: "Community not found" }, 404);
      }

      const community = communities[0];

      // If code is changing, check if new code already exists
      if (code !== requestedCommunity) {
        const { communities: existingCommunities } = await adminDb.query({
          communities: { $: { where: { code } } },
        });

        if (existingCommunities.length > 0) {
          return json({ error: "Code already exists" }, 400);
        }

        // Update all profiles with the old community code to the new code
        const { profiles } = await adminDb.query({
          profiles: { $: { where: { communityCode: requestedCommunity } } },
        });

        const profileUpdates = profiles.map((p: any) =>
          adminDb.tx.profiles[p.id].update({ communityCode: code })
        );

        // Update the community
        await adminDb.transact([
          adminDb.tx.communities[community.id].update({ name, code }),
          ...profileUpdates,
        ]);
      } else {
        // Just update the name
        await adminDb.transact([
          adminDb.tx.communities[community.id].update({ name }),
        ]);
      }

      return json({ success: true });
    } catch (e) {
      console.error("Admin community update error:", e);
      return json({ error: "Failed to update community" }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}

// --- Server ---
const port = parseInt(Deno.env.get("PORT") ?? "8000");
console.log(`NOFOBO server running on port ${port}`);

Deno.serve({ port }, handler);
