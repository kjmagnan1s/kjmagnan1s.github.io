import { defineConfig } from "vitest/config";

// Only the Worker sources have tests. _site is a build output and would
// otherwise get picked up as a second copy of the same suite.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", "_site/**", "vendor/**"],
  },
});
