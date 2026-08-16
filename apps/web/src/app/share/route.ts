import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createFileCapture,
  createUrlOrTextCapture,
} from "@/lib/share/create-shared-capture";
import {
  extractUrlCandidate,
  parseShareClient,
} from "@/lib/share/extract-shared";

function homeRedirect(request: NextRequest, captureId?: string) {
  const url = new URL("/home", request.url);
  if (captureId) url.searchParams.set("captureId", captureId);
  return NextResponse.redirect(url);
}

function signInRedirect(request: NextRequest) {
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return signInRedirect(request);

  const params = request.nextUrl.searchParams;
  const client = parseShareClient(params.get("client") ?? "shortcut");
  const title = params.get("title");
  const text = params.get("text");
  const urlParam = params.get("url");
  const url = extractUrlCandidate({ url: urlParam, text, title });

  if (!url && !(text || title)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  const result = await createUrlOrTextCapture({
    userId: user.id,
    url,
    text: url ? null : text || title,
    title,
    client,
  });

  if (!result.ok) {
    const errUrl = new URL("/home", request.url);
    errUrl.searchParams.set("shareError", result.error);
    return NextResponse.redirect(errUrl);
  }

  return homeRedirect(request, result.captureId);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return signInRedirect(request);

  let title: string | null = null;
  let text: string | null = null;
  let urlField: string | null = null;
  let file: File | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    title = stringField(form.get("title"));
    text = stringField(form.get("text"));
    urlField = stringField(form.get("url"));
    const maybeFile = form.get("file");
    if (maybeFile instanceof File && maybeFile.size > 0) {
      file = maybeFile;
    }
  } else if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    title = typeof body.title === "string" ? body.title : null;
    text = typeof body.text === "string" ? body.text : null;
    urlField = typeof body.url === "string" ? body.url : null;
  } else {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
  }

  if (file) {
    const result = await createFileCapture({
      userId: user.id,
      file,
      note: title,
      client: "share_target",
    });
    if (!result.ok) {
      const errUrl = new URL("/home", request.url);
      errUrl.searchParams.set("shareError", result.error);
      return NextResponse.redirect(errUrl);
    }
    return homeRedirect(request, result.captureId);
  }

  const url = extractUrlCandidate({ url: urlField, text, title });
  const result = await createUrlOrTextCapture({
    userId: user.id,
    url,
    text: url ? null : text || title,
    title,
    client: "share_target",
  });

  if (!result.ok) {
    const errUrl = new URL("/home", request.url);
    errUrl.searchParams.set("shareError", result.error);
    return NextResponse.redirect(errUrl);
  }

  return homeRedirect(request, result.captureId);
}

function stringField(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
