import { defineConfig } from "@playwright/test";
const port = process.env.DRINK_LAB_TEST_PORT || "4173";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { baseURL: `http://localhost:${port}/drink-lab/` },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}/drink-lab/`,
    reuseExistingServer: !process.env.CI,
  },
});
