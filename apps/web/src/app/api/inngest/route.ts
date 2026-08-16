import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateWeeklyReportJob } from "@/inngest/functions/generate-weekly-report";
import { processCapture } from "@/inngest/functions/process-capture";
import { recomputeInterestsJob } from "@/inngest/functions/recompute-interests";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processCapture, recomputeInterestsJob, generateWeeklyReportJob],
});
