import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listBrowseMemories,
  searchFull,
  searchInstant,
} from "@lyvora/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env.server";

const SearchBodySchema = z.object({
  q: z.string().default(""),
  mode: z.enum(["instant", "full"]).default("full"),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  contentTypes: z.array(z.string()).optional(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export async function POST(request: Request) {
  getServerEnv();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SearchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { q, mode, categories, tags, contentTypes, from, to, limit } =
    parsed.data;

  try {
    if (!q.trim()) {
      const hits = await listBrowseMemories(user.id, limit ?? 24);
      return NextResponse.json({
        hits,
        facets: { categories: [], tags: [], contentTypes: [] },
        cleanedQuery: "",
        mode: "browse",
      });
    }

    if (mode === "instant") {
      const result = await searchInstant(user.id, q, limit ?? 8);
      return NextResponse.json(result);
    }

    const result = await searchFull(
      user.id,
      q,
      { categories, tags, contentTypes, from, to },
      limit ?? 20,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[search]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Search failed unexpectedly",
      },
      { status: 500 },
    );
  }
}
