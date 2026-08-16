import { NextResponse } from "next/server";
import { generateWeeklyReport } from "@lyvora/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Build or refresh this week's digest for the signed-in user. */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await generateWeeklyReport(user.id);
    return NextResponse.json({
      report: {
        id: report.id,
        weekStart: report.weekStart,
        narrative: report.narrative,
        payload: report.payload,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error("generateWeeklyReport failed", error);
    return NextResponse.json(
      { error: "Could not generate the weekly report. Try again." },
      { status: 500 },
    );
  }
}
