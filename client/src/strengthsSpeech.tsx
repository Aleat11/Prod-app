import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import higherSelfVoiceMp3 from "./assets/higher-self-voice.mp3";

export type SpeechStatus = "idle" | "speaking" | "paused";

export type VoiceClipKey = "full" | "act" | "move" | "gap" | "discipline" | "proof" | "execute";

export interface VoiceManifestClip {
  key: VoiceClipKey;
  label: string;
  shortLabel: string;
  startSec: number;
  endSec: number;
  transcript: string;
}

export const VOICE_MANIFEST_CLIPS: VoiceManifestClip[] = [
  {
    key: "full",
    label: "Be Extraordinary · Full Voice Manifesto",
    shortLabel: "Full Manifesto (1:00)",
    startSec: 0,
    endSec: 61,
    transcript:
      "Every dream begins as an idea, but only those who act transform it into something real. Most people wait for the right time, the right feeling, the right sign. Extraordinary people move anyway. At Be Extraordinary, we close the gap between knowing and doing. We turn inspiration into implementation, and potential into performance. Because the truth is, greatness isn't found in luck. It's built through discipline, clarity, and consistent motion. Every step forward, every small win, is proof that the extraordinary is already within you, waiting to be activated. This is your moment to stop consuming and start creating. To stop planning and start executing. So if you're ready to bridge the gap between who you are and who you're meant to be, welcome to Be Extraordinary. Where ideas become action, and action becomes transformation.",
  },
  {
    key: "execute",
    label: "Stop planning, start executing",
    shortLabel: "Stop planning, execute",
    startSec: 41.3,
    endSec: 49.0,
    transcript: "This is your moment to stop consuming and start creating. To stop planning and start executing.",
  },
  {
    key: "move",
    label: "Extraordinary people move anyway",
    shortLabel: "Move anyway",
    startSec: 6.3,
    endSec: 14.3,
    transcript: "Most people wait for the right time, the right feeling, the right sign. Extraordinary people move anyway.",
  },
  {
    key: "discipline",
    label: "Discipline, clarity, and consistent motion",
    shortLabel: "Discipline & motion",
    startSec: 24.6,
    endSec: 32.9,
    transcript: "Because the truth is, greatness isn't found in luck. It's built through discipline, clarity, and consistent motion.",
  },
  {
    key: "proof",
    label: "Every small win is proof",
    shortLabel: "Every small win is proof",
    startSec: 33.1,
    endSec: 41.2,
    transcript: "Every step forward, every small win, is proof that the extraordinary is already within you, waiting to be activated.",
  },
  {
    key: "gap",
    label: "Close the gap between knowing and doing",
    shortLabel: "Knowing → doing",
    startSec: 14.4,
    endSec: 24.5,
    transcript: "At Be Extraordinary, we close the gap between knowing and doing. We turn inspiration into implementation, and potential into performance.",
  },
  {
    key: "act",
    label: "Only those who act transform it",
    shortLabel: "Only those who act",
    startSec: 0,
    endSec: 6.2,
    transcript: "Every dream begins as an idea, but only those who act transform it into something real.",
  },
];

export interface SpeechController {
  supported: boolean;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  voiceReply: boolean;
  setVoiceReply: (v: boolean) => void;
  voiceName: string;
  currentId: string | null;
  currentLabel: string;
  status: SpeechStatus;
  rate: number;
  setRate: (r: number) => void;
  speak: (id: string, label: string, text: string) => void;
  toggle: (id: string, label: string, text: string) => void;
  playVoiceClip: (clipKey?: VoiceClipKey) => void;
  pauseResume: () => void;
  stop: () => void;
  isActive: (id: string) => boolean;
}

const Ctx = createContext<SpeechController | null>(null);

