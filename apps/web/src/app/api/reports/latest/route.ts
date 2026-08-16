import { NextResponse } from "next/server";
import { getLatestWeeklyReport } from "@lyvora/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await getLatestWeeklyReport(user.id);
  if (!report) {
    return NextResponse.json({ report: null });
  }

  return NextResponse.json({
    report: {
      id: report.id,
      weekStart: report.weekStart,
      narrative: report.narrative,
      payload: report.payload,
      createdAt: report.createdAt,
    },
  });
}
