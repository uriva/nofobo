import { init } from "@instantdb/admin";
import schema from "../../instant.schema.ts";

const INSTANT_APP_ID = Deno.env.get("INSTANT_APP_ID") ??
  "6818f05d-46f3-4622-9aaf-dcd14e067e9e";
const INSTANT_ADMIN_TOKEN = Deno.env.get("INSTANT_ADMIN_TOKEN") ?? "";

const adminDb = init({
  appId: INSTANT_APP_ID,
  adminToken: INSTANT_ADMIN_TOKEN,
  schema,
});

export default adminDb;