export function useSpeech(): SpeechController {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSpeech outside provider");
  return c;
}

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if ((cur + " " + t).trim().length > 240 && cur) {
      chunks.push(cur.trim());
      cur = t;
    } else {
      cur = (cur + " " + t).trim();
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function selectMe2BrowserVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const preferredMaleNames = ["aaron", "daniel", "guy", "christopher", "eric", "alex", "fred", "david", "mark", "matthew", "male"];
  for (const hint of preferredMaleNames) {
    const match = enVoices.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }
  return enVoices.find((v) => v.default) ?? enVoices[0];
}

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const parent = useContext(Ctx);
  const supported = typeof window !== "undefined";
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("strengths-tts-enabled") !== "off";
    } catch {
      return true;
    }
  });
  const [voiceReply, setVoiceReplyState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("workout-log:voice-reply");
      return saved ? saved === "on" : true;
    } catch {
      return true;
    }
  });
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentLabel, setCurrentLabel] = useState("");
  const [status, setStatus] = useState<SpeechStatus>("idle");
  // Default 0.92x matches the uploaded Me2_ivc_sp92_s50_sb75_v3 voice recording
  const [rate, setRateState] = useState(0.92);
  const idRef = useRef<string | null>(null);
  const rateRef = useRef(0.92);
  rateRef.current = rate;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clipStopTimerRef = useRef<number | null>(null);
  const ttsCacheRef = useRef<Map<string, string>>(new Map());

  const clearAudioElement = useCallback(() => {
    if (clipStopTimerRef.current != null) {
      window.clearTimeout(clipStopTimerRef.current);
      clipStopTimerRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.ontimeupdate = null;
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearAudioElement();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    idRef.current = null;
    setCurrentId(null);
    setCurrentLabel("");
    setStatus("idle");
  }, [clearAudioElement]);

  const setEnabled = useCallback(
    (v: boolean) => {
      setEnabledState(v);
      try {
        localStorage.setItem("strengths-tts-enabled", v ? "on" : "off");
      } catch {
        /* ignore */
      }
      if (!v) stop();
    },
    [stop],
  );

  const setVoiceReply = useCallback(
    (v: boolean) => {
      setVoiceReplyState(v);
      try {
        localStorage.setItem("workout-log:voice-reply", v ? "on" : "off");
      } catch {
        /* ignore */
      }
      if (v && !enabled) {
        setEnabledState(true);
        try {
          localStorage.setItem("strengths-tts-enabled", "on");
        } catch {
          /* ignore */
        }
      }
    },
    [enabled],
  );

  const setRate = useCallback((r: number) => {
    setRateState(r);
    if (audioRef.current) {
      // Relative to the 0.92x recorded base
      audioRef.current.playbackRate = Math.max(0.75, Math.min(1.5, r / 0.92));
    }
  }, []);

  const speakBrowserMe2 = useCallback((id: string, label: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      idRef.current = null;
      setCurrentId(null);
      setCurrentLabel("");
      setStatus("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const chunks = chunkText(text);
    if (!chunks.length) return;
    idRef.current = id;
    setCurrentId(id);
    setCurrentLabel(label);
    setStatus("speaking");

    const voices = window.speechSynthesis.getVoices();
    const chosenVoice = selectMe2BrowserVoice(voices);

    chunks.forEach((chunk, idx) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.rate = rateRef.current;
      u.pitch = 0.88; // Deep, warm baritone resonance matching Me2_ivc
      u.lang = "en-US";
      if (chosenVoice) u.voice = chosenVoice;
      if (idx === chunks.length - 1) {
        u.onend = () => {
          if (idRef.current === id) {
            idRef.current = null;
            setCurrentId(null);
            setCurrentLabel("");
            setStatus("idle");
          }
        };
        u.onerror = () => {
          if (idRef.current === id) {
            idRef.current = null;
            setCurrentId(null);
            setCurrentLabel("");
            setStatus("idle");
          }
        };
      }
      window.speechSynthesis.speak(u);
    });
  }, []);

  const playAudioUrl = useCallback(
    (id: string, label: string, url: string, startSec = 0, endSec?: number): Promise<boolean> => {
      return new Promise((resolve) => {
        clearAudioElement();
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        idRef.current = id;
        setCurrentId(id);
        setCurrentLabel(label);
        setStatus("speaking");

        // Recorded Me2 clip is already at 0.92x; adjust gently if user picked another speed
        audio.playbackRate = Math.max(0.75, Math.min(1.4, rateRef.current / 0.92));

        if (startSec > 0) {
          audio.currentTime = startSec;
        }
        if (endSec != null) {
          audio.ontimeupdate = () => {
            if (audio.currentTime >= endSec) {
              audio.pause();
              if (idRef.current === id) {
                clearAudioElement();
                idRef.current = null;
                setCurrentId(null);
                setCurrentLabel("");
                setStatus("idle");
              }
            }
          };
        }
        audio.onended = () => {
          if (idRef.current === id) {
            clearAudioElement();
            idRef.current = null;
            setCurrentId(null);
            setCurrentLabel("");
            setStatus("idle");
          }
        };
        audio.onerror = () => {
          clearAudioElement();
          resolve(false);
        };
        audio
          .play()
          .then(() => resolve(true))
          .catch(() => {
            clearAudioElement();
            resolve(false);
          });
      });
    },
    [clearAudioElement],
  );

  const playVoiceClip = useCallback(
    (clipKey: VoiceClipKey = "full") => {
      if (!supported) return;
      if (!enabled) setEnabled(true);
      const clip = VOICE_MANIFEST_CLIPS.find((c) => c.key === clipKey) ?? VOICE_MANIFEST_CLIPS[0]!;
      const clipId = `me2-clip-${clip.key}`;
      if (idRef.current === clipId && audioRef.current) {
        if (status === "speaking") {
          audioRef.current.pause();
          setStatus("paused");
          return;
        }
        if (status === "paused") {
          void audioRef.current.play();
          setStatus("speaking");
          return;
        }
      }
      void playAudioUrl(clipId, `Me2 Voice · ${clip.label}`, higherSelfVoiceMp3, clip.startSec, clip.endSec).then((ok) => {
        if (!ok) {
          speakBrowserMe2(clipId, `Me2 Voice · ${clip.label}`, clip.transcript);
        }
      });
    },
    [enabled, playAudioUrl, setEnabled, speakBrowserMe2, status, supported],
  );

  const speak = useCallback(
    (id: string, label: string, text: string) => {
      if (!supported || !enabled) return;
      const clean = text.replace(/\s+/g, " ").trim();
      if (!clean) return;

      // 1. Check if text matches one of the recorded Me2 voice clips
      const matchingClip = VOICE_MANIFEST_CLIPS.find(
        (c) => c.transcript.toLowerCase() === clean.toLowerCase(),
      );
      if (matchingClip) {
        playVoiceClip(matchingClip.key);
        return;
      }

      // 2. Check cached server-synthesized Me2 / Gemini TTS audio
      const cachedUrl = ttsCacheRef.current.get(clean);
      if (cachedUrl) {
        void playAudioUrl(id, label, cachedUrl).then((ok) => {
          if (!ok) speakBrowserMe2(id, label, clean);
        });
        return;
      }

      // 3. Request server-side Me2 / Gemini TTS synthesis, fallback to Me2 browser profile
      clearAudioElement();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      idRef.current = id;
      setCurrentId(id);
      setCurrentLabel(label);
      setStatus("speaking");

      void api
        .synthesizeSpeech({ text: clean, persona: label })
        .then(async (res) => {
          if (idRef.current !== id) return;
          if (res.ok && res.audioBase64 && res.mimeType) {
            const blobUrl = base64ToBlobUrl(res.audioBase64, res.mimeType);
            ttsCacheRef.current.set(clean, blobUrl);
            const played = await playAudioUrl(id, label, blobUrl);
            if (!played && idRef.current === id) {
              speakBrowserMe2(id, label, clean);
            }
          } else {
            speakBrowserMe2(id, label, clean);
          }
        })
        .catch(() => {
          if (idRef.current === id) {
            speakBrowserMe2(id, label, clean);
          }
        });
    },
    [clearAudioElement, enabled, playAudioUrl, playVoiceClip, speakBrowserMe2, supported],
  );

  const pauseResume = useCallback(() => {
    if (!supported || !currentId) return;
    if (audioRef.current) {
      if (status === "speaking") {
        audioRef.current.pause();
        setStatus("paused");
      } else if (status === "paused") {
        void audioRef.current.play();
        setStatus("speaking");
      }
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (status === "speaking") {
        window.speechSynthesis.pause();
        setStatus("paused");
      } else if (status === "paused") {
        window.speechSynthesis.resume();
        setStatus("speaking");
      }
    }
  }, [supported, currentId, status]);

  const toggle = useCallback(
    (id: string, label: string, text: string) => {
      if (currentId === id) {
        if (status === "speaking" || status === "paused") {
          pauseResume();
          return;
        }
      }
      speak(id, label, text);
    },
    [currentId, status, pauseResume, speak],
  );

  useEffect(
    () => () => {
      if (!parent) {
        clearAudioElement();
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      }
    },
    [clearAudioElement, parent],
  );

  if (parent) return <>{children}</>;

  const value: SpeechController = {
    supported,
    enabled,
    setEnabled,
    voiceReply,
    setVoiceReply,
    voiceName: "Me2 · Be Extraordinary (sp92)",
    currentId,
    currentLabel,
    status,
    rate,
    setRate,
    speak,
    toggle,
    playVoiceClip,
    pauseResume,
    stop,
    isActive: (id) => currentId === id,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function SpeakButton({
  id,
  label,
  text,
  variant = "small",
  className = "",
}: {
  id: string;
  label: string;
  text: string;
  variant?: "primary" | "small" | "icon";
  className?: string;
}) {
  const sp = useSpeech();
  if (!sp.supported || !sp.enabled) return null;
  const active = sp.isActive(id);
  const paused = active && sp.status === "paused";
  const playing = active && sp.status === "speaking";
  const content =
    variant === "icon"
      ? paused
        ? "▶"
        : playing
          ? "⏸"
          : "🔊"
      : playing
        ? "⏸ Pause"
        : paused
          ? "▶ Resume"
          : "🔊 Listen";
  const base =
    variant === "primary"
      ? "w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-3 font-semibold text-sm"
      : variant === "icon"
        ? "shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] w-9 h-9 text-[15px] flex items-center justify-center"
        : "inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        sp.toggle(id, label, text);
      }}
      className={`${base} ${className}`}
      aria-label={playing ? `Pause: ${label}` : paused ? `Resume: ${label}` : label}
      aria-pressed={active}
    >
      {content}
      {variant !== "icon" && active ? <span className="sr-only"> — {label}</span> : null}
    </button>
  );
}

