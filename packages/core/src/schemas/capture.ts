import { z } from "zod";

const clientSchema = z
  .enum(["web", "share_target", "shortcut", "extension"])
  .default("web");

const noteSchema = z.string().max(2000).optional();

export const CaptureRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("url"),
    input: z.url().refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "URL must be http or https"),
    note: noteSchema,
    client: clientSchema,
  }),
  z.object({
    kind: z.literal("text"),
    input: z.string().trim().min(1).max(100_000),
    note: noteSchema,
    client: clientSchema,
  }),
  z.object({
    kind: z.literal("pdf"),
    uploadPath: z.string().min(1).max(1024),
    note: noteSchema,
    client: clientSchema,
  }),
  z.object({
    kind: z.literal("image"),
    uploadPath: z.string().min(1).max(1024),
    note: noteSchema,
    client: clientSchema,
  }),
]);

export type CaptureRequest = z.infer<typeof CaptureRequestSchema>;

export const CaptureUploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
});

export type CaptureUploadRequest = z.infer<typeof CaptureUploadRequestSchema>;
