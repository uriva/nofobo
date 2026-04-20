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
      adminEmails: i.any().optional(),
      code: i.string().unique().indexed(),
      createdAt: i.number().indexed(),
      name: i.string(),
      requirePhone: i.boolean().optional(),
      tags: i.any().optional(),
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
      attractedTo: i.any().optional(),
      bio: i.string(),
      communityCode: i.string().indexed().optional(),
      createdAt: i.number().indexed(),
      gender: i.string().indexed(),
      kinkTags: i.any().optional(), // JSON array of kink tags
      links: i.string().optional(),
      location: i.string().optional(),
      lookingFor: i.string().indexed().optional(),
      matchWithStatuses: i.any().optional(), // JSON array of acceptable statuses
      name: i.string(),
      onboardingComplete: i.boolean().indexed(),
      phone: i.string().optional(),
      photoUrl: i.string().optional(),
      photoUrls: i.any().optional(), // JSON array of photo URLs
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
  },
  rooms: {},
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
