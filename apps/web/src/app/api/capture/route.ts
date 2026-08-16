import { NextResponse } from "next/server";
import { CaptureRequestSchema } from "@lyvora/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";

const RATE_LIMIT_PER_HOUR = 30;

export async function POST(request: Request) {
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

  const parsed = CaptureRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid capture payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("captures")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  if (countError) {
    return NextResponse.json({ error: "Rate limit check failed" }, { status: 500 });
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");

  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("captures")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { captureId: existing.id, status: existing.status },
        { status: 200 },
      );
    }
  }

  const payload = parsed.data;
  const insertRow = {
    user_id: user.id,
    kind: payload.kind,
    raw_input:
      payload.kind === "url" || payload.kind === "text" ? payload.input : null,
    upload_path:
      payload.kind === "pdf" || payload.kind === "image"
        ? payload.uploadPath
        : null,
    user_note: payload.note ?? null,
    client: payload.client,
    idempotency_key: idempotencyKey,
    status: "queued" as const,
  };

  if (
    insertRow.upload_path &&
    !insertRow.upload_path.startsWith(`${user.id}/`)
  ) {
    return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
  }

  const { data: capture, error: insertError } = await supabase
    .from("captures")
    .insert(insertRow)
    .select("id, status")
    .single();

  if (insertError || !capture) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create capture" },
      { status: 500 },
    );
  }

  try {
    await inngest.send({
      name: "capture.created",
      data: { captureId: capture.id, userId: user.id },
    });
  } catch (error) {
    console.error("[capture] inngest.send failed", error);
    return NextResponse.json(
      {
        captureId: capture.id,
        status: capture.status,
        warning:
          "Capture saved but the pipeline worker could not be notified. Is Inngest Dev running?",
      },
      { status: 202 },
    );
  }

  return NextResponse.json(
    { captureId: capture.id, status: capture.status },
    { status: 202 },
  );
}
