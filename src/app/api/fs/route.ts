import { db } from "@/db";
import { fsNodes } from "@/db/schema";
import { eq, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function parseParentId(value: string | null): number | null {
  if (value === null || value === "" || value === "null") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

async function getSiblings(parentId: number | null) {
  const rows = await db
    .select({ id: fsNodes.id, name: fsNodes.name })
    .from(fsNodes)
    .where(parentId === null ? isNull(fsNodes.parentId) : eq(fsNodes.parentId, parentId));
  return rows;
}

function makeUniqueName(baseName: string, taken: Set<string>) {
  const trimmed = baseName.trim() || "New Item";
  if (!taken.has(trimmed)) return trimmed;

  // Windows-style suffixing
  let i = 2;
  while (taken.has(`${trimmed} (${i})`)) i += 1;
  return `${trimmed} (${i})`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parentId = parseParentId(searchParams.get("parentId"));

  const nodes = await db
    .select()
    .from(fsNodes)
    .where(parentId === null ? isNull(fsNodes.parentId) : eq(fsNodes.parentId, parentId))
    .orderBy(
      sql`case when ${fsNodes.type} = 'folder' then 0 else 1 end`,
      fsNodes.name,
    );

  return Response.json({ nodes });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        parentId?: number | null;
        name?: string;
        type?: "file" | "folder";
        content?: string | null;
      }
    | null;

  if (!body || !body.type || (body.type !== "file" && body.type !== "folder")) {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }

  const parentId = typeof body.parentId === "number" ? body.parentId : null;
  const desiredName = typeof body.name === "string" ? body.name : "New Item";

  const siblings = await getSiblings(parentId);
  const taken = new Set(siblings.map((s) => s.name));
  const name = makeUniqueName(desiredName, taken);

  const inserted = await db
    .insert(fsNodes)
    .values({
      parentId,
      type: body.type,
      name,
      content: body.type === "file" ? body.content ?? "" : null,
    })
    .returning();

  return Response.json({ node: inserted[0] }, { status: 201 });
}
