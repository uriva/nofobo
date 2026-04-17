import { init } from "@instantdb/admin";

const APP_ID = Deno.env.get("INSTANT_APP_ID");
const ADMIN_TOKEN = Deno.env.get("INSTANT_ADMIN_TOKEN");

if (!APP_ID || !ADMIN_TOKEN) {
  console.error(
    "Missing INSTANT_APP_ID or INSTANT_ADMIN_TOKEN in environment.",
  );
  Deno.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function cleanup() {
  console.log("Fetching profiles from database...");
  const { profiles } = await db.query({
    profiles: {
      user: {},
    },
  });

  console.log(`Found ${profiles.length} total profiles.`);

  // Group profiles by user.id
  const profilesByUser = new Map<string, any[]>();
  let profilesWithNoUser = 0;

  for (const profile of profiles) {
    // Determine the linked user ID (some schemas might have an array depending on cardinality, but user should be 1:1)
    let uid = null;
    if (
      profile.user && Array.isArray(profile.user) && profile.user.length > 0
    ) {
      uid = profile.user[0].id;
    } else if (
      profile.user && typeof profile.user === "object" &&
      !Array.isArray(profile.user)
    ) {
      // @ts-ignore it's an object with an id
      uid = profile.user.id;
    }

    if (!uid) {
      profilesWithNoUser++;
      continue;
    }

    if (!profilesByUser.has(uid)) {
      profilesByUser.set(uid, []);
    }
    profilesByUser.get(uid)!.push(profile);
  }

  console.log(`${profilesWithNoUser} profiles had no linked user.`);

  let deletedCount = 0;
  const txs: any[] = [];

  for (const [uid, userProfiles] of profilesByUser.entries()) {
    if (userProfiles.length > 1) {
      // Sort by createdAt descending (newest first)
      userProfiles.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Keep the most recent profile, delete the rest
      const [keep, ...toDelete] = userProfiles;
      console.log(
        `User ${uid} has ${userProfiles.length} profiles. Keeping ${keep.id} (created: ${keep.createdAt}).`,
      );

      for (const p of toDelete) {
        console.log(
          ` -> Marking for deletion: ${p.id} (created: ${p.createdAt})`,
        );
        txs.push(db.tx.profiles[p.id].delete());
        deletedCount++;
      }
    }
  }

  if (txs.length > 0) {
    console.log(`\nExecuting ${txs.length} deletions...`);

    // Transact in chunks to avoid any request size limits
    const CHUNK_SIZE = 50;
    for (let i = 0; i < txs.length; i += CHUNK_SIZE) {
      const chunk = txs.slice(i, i + CHUNK_SIZE);
      await db.transact(chunk);
      console.log(
        `Deleted chunk ${i / CHUNK_SIZE + 1} / ${
          Math.ceil(txs.length / CHUNK_SIZE)
        }`,
      );
    }
    console.log(`Successfully deleted ${deletedCount} duplicate profiles!`);
  } else {
    console.log("\nNo duplicate profiles found to delete.");
  }
}

cleanup().catch((err) => {
  console.error("Cleanup failed:", err);
  Deno.exit(1);
});
