import {
  listProfileIds,
  recomputeInterests,
} from "@lyvora/core";
import { inngest } from "@/inngest/client";

export const recomputeInterestsJob = inngest.createFunction(
  {
    id: "recompute-interests",
    retries: 2,
    triggers: [{ cron: "TZ=UTC 0 3 * * *" }],
  },
  async ({ step }) => {
    const userIds = await step.run("list-users", () => listProfileIds());
    let updated = 0;
    for (const userId of userIds) {
      await step.run(`interests-${userId}`, async () => {
        await recomputeInterests(userId);
      });
      updated += 1;
    }
    return { updated };
  },
);
