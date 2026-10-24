import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type SpeechStatus = "idle" | "speaking" | "paused";

export interface SpeechController {
  supported: boolean;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  currentId: string | null;
  currentLabel: string;
  status: SpeechStatus;
  rate: number;
  setRate: (r: number) => void;
  speak: (id: string, label: string, text: string) => void;
  toggle: (id: string, label: string, text: string) => void;
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
  // Split into sentences, then pack into <=240 char chunks (avoids long-utterance cutoffs)
  const sentences = clean.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if ((cur + " " + t).trim().length > 240 && cur) { chunks.push(cur.trim()); cur = t; }
    else cur = (cur + " " + t).trim();
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try { return localStorage.getItem("strengths-tts-enabled") !== "off"; } catch { return true; }
  });
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentLabel, setCurrentLabel] = useState("");
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [rate, setRateState] = useState(1);
  const idRef = useRef<string | null>(null);
  const rateRef = useRef(1);
  rateRef.current = rate;

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    idRef.current = null;
    setCurrentId(null); setCurrentLabel(""); setStatus("idle");
  }, [supported]);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem("strengths-tts-enabled", v ? "on" : "off"); } catch { /* ignore */ }
    if (!v) stop();
  }, [stop]);

  const setRate = useCallback((r: number) => { setRateState(r); }, []);

  const speak = useCallback((id: string, label: string, text: string) => {
    if (!supported || !enabled) return;
    window.speechSynthesis.cancel();
    const chunks = chunkText(text);
    if (!chunks.length) return;
    idRef.current = id;
    setCurrentId(id); setCurrentLabel(label); setStatus("speaking");
    chunks.forEach((chunk, idx) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.rate = rateRef.current;
      u.lang = "en-US";
      const voices = window.speechSynthesis.getVoices();
      const en = voices.find(v => v.lang.startsWith("en") && v.default) ?? voices.find(v => v.lang.startsWith("en"));
      if (en) u.voice = en;
      if (idx === chunks.length - 1) {
        u.onend = () => { if (idRef.current === id) { idRef.current = null; setCurrentId(null); setCurrentLabel(""); setStatus("idle"); } };
        u.onerror = () => { if (idRef.current === id) { idRef.current = null; setCurrentId(null); setCurrentLabel(""); setStatus("idle"); } };
      }
      window.speechSynthesis.speak(u);
    });
  }, [supported, enabled]);

  const pauseResume = useCallback(() => {
    if (!supported || !currentId) return;
    if (status === "speaking") { window.speechSynthesis.pause(); setStatus("paused"); }
    else if (status === "paused") { window.speechSynthesis.resume(); setStatus("speaking"); }
  }, [supported, currentId, status]);

  const toggle = useCallback((id: string, label: string, text: string) => {
    if (currentId === id) {
      if (status === "speaking" || status === "paused") { pauseResume(); return; }
    }
    speak(id, label, text);
  }, [currentId, status, pauseResume, speak]);

  // Stop speaking when provider unmounts
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  const value: SpeechController = {
    supported, enabled, setEnabled, currentId, currentLabel, status, rate, setRate,
    speak, toggle, pauseResume, stop, isActive: (id) => currentId === id,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function SpeakButton({ id, label, text, variant = "small", className = "" }: {
  id: string;
  label: string; // accessible label, e.g. "Listen to Achiever"
  text: string;
  variant?: "primary" | "small" | "icon";
  className?: string;
}) {
  const sp = useSpeech();
  if (!sp.supported || !sp.enabled) return null;
  const active = sp.isActive(id);
  const paused = active && sp.status === "paused";
  const playing = active && sp.status === "speaking";
  const content = variant === "icon" ? (paused ? "▶" : playing ? "⏸" : "🔊") : playing ? "⏸ Pause" : paused ? "▶ Resume" : "🔊 Listen";
  const base = variant === "primary"
    ? "w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-3 font-semibold text-sm"
    : variant === "icon"
      ? "shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] w-9 h-9 text-[15px] flex items-center justify-center"
      : "inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold";
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); sp.toggle(id, label, text); }} className={`${base} ${className}`} aria-label={playing ? `Pause: ${label}` : paused ? `Resume: ${label}` : label} aria-pressed={active}>
      {content}{variant !== "icon" && active ? <span className="sr-only"> — {label}</span> : null}
    </button>
  );
}

export function SpeechBar() {
  const sp = useSpeech();
  if (!sp.supported || !sp.currentId) return null;
  return (
    <div className="fixed left-3 right-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] sm:left-auto sm:right-5 sm:w-[420px] rounded-[18px] bg-[var(--text)] text-[var(--bg)] shadow-2xl p-3.5" role="region" aria-label="Text to speech player">
      <div className="flex items-start gap-3">
        <span className="text-[20px] leading-none mt-0.5" aria-hidden="true">{sp.status === "paused" ? "⏸" : "🔊"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-widest uppercase opacity-70">{sp.status === "paused" ? "Paused" : "Now reading aloud"}</p>
          <p className="text-sm font-semibold leading-snug truncate">{sp.currentLabel}</p>
        </div>
        <button onClick={() => sp.setEnabled(false)} className="text-[11px] underline opacity-80 shrink-0" aria-label="Turn off text to speech">Turn off</button>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={sp.pauseResume} className="flex-1 rounded-full bg-[var(--bg)] text-[var(--text)] py-2.5 text-sm font-semibold" aria-label={sp.status === "paused" ? "Resume reading" : "Pause reading"}>
          {sp.status === "paused" ? "▶ Resume" : "⏸ Pause"}
        </button>
        <button onClick={sp.stop} className="flex-1 rounded-full border border-[var(--bg)]/40 py-2.5 text-sm font-semibold" aria-label="Stop reading">■ Stop</button>
        <label className="flex items-center gap-1 text-[12px] shrink-0">
          <span className="sr-only">Reading speed</span>
          <select value={sp.rate} onChange={e => sp.setRate(Number(e.target.value))} className="rounded-full bg-[var(--bg)] text-[var(--text)] px-2 py-2.5 text-[12px] font-semibold" aria-label="Reading speed — applies to the next Listen">
            <option value={0.85}>0.85×</option>
            <option value={1}>1×</option>
            <option value={1.15}>1.15×</option>
            <option value={1.3}>1.3×</option>
          </select>
        </label>
      </div>
      <p className="text-[11px] opacity-70 mt-2">Speed applies the next time you press Listen. Pause / Stop work right away.</p>
    </div>
  );
}

export function themeSpeechText(t: { name: string; domain: string; tagline: string; essence: string; atBest: string; watchOut: string; needs: string; partners: string[]; ideas: string[] }): string {
  return `${t.name}. ${t.domain}. ${t.tagline}. ${t.essence} Balcony, at its best: ${t.atBest} Basement, watch out: ${t.watchOut} What it needs to thrive: ${t.needs} Partners well with: ${t.partners.join(", ")}. Ideas for action: ${t.ideas.map((idea, i) => `${i + 1}. ${idea}`).join(" ")}`;
}
