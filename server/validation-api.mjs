import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const port = Number(process.env.HOOK_ATLAS_API_PORT ?? 4174);
const databasePath = resolve(process.cwd(), process.env.HOOK_ATLAS_DB_PATH ?? "data/validation-decisions.json");
const schema = "hook-atlas.validation-decisions.v1";

async function ensureDatabase() {
  await mkdir(dirname(databasePath), { recursive: true });
  try {
    await readFile(databasePath, "utf8");
  } catch {
    await writeDatabase({ schema, updatedAt: new Date().toISOString(), decisions: [] });
  }
}

async function readDatabase() {
  await ensureDatabase();
  const raw = await readFile(databasePath, "utf8");
  const parsed = JSON.parse(raw);
  const decisions = normalizeDecisionArray(parsed);
  return {
    schema,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    decisions,
  };
}

async function writeDatabase(payload) {
  const next = {
    schema,
    updatedAt: new Date().toISOString(),
    decisions: normalizeDecisionArray(payload),
  };
  await mkdir(dirname(databasePath), { recursive: true });
  const tempPath = `${databasePath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(tempPath, databasePath);
  return next;
}

function normalizeDecisionArray(input) {
  const rawItems = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray(input.decisions)
      ? input.decisions
      : input && typeof input === "object"
        ? Object.values(input)
        : [];

  const byId = new Map();
  rawItems.forEach((item) => {
    if (!item || typeof item !== "object") return;
    if (typeof item.videoId !== "string" || !item.videoId.trim()) return;
    byId.set(item.videoId.trim(), item);
  });
  return Array.from(byId.values()).sort((a, b) => a.videoId.localeCompare(b.videoId));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, databasePath, schema });
      return;
    }

    if (url.pathname === "/api/validation-decisions" && request.method === "GET") {
      sendJson(response, 200, await readDatabase());
      return;
    }

    if (url.pathname === "/api/validation-decisions" && request.method === "PUT") {
      const payload = await readRequestJson(request);
      sendJson(response, 200, await writeDatabase(payload));
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
  }
});

await ensureDatabase();

server.listen(port, () => {
  console.log(`Hook Atlas validation database listening on http://localhost:${port}`);
  console.log(`Database: ${databasePath}`);
});
