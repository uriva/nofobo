import { init } from "@instantdb/react";
import schema from "../../instant.schema.ts";
import { INSTANT_APP_ID } from "../../constants.ts";

const db = init({
  appId: INSTANT_APP_ID,
  schema,
  devtool: false,
  apiURI: "https://api.instantdb.uriv.me",
  websocketURI: "wss://api.instantdb.uriv.me/runtime/session",
});

export default db;
