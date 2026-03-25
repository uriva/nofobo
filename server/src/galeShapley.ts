// Gale-Shapley matching algorithm with ELO-based partial ranking support
//
// The key insight: users only do partial pairwise comparisons (not all n*log(n)).
// We use ELO ratings from those comparisons to build approximate preference
// rankings, then run standard Gale-Shapley on the inferred rankings.

import { ELO_K_FACTOR, ELO_DEFAULT } from "../../constants.ts";

// --- ELO Rating System ---

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function updateElo(
  winnerRating: number,
  loserRating: number,
  k = ELO_K_FACTOR,
): { winner: number; loser: number } {
  const expectedWin = expectedScore(winnerRating, loserRating);
  const expectedLose = expectedScore(loserRating, winnerRating);
  return {
    winner: Math.round(winnerRating + k * (1 - expectedWin)),
    loser: Math.round(loserRating + k * (0 - expectedLose)),
  };
}

// --- Preference Ranking from ELO ---

// Given a user's ELO ratings for all candidates, produce a ranked preference list.
// Higher ELO = more preferred. Unrated candidates are EXCLUDED — you must have
// compared someone for them to appear in your preference list.
export function eloToPreferenceList(
  eloRatings: Map<string, number>,
  allCandidateIds: string[],
): string[] {
  return allCandidateIds
    .filter((id) => eloRatings.has(id))
    .map((id) => ({ id, score: eloRatings.get(id)! }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.id);
}

// --- Pair Selection for Comparisons ---
// Smart pair selection to maximize information gain with fewer comparisons.
//
// Strategy: mix of:
// 1. "Close matchups" - pair candidates with similar ELO (most informative)
// 2. "Exploration" - pair candidates the user hasn't compared yet
// 3. "Validation" - re-test some existing rankings

export function selectNextPair(
  userEloRatings: Map<string, number>,
  comparedPairs: Set<string>, // "idA:idB" strings
  candidateIds: string[],
): [string, string] | null {
  if (candidateIds.length < 2) return null;

  // Build list of uncompared pairs
  const uncompared: [string, string][] = [];
  for (let i = 0; i < candidateIds.length; i++) {
    for (let j = i + 1; j < candidateIds.length; j++) {
      const a = candidateIds[i];
      const b = candidateIds[j];
      const key1 = `${a}:${b}`;
      const key2 = `${b}:${a}`;
      if (!comparedPairs.has(key1) && !comparedPairs.has(key2)) {
        uncompared.push([a, b]);
      }
    }
  }

  if (uncompared.length === 0) return null;

  // Score each pair by how close their ELOs are (closer = more informative)
  const scored = uncompared.map(([a, b]) => {
    const eloA = userEloRatings.get(a) ?? ELO_DEFAULT;
    const eloB = userEloRatings.get(b) ?? ELO_DEFAULT;
    const diff = Math.abs(eloA - eloB);
    // Lower diff = more informative, but add randomness for exploration
    const noise = Math.random() * 200;
    return { pair: [a, b] as [string, string], score: diff + noise };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0].pair;
}

// --- Gale-Shapley Algorithm ---
// Standard proposer-optimal stable matching.
// "Proposers" propose to their most preferred unproposed candidate.
// "Receivers" accept the best proposal they've seen.
//
// We arbitrarily split users into proposers/receivers for each run.
// In practice, the result is the same stable matching regardless of assignment
// when preferences are derived from the same pairwise comparisons.

export interface MatchResult {
  matches: Map<string, string>; // proposer -> receiver
  unmatched: string[];
}

export function galeShapley(
  proposerPrefs: Map<string, string[]>, // proposerId -> ranked receiverIds
  receiverPrefs: Map<string, string[]>, // receiverId -> ranked proposerIds
): MatchResult {
  const proposerIds = [...proposerPrefs.keys()];
  const receiverIds = [...receiverPrefs.keys()];

  // Build receiver preference rank lookup for O(1) comparison
  const receiverRank = new Map<string, Map<string, number>>();
  for (const [receiverId, prefs] of receiverPrefs) {
    const ranks = new Map<string, number>();
    prefs.forEach((id, idx) => ranks.set(id, idx));
    receiverRank.set(receiverId, ranks);
  }

  // Track state
  const freeProposers = new Set(proposerIds);
  const proposalIndex = new Map<string, number>(); // how far each proposer has gone
  const currentMatch = new Map<string, string>(); // receiver -> current proposer
  const matches = new Map<string, string>(); // proposer -> receiver

  for (const id of proposerIds) {
    proposalIndex.set(id, 0);
  }

  while (freeProposers.size > 0) {
    // Pick any free proposer
    const proposer = freeProposers.values().next().value!;
    const prefs = proposerPrefs.get(proposer)!;
    const idx = proposalIndex.get(proposer)!;

    // No more candidates to propose to
    if (idx >= prefs.length) {
      freeProposers.delete(proposer);
      continue;
    }

    const receiver = prefs[idx];
    proposalIndex.set(proposer, idx + 1);

    // If receiver is not a valid receiver (wrong pool), skip
    if (!receiverPrefs.has(receiver)) continue;

    const currentPartner = currentMatch.get(receiver);

    if (!currentPartner) {
      // Receiver is free, accept
      currentMatch.set(receiver, proposer);
      matches.set(proposer, receiver);
      freeProposers.delete(proposer);
    } else {
      // Receiver compares current partner with new proposer
      const ranks = receiverRank.get(receiver)!;
      const currentRank = ranks.get(currentPartner) ?? Infinity;
      const newRank = ranks.get(proposer) ?? Infinity;

      if (newRank < currentRank) {
        // Receiver prefers new proposer
        currentMatch.set(receiver, proposer);
        matches.delete(currentPartner);
        matches.set(proposer, receiver);
        freeProposers.delete(proposer);
        freeProposers.add(currentPartner);
      }
      // else: proposer stays free, tries next candidate
    }
  }

  // Find unmatched
  const allIds = new Set([...proposerIds, ...receiverIds]);
  const matched = new Set([...matches.keys(), ...matches.values()]);
  const unmatched = [...allIds].filter((id) => !matched.has(id));

  return { matches, unmatched };
}

// --- Full Matching Pipeline ---
// Takes all users' ELO ratings and produces stable matches.
// Splits users into two groups and runs Gale-Shapley.

export interface UserEloData {
  userId: string;
  gender: string;
  attractedTo: string;
  ratings: Map<string, number>; // targetId -> ELO score
}

// Returns true if user A and user B have mutual attraction compatibility
function isAttractionCompatible(a: UserEloData, b: UserEloData): boolean {
  const aLikesB =
    a.attractedTo === "both" ||
    (a.attractedTo === "men" && b.gender === "man") ||
    (a.attractedTo === "women" && b.gender === "woman");

  const bLikesA =
    b.attractedTo === "both" ||
    (b.attractedTo === "men" && a.gender === "man") ||
    (b.attractedTo === "women" && a.gender === "woman");

  return aLikesB && bLikesA;
}

export function runMatching(users: UserEloData[]): MatchResult {
  const proposerPrefs = new Map<string, string[]>();
  const receiverPrefs = new Map<string, string[]>();

  for (const user of users) {
    const candidates = users
      .filter((other) => other.userId !== user.userId && isAttractionCompatible(user, other))
      .map((other) => other.userId);

    const ranked = eloToPreferenceList(user.ratings, candidates);
    proposerPrefs.set(user.userId, ranked);
    receiverPrefs.set(user.userId, ranked);
  }

  return galeShapley(proposerPrefs, receiverPrefs);
}
