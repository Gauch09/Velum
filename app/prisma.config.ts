import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local (Next.js convention) for Prisma CLI commands
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL: direct connection (port 5432) required for migrations (bypasses pgBouncer)
    url: process.env["DIRECT_URL"],
  },
});
