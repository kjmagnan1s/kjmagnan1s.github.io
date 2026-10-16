/**
 * Settings for every TypeSafe SDK call (play, the compose router, the compose
 * evaluator). Pinned because the SDK's default, `jev-latest`, moves.
 */
export const JEV_MODEL = "jev-1.14.0";

// Experimental flags (TypeSafe, 2026-10-14): image input and 262k context.
export const JEV_HEADERS: Record<string, string> = {
  "TypeSafe-Danger-Zone-Images": "true",
  "TypeSafe-Danger-Zone-Long-Context": "true",
};
