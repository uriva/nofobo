import { i } from "@instantdb/core";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    profiles: i.entity({
      name: i.string(),
      age: i.number().indexed(),
      gender: i.string().indexed(),
      lookingFor: i.string().indexed(),
      bio: i.string(),
      links: i.string(),
      aiDescription: i.string(),
      photoUrl: i.string().optional(),
      onboardingComplete: i.boolean().indexed(),
      createdAt: i.number().indexed(),
    }),
    onboardingChats: i.entity({
      role: i.string(),
      content: i.string(),
      createdAt: i.number().indexed(),
    }),
    comparisons: i.entity({
      createdAt: i.number().indexed(),
    }),
    eloRatings: i.entity({
      score: i.number().indexed(),
      comparisonsCount: i.number(),
    }),
    matchCycles: i.entity({
      weekStart: i.string().unique().indexed(),
      status: i.string().indexed(),
      createdAt: i.number().indexed(),
    }),
    matches: i.entity({
      createdAt: i.number().indexed(),
      revealed: i.boolean().indexed(),
    }),
    chatMessages: i.entity({
      text: i.string(),
      createdAt: i.number().indexed(),
    }),
  },
  links: {
    profileUser: {
      forward: {
        on: "profiles",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: { on: "$users", has: "one", label: "profile" },
    },
    onboardingChatUser: {
      forward: {
        on: "onboardingChats",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: { on: "$users", has: "many", label: "onboardingChats" },
    },
    comparisonVoter: {
      forward: { on: "comparisons", has: "one", label: "voter" },
      reverse: { on: "$users", has: "many", label: "votedComparisons" },
    },
    comparisonWinner: {
      forward: { on: "comparisons", has: "one", label: "winner" },
      reverse: { on: "$users", has: "many", label: "wonComparisons" },
    },
    comparisonLoser: {
      forward: { on: "comparisons", has: "one", label: "loser" },
      reverse: { on: "$users", has: "many", label: "lostComparisons" },
    },
    eloRater: {
      forward: { on: "eloRatings", has: "one", label: "rater" },
      reverse: { on: "$users", has: "many", label: "givenRatings" },
    },
    eloTarget: {
      forward: { on: "eloRatings", has: "one", label: "target" },
      reverse: { on: "$users", has: "many", label: "receivedRatings" },
    },
    matchCycle: {
      forward: {
        on: "matches",
        has: "one",
        label: "cycle",
        onDelete: "cascade",
      },
      reverse: { on: "matchCycles", has: "many", label: "matches" },
    },
    matchUser1: {
      forward: { on: "matches", has: "one", label: "user1" },
      reverse: { on: "$users", has: "many", label: "matchesAsUser1" },
    },
    matchUser2: {
      forward: { on: "matches", has: "one", label: "user2" },
      reverse: { on: "$users", has: "many", label: "matchesAsUser2" },
    },
    chatMessageMatch: {
      forward: {
        on: "chatMessages",
        has: "one",
        label: "match",
        onDelete: "cascade",
      },
      reverse: { on: "matches", has: "many", label: "chatMessages" },
    },
    chatMessageSender: {
      forward: { on: "chatMessages", has: "one", label: "sender" },
      reverse: { on: "$users", has: "many", label: "sentMessages" },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
