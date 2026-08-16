import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  appendMessage,
  CHAT_SYSTEM_PROMPT,
  collectMemoryIdsFromUnknown,
  createChatTools,
  ensureThread,
  extractTextFromUiContent,
  loadThreadMessages,
  maybeSetThreadTitle,
  models,
  resolveCitations,
} from "@lyvora/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env.server";

export const maxDuration = 60;

const BodySchema = z.object({
  threadId: z.string().uuid().optional().nullable(),
  messages: z.array(z.any()),
});

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]!;
    if (message.role !== "user") continue;
    const parts = message.parts ?? [];
    const text = parts
      .map((part) =>
        part.type === "text" && "text" in part ? String(part.text) : "",
      )
      .join("")
      .trim();
    if (text) return text;
  }
  return "";
}

export async function POST(request: Request) {
  getServerEnv();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid chat payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = parsed.data.messages as UIMessage[];
  const userText = lastUserText(messages);
  const thread = await ensureThread({
    userId: user.id,
    threadId: parsed.data.threadId,
    titleHint: userText || "New chat",
  });

  if (userText) {
    const prior = (await loadThreadMessages(user.id, thread.id)) ?? [];
    const last = prior[prior.length - 1];
    const lastText = last
      ? extractTextFromUiContent(last.content).trim()
      : "";
    const alreadyStored = last?.role === "user" && lastText === userText;
    if (!alreadyStored) {
      await appendMessage({
        userId: user.id,
        threadId: thread.id,
        role: "user",
        content: {
          parts: [{ type: "text", text: userText }],
        },
      });
      await maybeSetThreadTitle(user.id, thread.id, userText);
    }
  }

  const toolMemoryIds = new Set<string>();
  const tools = createChatTools(user.id);

  const result = streamText({
    model: models.reason,
    system: CHAT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
    abortSignal: request.signal,
    onStepFinish: ({ toolResults }) => {
      for (const toolResult of toolResults ?? []) {
        const output =
          "output" in toolResult
            ? toolResult.output
            : "result" in toolResult
              ? (toolResult as { result: unknown }).result
              : toolResult;
        for (const id of collectMemoryIdsFromUnknown(output)) {
          toolMemoryIds.add(id);
        }
      }
    },
    onFinish: async ({ text }) => {
      const citations = resolveCitations({
        answerText: text,
        toolMemoryIds: [...toolMemoryIds],
      });
      await appendMessage({
        userId: user.id,
        threadId: thread.id,
        role: "assistant",
        content: {
          parts: [{ type: "text", text }],
          threadId: thread.id,
        },
        citations,
      });
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Thread-Id": thread.id,
    },
  });
}
