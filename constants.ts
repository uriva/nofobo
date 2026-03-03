export const APP_NAME = "NOFOBO";
export const APP_TAGLINE = "No Fear Of Better Option";
export const INSTANT_APP_ID = "6818f05d-46f3-4622-9aaf-dcd14e067e9e";

// API_URL: In Vite builds, use VITE_API_URL env var. In Deno server, use API_URL env var.
// In dev mode with Vite proxy, use empty string (relative URLs go through proxy).
const _viteApiUrl =
  typeof (globalThis as Record<string, unknown>).Deno === "undefined"
    ? ((import.meta as unknown as Record<string, unknown>).env as Record<string, string>)
        ?.VITE_API_URL ?? ""
    : "";
export const API_URL = _viteApiUrl ||
  (typeof Deno !== "undefined" ? Deno.env?.get?.("API_URL") ?? "" : "");

export const ELO_K_FACTOR = 32;
export const ELO_DEFAULT = 1400;
export const MIN_COMPARISONS_FOR_MATCHING = 30;
export const COMPARISONS_PER_SESSION = 20;
