import { NextResponse } from "next/server";
import { deleteThread } from "@lyvora/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteThread(user.id, threadId);
    // Idempotent: already-deleted threads still count as success.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("deleteThread failed", error);
    return NextResponse.json(
      { error: "Could not delete conversation" },
      { status: 500 },
    );
  }
}