export function SpeechBar() {
  const sp = useSpeech();
  if (!sp.supported || !sp.currentId) return null;
  return (
    <div
      className="fixed left-3 right-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] sm:left-auto sm:right-5 sm:w-[430px] rounded-[18px] bg-[var(--text)] text-[var(--bg)] shadow-2xl p-3.5"
      role="region"
      aria-label="Voice player"
    >
      <div className="flex items-start gap-3">
        <span className="text-[20px] leading-none mt-0.5" aria-hidden="true">
          {sp.status === "paused" ? "⏸" : "🔊"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-widest uppercase opacity-75">
            {sp.status === "paused" ? "Paused · Me2 Voice" : "Speaking · Me2 Voice (sp92)"}
          </p>
          <p className="text-sm font-semibold leading-snug truncate">{sp.currentLabel}</p>
        </div>
        <button
          onClick={() => sp.setEnabled(false)}
          className="text-[11px] underline opacity-80 shrink-0"
          aria-label="Turn off voice playback"
        >
          Mute
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={sp.pauseResume}
          className="flex-1 rounded-full bg-[var(--bg)] text-[var(--text)] py-2.5 text-sm font-semibold"
          aria-label={sp.status === "paused" ? "Resume reading" : "Pause reading"}
        >
          {sp.status === "paused" ? "▶ Resume" : "⏸ Pause"}
        </button>
        <button
          onClick={sp.stop}
          className="flex-1 rounded-full border border-[var(--bg)]/40 py-2.5 text-sm font-semibold"
          aria-label="Stop reading"
        >
          ■ Stop
        </button>
        <label className="flex items-center gap-1 text-[12px] shrink-0">
          <span className="sr-only">Voice speed</span>
          <select
            value={sp.rate}
            onChange={(e) => sp.setRate(Number(e.target.value))}
            className="rounded-full bg-[var(--bg)] text-[var(--text)] px-2.5 py-2.5 text-[12px] font-semibold"
            aria-label="Voice speed"
          >
            <option value={0.85}>0.85×</option>
            <option value={0.92}>0.92× (Me2)</option>
            <option value={1}>1×</option>
            <option value={1.15}>1.15×</option>
          </select>
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Voice Dictation & Conversation (SpeechRecognition + Me2 Voice Reply)
// ---------------------------------------------------------------------------

interface RecognitionResultItem {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionResultItem;
}
interface RecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: RecognitionResult;
  };
}
interface RecognitionErrorEvent {
  error: string;
}
interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoiceInput(options: {
  onTranscript: (chunk: string) => void;
  onCompleteTurn?: (fullSessionTranscript: string) => void;
}) {
  const sp = useSpeech();
  const ctor = getSpeechRecognitionCtor();
  const supported = Boolean(ctor);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<BrowserSpeechRecognition | null>(null);
  const sessionTranscriptRef = useRef("");
  const onTranscriptRef = useRef(options.onTranscript);
  const onCompleteTurnRef = useRef(options.onCompleteTurn);
  onTranscriptRef.current = options.onTranscript;
  onCompleteTurnRef.current = options.onCompleteTurn;

  const stop = useCallback(() => {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
    setInterimText("");
  }, []);

  const start = useCallback(() => {
    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition) {
      setError("Live voice dictation requires Chrome, Safari, or Edge.");
      return;
    }
    sp.stop();
    setError(null);
    sessionTranscriptRef.current = "";
    setInterimText("");
    try {
      const rec = new Recognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (event: RecognitionEvent) => {
        let interim = "";
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const res = event.results[i];
          if (!res || !res[0]) continue;
          if (res.isFinal) {
            finalChunk += res[0].transcript + " ";
          } else {
            interim += res[0].transcript;
          }
        }
        const cleanFinal = finalChunk.trim();
        if (cleanFinal) {
          sessionTranscriptRef.current = `${sessionTranscriptRef.current} ${cleanFinal}`.trim();
          onTranscriptRef.current(cleanFinal);
        }
        setInterimText(interim.trim());
      };
      rec.onerror = (event: RecognitionErrorEvent) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Microphone access was blocked. Allow microphone permission to use Live Voice.");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          setError(`Voice capture paused (${event.error}). Tap Speak to continue.`);
        }
        setListening(false);
        setInterimText("");
      };
      rec.onend = () => {
        setListening(false);
        setInterimText("");
        const captured = sessionTranscriptRef.current.trim();
        if (captured && onCompleteTurnRef.current) {
          onCompleteTurnRef.current(captured);
        }
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setError("Could not start microphone capture. Check browser permissions.");
      setListening(false);
    }
  }, [sp]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(
    () => () => {
      if (recRef.current) {
        try {
          recRef.current.stop();
        } catch {
          /* ignore */
        }
      }
    },
    [],
  );

  return { supported, listening, interimText, error, start, stop, toggle };
}

