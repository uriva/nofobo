import { init } from "@instantdb/admin";
import schema from "../../instant.schema.ts";

const INSTANT_APP_ID = Deno.env.get("INSTANT_APP_ID") ??
  "6818f05d-46f3-4622-9aaf-dcd14e067e9e";
const INSTANT_ADMIN_TOKEN = Deno.env.get("INSTANT_ADMIN_TOKEN") ?? "";

console.log(
  "DB Init with App ID:",
  INSTANT_APP_ID,
  "Token length:",
  INSTANT_ADMIN_TOKEN.length,
);

let adminDb: any;
try {
  adminDb = init({
    appId: INSTANT_APP_ID,
    adminToken: INSTANT_ADMIN_TOKEN,
    schema,
  });
  console.log("DB initialized successfully");
} catch (e) {
  console.error("DB INIT ERROR:", e);
}

export default adminDb;
