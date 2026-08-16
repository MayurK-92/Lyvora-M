import {
  generateWeeklyReport,
  isLocalMondayDigestHour,
  listDigestRecipients,
  sendWeeklyReportForUser,
} from "@lyvora/core";
import { inngest } from "@/inngest/client";

export const generateWeeklyReportJob = inngest.createFunction(
  {
    id: "generate-weekly-report",
    retries: 2,
    // Hourly UTC; each user is emailed only in their Monday 08:00 local hour.
    triggers: [{ cron: "TZ=UTC 0 * * * *" }],
  },
  async ({ step }) => {
    const recipients = await step.run("list-users", () => listDigestRecipients());
    const due = recipients.filter((row) => isLocalMondayDigestHour(row.timezone));

    let generated = 0;
    let emailed = 0;
    let emailSkipped = 0;

    for (const { id: userId } of due) {
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

    return { considered: recipients.length, due: due.length, generated, emailed, emailSkipped };
  },
);