export function VoiceDictateBar({
  label = "Speak to write",
  onAppend,
  onSendTurn,
  showVoiceReplyToggle = false,
  replyPersona = "Higher Self",
}: {
  label?: string;
  onAppend: (text: string) => void;
  onSendTurn?: (spokenText: string) => void;
  showVoiceReplyToggle?: boolean;
  replyPersona?: string;
}) {
  const sp = useSpeech();
  const [autoSend, setAutoSend] = useState(Boolean(onSendTurn));
  const voice = useVoiceInput({
    onTranscript: (chunk) => onAppend(chunk),
    onCompleteTurn: (captured) => {
      if (autoSend && onSendTurn && captured.trim()) {
        onSendTurn(captured.trim());
      }
    },
  });

  return (
    <div className={`voice-bar ${voice.listening ? "listening" : ""}`} role="region" aria-label={label}>
      <div className="voice-bar-row">
        <button
          type="button"
          className={`voice-mic-btn ${voice.listening ? "active" : ""}`}
          onClick={voice.toggle}
          aria-pressed={voice.listening}
          aria-label={voice.listening ? "Stop voice dictation" : label}
        >
          <span className="voice-mic-icon" aria-hidden="true">
            {voice.listening ? "⏹" : "🎙"}
          </span>
          <span>
            {voice.listening ? (autoSend && onSendTurn ? "Done speaking · Send" : "Stop speaking") : label}
          </span>
        </button>

        <div className="voice-bar-chips">
          {onSendTurn && (
            <button
              type="button"
              className={`voice-toggle-chip ${autoSend ? "on" : ""}`}
              aria-pressed={autoSend}
              onClick={() => setAutoSend((v) => !v)}
              title="Automatically submit when you finish speaking"
            >
              {autoSend ? "Auto-send: On" : "Auto-send: Off"}
            </button>
          )}

          {showVoiceReplyToggle && sp.supported && (
            <button
              type="button"
              className={`voice-toggle-chip ${sp.voiceReply ? "on" : ""}`}
              aria-pressed={sp.voiceReply}
              onClick={() => sp.setVoiceReply(!sp.voiceReply)}
              title={`Automatically speak ${replyPersona} replies in your Me2 voice`}
            >
              {sp.voiceReply ? `🔊 ${replyPersona} (Me2 Voice): On` : `🔊 ${replyPersona} (Me2 Voice): Off`}
            </button>
          )}
        </div>
      </div>

      {voice.listening && (
        <p className="voice-interim" role="status" aria-live="polite">
          <b>Listening…</b> {voice.interimText || "Speak naturally — your words appear as you talk."}
        </p>
      )}
      {voice.error && (
        <p className="inline-error" role="alert">
          {voice.error}
        </p>
      )}
    </div>
  );
}

export function themeSpeechText(t: {
  name: string;
  domain: string;
  tagline: string;
  essence: string;
  atBest: string;
  watchOut: string;
  needs: string;
  partners: string[];
  ideas: string[];
}): string {
  return `${t.name}. ${t.domain}. ${t.tagline}. ${t.essence} Balcony, at its best: ${t.atBest} Basement, watch out: ${t.watchOut} What it needs to thrive: ${t.needs} Partners well with: ${t.partners.join(", ")}. Ideas for action: ${t.ideas.map((idea, i) => `${i + 1}. ${idea}`).join(" ")}`;
}
