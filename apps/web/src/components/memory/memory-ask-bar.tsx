"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon, cn } from "@lyvora/ui";
import { useClientValue } from "@/lib/use-client-value";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/**
 * memory_detail_lyvora's fixed "Ask AI about this memory" pill. Submitting
 * hands the question to the existing chat route with the memory's title as
 * context; the mic uses the browser's speech recognition where available.
 */
export function MemoryAskBar({ title }: { title: string }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [listening, setListening] = useState(false);
  const micSupported = useClientValue(() => speechRecognitionCtor() !== null, false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) setQuestion((prev) => `${prev}${prev ? " " : ""}${transcript}`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div className="fixed bottom-lg left-1/2 z-40 w-full max-w-[600px] -translate-x-1/2 px-md max-lg:bottom-20 lg:left-[calc(50%+9rem)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const text = question.trim();
          if (!text) return;
          router.push(`/chat?q=${encodeURIComponent(`About "${title}": ${text}`)}`);
        }}
        className="flex items-center gap-sm rounded-full bg-surface/80 p-xs shadow-xl backdrop-blur-xl"
      >
        <button
          type="button"
          aria-label="Save something new"
          onClick={() => router.push("/home")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container transition-colors outline-none hover:bg-primary hover:text-on-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <MaterialIcon name="add" />
        </button>

        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          aria-label="Ask AI about this memory"
          placeholder="Ask AI about this memory..."
          className="flex-1 border-none bg-transparent px-sm py-sm text-body-md text-on-surface outline-none placeholder:text-on-surface-variant"
        />

        {micSupported && (
          <button
            type="button"
            aria-label={listening ? "Stop dictation" : "Dictate a question"}
            aria-pressed={listening}
            onClick={toggleMic}
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors outline-none hover:bg-surface-container-highest focus-visible:ring-2 focus-visible:ring-primary/40",
              listening ? "animate-pulse text-error" : "text-on-surface-variant",
            )}
          >
            <MaterialIcon name="mic" />
          </button>
        )}
      </form>
    </div>
  );
}
