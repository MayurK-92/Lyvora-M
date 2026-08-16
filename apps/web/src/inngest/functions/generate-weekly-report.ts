import {
  generateWeeklyReport,
  listProfileIds,
  sendWeeklyReportForUser,
} from "@lyvora/core";
import { inngest } from "@/inngest/client";

export const generateWeeklyReportJob = inngest.createFunction(
  {
    id: "generate-weekly-report",
    retries: 2,
    triggers: [{ cron: "TZ=UTC 0 8 * * 1" }],
  },
  async ({ step }) => {
    const userIds = await step.run("list-users", () => listProfileIds());
    let generated = 0;
    let emailed = 0;
    let emailSkipped = 0;

    for (const userId of userIds) {
      const report = await step.run(`report-${userId}`, () =>
        generateWeeklyReport(userId),
      );
      generated += 1;

      const emailResult = await step.run(`email-${userId}`, () =>
        sendWeeklyReportForUser(userId, {
          ...report,
          createdAt: new Date(report.createdAt),
        }),
      );

      if (emailResult.skipped) emailSkipped += 1;
      else emailed += 1;
    }

    return { generated, emailed, emailSkipped };
  },
);
