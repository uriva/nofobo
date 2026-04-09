import { init } from "@instantdb/admin";

const adminDb = init({ appId: "6818f05d-46f3-4622-9aaf-dcd14e067e9e", adminToken: "00458ed4-452d-410a-8e03-38e657098985" });

async function run() {
  const { profiles } = await adminDb.query({
    profiles: { $: { where: { communityCode: "burningdesire" } } }
  });
  console.log(JSON.stringify(profiles.map(p => ({
    name: p.name,
    gender: p.gender,
    attractedTo: p.attractedTo,
    myMatchWithStatuses: p.matchWithStatuses,
    theirStatus: p.relationshipStatus,
    kinkTags: p.kinkTags
  })), null, 2));
}
run();
