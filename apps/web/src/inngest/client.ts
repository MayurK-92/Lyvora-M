import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "lyvora",
  // Local Dev Server (pnpm inngest:dev). Cloud keys take over when set.
  isDev: process.env.NODE_ENV !== "production",
});

export type CaptureCreatedEvent = {
  name: "capture.created";
  data: {
    captureId: string;
    userId: string;
  };
};
