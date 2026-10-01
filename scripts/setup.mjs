// One-command local setup:  npm run setup
// Creates .env (with random secrets), starts PostgreSQL in Docker, applies the
// migrations and creates the first Super Admin. Safe to run again.
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const step = (text) => console.log(`\n\x1b[36m▶ ${text}\x1b[0m`);

// 1. .env ------------------------------------------------------------------
if (existsSync(".env")) {
  step(".env already exists, keeping it");
} else {
  step("Creating .env with generated passwords");
  const dbPassword = randomBytes(12).toString("hex");
  const adminPassword = randomBytes(9).toString("base64url");
  const sessionSecret = randomBytes(32).toString("base64");

  const env = readFileSync(".env.example", "utf8")
    .replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${dbPassword}`)
    .replace(/^(DATABASE_URL="postgresql:\/\/[^:]+:)[^@]*@/m, `$1${dbPassword}@`)
    .replace(/^SEED_SUPER_ADMIN_PASSWORD=.*$/m, `SEED_SUPER_ADMIN_PASSWORD="${adminPassword}"`)
    .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET="${sessionSecret}"`);
  writeFileSync(".env", env);
}

// 2. Docker ----------------------------------------------------------------
try {
  execSync("docker info", { stdio: "ignore" });
} catch {
  console.error(
    "\nDocker is not running (or not installed). Start Docker Desktop and run `npm run setup` again.",
  );
  process.exit(1);
}

// 3. database --------------------------------------------------------------
step("Starting PostgreSQL (Docker)");
run("docker compose up -d --wait");

step("Applying database migrations");
run("npx prisma migrate deploy");

step("Generating the Prisma client");
run("npx prisma generate");

step("Creating the first Super Admin");
run("npx prisma db seed");

// 4. tell the user how to log in --------------------------------------------
const env = readFileSync(".env", "utf8");
const get = (key) => env.match(new RegExp(`^${key}="?([^"\\n]*)"?$`, "m"))?.[1] ?? "";

console.log(`
\x1b[32m✔ Setup complete.\x1b[0m

  Start the app:   npm run dev
  Open:            http://localhost:3000
  Log in with:     ${get("SEED_SUPER_ADMIN_EMAIL")}
  Password:        ${get("SEED_SUPER_ADMIN_PASSWORD")}   (also saved in .env)
`);
