import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./sidecar-drizzle",
  schema: "./sidecar/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_FILE_NAME || "./dev.sqlite",
  },
});
