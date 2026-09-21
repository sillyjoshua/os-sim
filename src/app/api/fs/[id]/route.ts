import { db } from "@/db";
import { fsNodes } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function parseId(params: { id?: string }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return null;
  return id;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const id = parseId(params);
  if (id === null) return Response.json({ error: "Invalid id" }, { status: 400 });

  const rows = await db.select().from(fsNodes).where(eq(fsNodes.id, id));
  if (!rows[0]) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ node: rows[0] });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const id = parseId(params);
  if (id === null) return Response.json({ error: "Invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as
    | {
        name?: string;
        content?: string | null;
        parentId?: number | null;
      }
    | null;

  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return Response.json({ error: "Name required" }, { status: 400 });
    patch.name = name;
  }

  if ("content" in body) {
    patch.content = typeof body.content === "string" ? body.content : "";
  }

  if ("parentId" in body) {
    patch.parentId = typeof body.parentId === "number" ? body.parentId : null;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await db.update(fsNodes).set(patch).where(eq(fsNodes.id, id)).returning();

  if (!updated[0]) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ node: updated[0] });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const id = parseId(params);
  if (id === null) return Response.json({ error: "Invalid id" }, { status: 400 });

  const deleted = await db.delete(fsNodes).where(eq(fsNodes.id, id)).returning({ id: fsNodes.id });

  if (!deleted[0]) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}
