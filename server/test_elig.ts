import { init } from "@instantdb/admin";

const APP_ID = Deno.env.get("INSTANT_APP_ID");
const ADMIN_TOKEN = Deno.env.get("INSTANT_ADMIN_TOKEN");
if (!APP_ID || !ADMIN_TOKEN) {
  console.error("Missing INSTANT_APP_ID or INSTANT_ADMIN_TOKEN");
  Deno.exit(1);
}

const adminDb = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function run() {
  const { profiles } = await adminDb.query({
    profiles: { $: { where: { "community.code": "burningdesire" } } },
  });
  console.log(JSON.stringify(
    profiles.map((p) => ({
      name: p.name,
      gender: p.gender,
      attractedTo: p.attractedTo,
      myMatchWithStatuses: p.matchWithStatuses,
      theirStatus: p.relationshipStatus,
      kinkTags: p.kinkTags,
    })),
    null,
    2,
  ));
}
run();
