"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon } from "./ui/icons";
import { cn } from "./ui/cn";

// The Web Speech API is not in every TypeScript DOM lib, so the parts we use are typed here.
interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEvent {
  results: ArrayLike<SpeechResult>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser settings.",
  "service-not-allowed": "Speech recognition is not allowed in this browser.",
  network: "Speech recognition needs a network connection.",
};

interface Props {
  // Called when recognition starts, so the caller can keep any text already typed.
  onStart: () => void;
  // The full transcript so far for this recording.
  onResult: (transcript: string) => void;
  onError: (message: string) => void;
}

// Microphone button that turns speech into text. Hidden where the browser has no speech recognition.
export default function MicButton({ onStart, onResult, onError }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => recRef.current?.abort();
  }, []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    onError("");
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      onResult(transcript.trim());
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        onError(ERRORS[e.error] ?? "Voice input failed. Try again.");
      }
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };

    onStart();
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition",
        "outline-2 outline-primary-500 focus-visible:outline",
        listening ? "animate-pulse bg-danger-500/15 text-danger-200" : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
      )}
      onClick={toggle}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      aria-pressed={listening}
    >
      <MicIcon />
    </button>
  );
}
