import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` runs from npm's postinstall, before .env exists, and never
    // connects to the database, so a missing URL must not fail it. If it is
    // missing for a real command, the error names this host so the cause is obvious.
    url:
      process.env.DATABASE_URL ??
      "postgresql://user:password@DATABASE_URL-is-not-set.invalid:5432/db",
  },
});
