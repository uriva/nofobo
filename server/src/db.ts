// deno-lint-ignore-file no-explicit-any
import { init } from "@instantdb/admin";
import schema from "../../instant.schema.ts";

let _adminDb: any = null;

const getAdminDb = () => {
  if (!_adminDb) {
    const appId = Deno.env.get("INSTANT_APP_ID") ??
      "6818f05d-46f3-4622-9aaf-dcd14e067e9e";
    const adminToken = Deno.env.get("INSTANT_ADMIN_TOKEN") ?? "";
    _adminDb = init({
      appId,
      adminToken,
      schema,
    });
  }
  return _adminDb;
};

const adminDb: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const db = getAdminDb();
      const val = db[prop];
      return typeof val === "function" ? val.bind(db) : val;
    },
  },
);

export default adminDb;
