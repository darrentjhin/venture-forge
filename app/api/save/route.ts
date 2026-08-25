import { env } from "cloudflare:workers";

async function ensureSaveStorage() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS game_saves (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      state_json TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    )`),
  ]);
}

function validSaveId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9-]{20,64}$/i.test(value);
}

export async function GET(request: Request) {
  const saveId = new URL(request.url).searchParams.get("id");
  if (!validSaveId(saveId)) return Response.json({ error: "Invalid save identifier" }, { status: 400 });
  await ensureSaveStorage();
  const row = await env.DB.prepare("SELECT state_json AS stateJson, revision, updated_at AS updatedAt FROM game_saves WHERE id = ? LIMIT 1").bind(saveId).first<{ stateJson: string; revision: number; updatedAt: number }>();
  if (!row) return Response.json({ error: "Save not found" }, { status: 404 });
  return Response.json({ state: JSON.parse(row.stateJson), revision: row.revision, updatedAt: row.updatedAt });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { saveId?: unknown; state?: unknown } | null;
  if (!body || !validSaveId(body.saveId) || typeof body.state !== "object" || body.state === null) {
    return Response.json({ error: "Invalid save payload" }, { status: 400 });
  }
  const serialized = JSON.stringify(body.state);
  if (serialized.length > 900_000) return Response.json({ error: "Save is too large" }, { status: 413 });
  const embeddedId = (body.state as { saveId?: unknown }).saveId;
  if (embeddedId !== body.saveId) return Response.json({ error: "Save ownership mismatch" }, { status: 403 });
  await ensureSaveStorage();
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO game_saves (id, user_id, state_json, revision, updated_at)
    VALUES (?, NULL, ?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, revision = game_saves.revision + 1, updated_at = excluded.updated_at`)
    .bind(body.saveId, serialized, now)
    .run();
  return Response.json({ ok: true, updatedAt: now });
}
