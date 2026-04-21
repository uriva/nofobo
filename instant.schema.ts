// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/core";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    chatMessages: i.entity({
      createdAt: i.number().indexed(),
      text: i.string(),
    }),
    communities: i.entity({
      adminEmails: i.json<string[]>().optional(),
      code: i.string().unique().indexed(),
      createdAt: i.number().indexed(),
      name: i.string(),
      requirePhone: i.boolean().optional(),
      tags: i.json<string[]>().optional(),
      coverImageUrl: i.string().optional(),
    }),
    comparisons: i.entity({
      createdAt: i.number().indexed(),
    }),
    eloRatings: i.entity({
      comparisonsCount: i.number(),
      score: i.number().indexed(),
    }),
    matchCycles: i.entity({
      createdAt: i.number().indexed(),
      status: i.string().indexed(),
      weekStart: i.string().unique().indexed(),
    }),
    matches: i.entity({
      createdAt: i.number().indexed(),
      revealed: i.boolean().indexed(),
    }),
    onboardingChats: i.entity({
      content: i.string(),
      createdAt: i.number().indexed(),
      role: i.string(),
    }),
    profiles: i.entity({
      age: i.number().indexed(),
      aiDescription: i.string().optional(),
      attractedTo: i.json<string[]>().optional(),
      bio: i.string(),
      createdAt: i.number().indexed(),
      gender: i.string().indexed(),
      tags: i.json<string[]>().optional(), // JSON array of custom tags
      links: i.string().optional(),
      location: i.string().optional(),
      lookingFor: i.string().indexed().optional(),
      matchWithStatuses: i.json<string[]>().optional(), // JSON array of acceptable statuses
      name: i.string(),
      onboardingComplete: i.boolean().indexed(),
      phone: i.string().optional(),
      photoUrl: i.string().optional(),
      photoUrls: i.json<string[]>().optional(), // JSON array of photo URLs
      relationshipStatus: i.string().indexed().optional(),
    }),
  },
  links: {
    $streams$files: {
      forward: {
        on: "$streams",
        has: "many",
        label: "$files",
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "$stream",
        onDelete: "cascade",
      },
    },
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    chatMessagesMatch: {
      forward: {
        on: "chatMessages",
        has: "one",
        label: "match",
        onDelete: "cascade",
      },
      reverse: {
        on: "matches",
        has: "many",
        label: "chatMessages",
      },
    },
    chatMessagesSender: {
      forward: {
        on: "chatMessages",
        has: "one",
        label: "sender",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "sentMessages",
      },
    },
    communitiesCreator: {
      forward: {
        on: "communities",
        has: "one",
        label: "creator",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "createdCommunities",
      },
    },
    comparisonsLoserProfile: {
      forward: {
        on: "comparisons",
        has: "one",
        label: "loserProfile",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "lostComparisons",
      },
    },
    comparisonsVoterProfile: {
      forward: {
        on: "comparisons",
        has: "one",
        label: "voterProfile",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "votedComparisons",
      },
    },
    comparisonsWinnerProfile: {
      forward: {
        on: "comparisons",
        has: "one",
        label: "winnerProfile",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "wonComparisons",
      },
    },
    comparisonsLegacyVoter: {
      forward: {
        on: "comparisons",
        has: "one",
        label: "voter",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "legacyVotedComparisons",
      },
    },
    comparisonsLegacyWinner: {
      forward: {
        on: "comparisons",
        has: "one",
        label: "winner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "legacyWonComparisons",
      },
    },
    comparisonsLegacyLoser: {
      forward: {
        on: "comparisons",
        has: "one",
        label: "loser",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "legacyLostComparisons",
      },
    },
    eloLegacyRater: {
      forward: {
        on: "eloRatings",
        has: "one",
        label: "rater",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "legacyGivenRatings",
      },
    },
    eloLegacyTarget: {
      forward: {
        on: "eloRatings",
        has: "one",
        label: "target",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "legacyReceivedRatings",
      },
    },
    eloRatingsRaterProfile: {
      forward: {
        on: "eloRatings",
        has: "one",
        label: "raterProfile",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "givenRatings",
      },
    },
    eloRatingsTargetProfile: {
      forward: {
        on: "eloRatings",
        has: "one",
        label: "targetProfile",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "receivedRatings",
      },
    },
    matchesCycle: {
      forward: {
        on: "matches",
        has: "one",
        label: "cycle",
        onDelete: "cascade",
      },
      reverse: {
        on: "matchCycles",
        has: "many",
        label: "matches",
      },
    },
    matchesUser1: {
      forward: {
        on: "matches",
        has: "one",
        label: "user1",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "matchesAsUser1",
      },
    },
    matchesUser2: {
      forward: {
        on: "matches",
        has: "one",
        label: "user2",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "matchesAsUser2",
      },
    },
    onboardingChatsUser: {
      forward: {
        on: "onboardingChats",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "onboardingChats",
      },
    },
    profilesUser: {
      forward: {
        on: "profiles",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "profile",
      },
    },
    profilesCommunity: {
      forward: {
        on: "profiles",
        has: "one",
        label: "community",
      },
      reverse: {
        on: "communities",
        has: "many",
        label: "profiles",
      },
    },
  },
  rooms: {},
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
