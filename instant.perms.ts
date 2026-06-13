import type { InstantRules } from "@instantdb/react";

const rules = {
  profiles: {
    allow: {
      view: "true",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id in data.ref('user.id')"],
  },
  onboardingChats: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "false",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id in data.ref('user.id')"],
  },
  communities: {
    allow: {
      view: "true",
      create: "true",
      update: "isAdmin || isGlobalAdmin",
      delete: "false",
    },
    bind: [
      "isAdmin",
      "auth.email in data.adminEmails",
      "isGlobalAdmin",
      "auth.email == 'uri.valevski@gmail.com' || auth.email == 'BurningMan@alumni.stanford.edu'",
    ],
  },
  comparisons: {
    allow: {
      view: "isVoter",
      create: "isVoter",
      update: "false",
      delete: "isVoter",
    },
    bind: ["isVoter", "auth.id in data.ref('voterProfile.user.id')"],
  },
  eloRatings: {
    allow: {
      view: "isRater || isCommunityAdmin",
      create: "isRater",
      update: "isRater",
      delete: "false",
    },
    bind: [
      "isRater",
      "auth.id in data.ref('raterProfile.user.id')",
      "isCommunityAdmin",
      "auth.email in data.ref('raterProfile.community.adminEmails')",
    ],
  },
  matchCycles: {
    allow: {
      view: "true",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  matches: {
    allow: {
      view: "isParticipant",
      create: "false",
      update: "isParticipant",
      delete: "false",
    },
    bind: [
      "isParticipant",
      "auth.id in data.ref('user1.id') || auth.id in data.ref('user2.id')",
    ],
  },
  chatMessages: {
    allow: {
      view: "isMatchParticipant",
      create: "isSenderAndMatchParticipant",
      update: "false",
      delete: "false",
    },
    bind: [
      "isMatchParticipant",
      "auth.id in data.ref('match.user1.id') || auth.id in data.ref('match.user2.id')",
      "isSenderAndMatchParticipant",
      "auth.id == data.ref('sender.id') && (auth.id in data.ref('match.user1.id') || auth.id in data.ref('match.user2.id'))",
    ],
  },
  $users: {
    allow: {
      view: "true",
    },
  },
  $files: {
    allow: {
      view: "true",
      create: "isLoggedIn",
      delete: "isOwner",
    },
    bind: [
      "isLoggedIn",
      "auth.id != ''",
      "isOwner",
      "auth.id == data.creator",
    ],
  },
} satisfies InstantRules;

export default rules;
