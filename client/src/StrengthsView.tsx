import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { THEMES, DOMAIN_META, themeByName, ALL_NAMES, type Domain, type Theme } from "./strengthsThemes";
import { ASSESSMENT_QUESTIONS, buildStage1, buildStage2, consistencyReport, hybridRanking, BEHAVIOR_DIMS, type AnswerValue, type BehaviorRatings, type PlayQuestion } from "./strengthsAssessment";
import { SpeechProvider, SpeechBar, SpeakButton, useSpeech, themeSpeechText } from "./strengthsSpeech";

const DOMAINS: Domain[] = ["Executing", "Influencing", "Relationship Building", "Strategic Thinking"];

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase" style={{ color, background: bg }}>{label}</span>;
}

export function StrengthsView() {
  return (
    <SpeechProvider>
      <StrengthsInner />
      <SpeechBar />
    </SpeechProvider>
  );
}

function StrengthsInner() {
  const sp = useSpeech();
  const qc = useQueryClient();
  const stateQ = useQuery({ queryKey: ["state"], queryFn: () => api.getStrengthsState({}) });
  const topThemes: string[] = stateQ.data?.topThemes ?? [];
  const profileSource: string = stateQ.data?.source ?? "manual";
  const officialRanking: string[] = stateQ.data?.fullRanking ?? [];
  const locked = profileSource === "official";
  const reflections = stateQ.data?.reflections ?? [];
  const commitments = stateQ.data?.commitments ?? [];
  const assessments = stateQ.data?.assessments ?? [];

  const [filterDomain, setFilterDomain] = useState<Domain | "All">("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Theme | null>(null);
  const [tab, setTab] = useState<"assess" | "official" | "atlas" | "journal" | "aim">("assess");
  const [assessStage, setAssessStage] = useState<"intro" | "quiz" | "stage3" | "results">("intro");
  const [quizStage, setQuizStage] = useState<1 | 2>(1);
  const [qIndex, setQIndex] = useState(0);
  const [stage1Pairs] = useState<PlayQuestion[]>(() => buildStage1());
  const [stage1Answers, setStage1Answers] = useState<Record<string, AnswerValue>>({});
  const [stage2Pairs, setStage2Pairs] = useState<PlayQuestion[]>([]);
  const [stage2Answers, setStage2Answers] = useState<Record<string, AnswerValue>>({});
  const [contenders, setContenders] = useState<string[]>([]);
  const [behavior, setBehavior] = useState<Record<string, Partial<BehaviorRatings>>>({});
  const [bIndex, setBIndex] = useState(0);
  const [savedResultId, setSavedResultId] = useState<number | null>(null);
  const [officialTop, setOfficialTop] = useState<string[]>(["", "", "", "", ""]);
  const [officialFull, setOfficialFull] = useState("");
  const [officialMsg, setOfficialMsg] = useState("");
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [insight, setInsight] = useState<{ headline: string; body: string; blindSpot: string; thisWeekMove: string } | null>(null);
  const [reflTheme, setReflTheme] = useState("");
  const [reflBody, setReflBody] = useState("");
  const [reflKind, setReflKind] = useState("moment");
  const [commitTheme, setCommitTheme] = useState("");
  const [commitText, setCommitText] = useState("");

  const saveTop = useMutation({ mutationFn: (themes: string[]) => api.saveTopFive({ themes }), onSuccess: () => qc.invalidateQueries({ queryKey: ["state"] }) });
  const addRefl = useMutation({ mutationFn: () => api.addReflection({ themeName: reflTheme || topThemes[0] || "Achiever", body: reflBody, kind: reflKind }), onSuccess: () => { setReflBody(""); qc.invalidateQueries({ queryKey: ["state"] }); } });
  const delRefl = useMutation({ mutationFn: (id: number) => api.deleteReflection({ id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["state"] }) });
  const addCommit = useMutation({ mutationFn: () => api.addCommitment({ themeName: commitTheme || topThemes[0] || "Achiever", text: commitText }), onSuccess: () => { setCommitText(""); qc.invalidateQueries({ queryKey: ["state"] }); } });
  const toggleCommit = useMutation({ mutationFn: (v: { id: number; done: boolean }) => api.toggleCommitment(v), onSuccess: () => qc.invalidateQueries({ queryKey: ["state"] }) });
  const delCommit = useMutation({ mutationFn: (id: number) => api.deleteCommitment({ id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["state"] }) });
  const insightMut = useMutation({ mutationFn: () => api.generateInsight({ themes: topThemes }), onSuccess: (d) => setInsight(d) });
  const saveAssessMut = useMutation({
    mutationFn: (payload: { topThemes: string[]; scores: Record<string, number>; answers: number[] }) => api.saveAssessmentResult(payload),
    onSuccess: (d) => { setSavedResultId(d.id); qc.invalidateQueries({ queryKey: ["state"] }); },
  });
  const saveOfficialMut = useMutation({
    mutationFn: (payload: { topThemes: string[]; fullRanking: string[] }) => api.saveOfficialResults(payload),
    onSuccess: () => { setOfficialMsg("Saved. Your official Gallup results are now locked in as your Top 5 — the Atlas, journal, Aim It, insights, and Listen buttons all work from them."); qc.invalidateQueries({ queryKey: ["state"] }); },
    onError: () => setOfficialMsg("Saving failed — your entries are still on this screen. Try again."),
  });

  // Stop reading when the question/screen changes so the old statement doesn't keep playing
  useEffect(() => { sp.stop(); }, [qIndex, bIndex, quizStage, assessStage, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePairs = quizStage === 1 ? stage1Pairs : stage2Pairs;
  const activeAnswers = quizStage === 1 ? stage1Answers : stage2Answers;
  const currentQ = activePairs[qIndex];
  const activeAnswered = activePairs.filter(p => activeAnswers[p.key] !== undefined).length;
  const behaviorComplete = useMemo(() => {
    const out: Record<string, BehaviorRatings> = {};
    for (const [k, v] of Object.entries(behavior)) {
      if (v.frequency && v.ease && v.energy) out[k] = { frequency: v.frequency, ease: v.ease, energy: v.energy };
    }
    return out;
  }, [behavior]);
  const hybrid = useMemo(() => hybridRanking(stage1Pairs, stage1Answers, stage2Pairs, stage2Answers, behaviorComplete), [stage1Pairs, stage1Answers, stage2Pairs, stage2Answers, behaviorComplete]);
  const resultTop5 = useMemo(() => hybrid.slice(0, 5).map(s => s.theme), [hybrid]);
  const consistency = useMemo(() => consistencyReport(stage1Answers), [stage1Answers]);
  const bTheme = contenders[bIndex];
  const bThemeObj = bTheme ? themeByName(bTheme) : undefined;

  const startSorter = () => {
    setStage1Answers({}); setStage2Pairs([]); setStage2Answers({}); setContenders([]);
    setBehavior({}); setBIndex(0); setQIndex(0); setQuizStage(1); setSavedResultId(null); setAssessStage("quiz");
  };
  const answerCurrent = (v: AnswerValue) => {
    if (!currentQ) return;
    if (quizStage === 1) setStage1Answers(p => ({ ...p, [currentQ.key]: v }));
    else setStage2Answers(p => ({ ...p, [currentQ.key]: v }));
  };
  const nextQuestion = () => {
    if (qIndex < activePairs.length - 1) { setQIndex(qIndex + 1); return; }
    if (quizStage === 1) {
      const interim = hybridRanking(stage1Pairs, stage1Answers, [], {}, {});
      const top10 = interim.slice(0, 10).map(r => r.theme);
      setContenders(top10);
      setStage2Pairs(buildStage2(top10));
      setQuizStage(2); setQIndex(0);
    } else {
      setBIndex(0); setAssessStage("stage3");
    }
  };

  // 7-day proof check: real journal moments logged in the last 7 days, per Top 5 theme
  const proofCounts = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const m: Record<string, number> = {};
    for (const r of reflections) if (new Date(r.created_at).getTime() >= cutoff) m[r.themeName] = (m[r.themeName] || 0) + 1;
    return m;
  }, [reflections]);
  const unprovenThemes = topThemes.filter(n => (proofCounts[n] ?? 0) === 0);

  const parsedFull = useMemo(() => {
    const raw = officialFull.trim();
    if (!raw) return { names: [] as string[], error: "" };
    const parts = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    // Accept the legacy spelling "Ideational" and a hyphen-less "Self Assurance"
    // so a pasted ranking still matches the canonical theme names.
    const aliases: Record<string, string> = { "ideational": "Ideation", "self assurance": "Self-Assurance" };
    const names: string[] = []; const unknown: string[] = [];
    for (const p of parts) {
      const match = ALL_NAMES.find(n => n.toLowerCase() === p.toLowerCase()) ?? aliases[p.toLowerCase()];
      if (match) names.push(match); else unknown.push(p);
    }
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    let error = "";
    if (unknown.length) error = `Couldn't match: ${unknown.join(", ")}. Check the spelling against your Gallup report.`;
    else if (dupes.length) error = `Duplicates found: ${[...new Set(dupes)].join(", ")}. Each theme appears once in a full ranking.`;
    else if (names.length !== 34) error = `Found ${names.length} themes — a full ranking needs all 34. Leave the box empty to save just your Top 5.`;
    return { names, error };
  }, [officialFull]);
  const officialValid = officialTop.every(Boolean) && new Set(officialTop).size === 5 && !parsedFull.error;

  const domainCounts = useMemo(() => {
    const m: Record<string, number> = {};
    topThemes.forEach(n => { const t = themeByName(n); if (t) m[t.domain] = (m[t.domain] || 0) + 1; });
    return m;
  }, [topThemes]);

  const dominant = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const filtered = THEMES.filter(t => {
    if (filterDomain !== "All" && t.domain !== filterDomain) return false;
    if (search && !`${t.name} ${t.tagline} ${t.essence}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleTop = (name: string) => {
    if (locked) return; // official results are locked; unlock first (Official tab)
    if (topThemes.includes(name)) saveTop.mutate(topThemes.filter(x => x !== name));
    else if (topThemes.length < 5) saveTop.mutate([...topThemes, name]);
  };
  const moveTop = (idx: number, dir: -1 | 1) => {
    if (locked) return;
    const arr = [...topThemes]; const j = idx + dir; if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j]!, arr[idx]!]; saveTop.mutate(arr);
  };

  if (stateQ.isPending) return <div className="min-h-screen bg-[var(--bg)] p-6 text-[var(--text)]">Loading your strengths…</div>;

  return (
    <main className="page strengths-page">
      {/* Header — editorial intro, not a title bar */}
      <header className="strengths-masthead">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--dim)]">Based on StrengthsFinder 2.0 · CliftonStrengths</p>
        <h1 className="font-serif-d text-[34px] leading-[1.05] font-semibold mt-2">Do what you do best.<br /><span className="italic font-medium">On purpose.</span></h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--dim)]">The book's core idea is simple: you won't grow most by fixing what's weak. You'll grow by naming the talents you already have, claiming them with evidence, and aiming them at what matters — at work or in business, at school, at home with family, in creative projects, and in any team you lead or join. Two honest ways to get your Top 5: enter your <b className="text-[var(--text)]">official Gallup results</b> if you've taken the real CliftonStrengths (the gold path), or take this app's <b className="text-[var(--text)]">free 3-stage sorter</b> — a reflective preview inspired by the book's themes, not a Gallup score. Then claim and aim them here.</p>
        <div className="flex flex-wrap gap-2 mt-4 text-[12px]">
          <span className="rounded-full bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5"><b>1 · Name it</b> — official results or free sorter</span>
          <span className="rounded-full bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5"><b>2 · Claim it</b> — collect proof</span>
          <span className="rounded-full bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5"><b>3 · Aim it</b> — one move a week</span>
        </div>
        <button onClick={() => { setTab("assess"); setAssessStage("intro"); }} className="mt-4 w-full sm:w-auto rounded-full bg-[var(--text)] text-[var(--bg)] px-6 py-3.5 font-semibold text-sm" aria-label="Find your Top 5">
          {topThemes.length ? "↻ Your Top 5 paths — official entry or the free sorter" : "✦ Find your Top 5 — official entry or the free sorter"}
        </button>
        {/* Listen / text-to-speech controls */}
        <div className="mt-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-3.5 flex flex-wrap items-center gap-3" aria-label="Listen settings">
          <span className="text-[20px]" aria-hidden="true">🔊</span>
          <div className="flex-1 min-w-[180px]">
            <p className="text-sm font-semibold leading-tight">Listen instead of reading</p>
            <p className="text-[12px] text-[var(--dim)] leading-snug mt-0.5">{!sp.supported ? "Text to speech isn't supported in this browser — try Chrome, Safari, or Edge." : sp.enabled ? "Tap any Listen button to hear questions, themes, results, journal entries, and moves read aloud. Pause, resume, or stop from the player at the bottom." : "Text to speech is off. Turn it on to show Listen buttons across the app."}</p>
          </div>
          {sp.supported && (
            <button onClick={() => sp.setEnabled(!sp.enabled)} className={`rounded-full px-4 py-2.5 text-sm font-semibold ${sp.enabled ? "bg-[var(--text)] text-[var(--bg)]" : "border border-[var(--border)]"}`} aria-label={sp.enabled ? "Turn text to speech off" : "Turn text to speech on"} aria-pressed={sp.enabled}>
              {sp.enabled ? "Listening: On" : "Listening: Off"}
            </button>
          )}
          {sp.supported && sp.enabled && (
            <SpeakButton id="intro-overview" label="Listen to introduction" text="Do what you do best, on purpose. You won't grow most by fixing what's weak. You'll grow by naming the talents you already have, claiming them with evidence, and aiming them at what matters — at work or in business, at school, at home with family, in creative projects, and in any team you lead or join. Two honest ways to get your Top 5: enter your official Gallup results if you have taken the real CliftonStrengths — that is the gold path — or take this app's free 3-stage sorter, a reflective preview inspired by the book's themes. It is not a Gallup score. Then claim and aim your themes here." />
          )}
        </div>
        <p className="mt-3 text-[11px] text-[var(--dim)]">Unofficial companion written in original language. Not affiliated with Gallup, and the sorter here is not Gallup's assessment. Theme names are Gallup trademarks; descriptions and statements here are original paraphrases inspired by the book's themes, for personal reflection. For verified CliftonStrengths results, use the official code in the book or gallup.com — then enter them in the Official tab.</p>
      </header>

      <div className="strengths-stack">
        {/* TOP 5 */}
        <section aria-label="Your Top 5" className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif-d text-[22px] font-semibold leading-tight">Your Top 5</h2>
              <p className="text-sm text-[var(--dim)] mt-1">{topThemes.length === 0 ? "Enter your official Gallup results in the Official tab (gold path), take the free sorter, or add themes by hand from the Atlas." : dominant ? `You lead with ${dominant}. ${domainCounts[dominant]} of your 5 live there.` : ""}</p>
              {topThemes.length > 0 && (
                <p className="mt-2">
                  {locked
                    ? <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold bg-[#E2F3E8] text-[#1B7A4D]">✓ OFFICIAL — your Gallup CliftonStrengths results, locked in</span>
                    : profileSource === "sorter"
                      ? <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold bg-[var(--surface-alt)] text-[var(--dim)]">From the free sorter — a preview, not Gallup-verified</span>
                      : <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold bg-[var(--surface-alt)] text-[var(--dim)]">Set by hand</span>}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="rounded-full bg-[var(--surface-alt)] px-3 py-1 text-sm font-bold">{topThemes.length} / 5</span>
              {topThemes.length > 0 && <SpeakButton id="my-top5" label="Listen to my Top 5" text={`Your Top 5. ${topThemes.map((n, i) => { const t = themeByName(n); return `${i + 1}. ${n}. ${t ? t.tagline + ". " + t.essence : ""}`; }).join(" ")}`} />}
            </div>
          </div>

          {topThemes.length > 0 ? (
            <ol className="mt-4 space-y-2">
              {topThemes.map((name, i) => {
                const t = themeByName(name)!; const meta = DOMAIN_META[t.domain];
                return (
                  <li key={name} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3" style={{ background: meta.bg + "55" }}>
                    <span className="font-serif-d text-[26px] font-bold w-8 text-center" style={{ color: meta.color }}>{i + 1}</span>
                    <button className="flex-1 text-left" onClick={() => setSelected(t)} aria-label={`Open ${name} details`}>
                      <span className="font-semibold text-[16px]">{name}</span>
                      <span className="block text-[13px] text-[var(--dim)] leading-snug">{t.tagline}</span>
                    </button>
                    <SpeakButton variant="icon" id={`top5-${name}`} label={`Listen to ${name}`} text={`${name}. ${t.tagline}. ${t.essence}`} />
                    {!locked && (
                      <>
                        <div className="flex flex-col gap-1">
                          <button aria-label={`Move ${name} up`} onClick={() => moveTop(i, -1)} className="text-xs px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)]">↑</button>
                          <button aria-label={`Move ${name} down`} onClick={() => moveTop(i, 1)} className="text-xs px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)]">↓</button>
                        </div>
                        <button aria-label={`Remove ${name} from Top 5`} onClick={() => toggleTop(name)} className="text-sm px-2 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)]">✕</button>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--dim)]">
              <p>No Top 5 yet. If you've taken the real CliftonStrengths, enter those results — they're the accurate ones. Otherwise the free sorter gives you a reflective preview to start from.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => setTab("official")} className="rounded-full bg-[var(--text)] text-[var(--bg)] px-5 py-2.5 text-[13px] font-semibold" aria-label="Enter official Gallup results">Enter official results →</button>
                <button onClick={() => { setTab("assess"); setAssessStage("intro"); }} className="rounded-full border border-[var(--border)] px-5 py-2.5 text-[13px] font-semibold text-[var(--text)]" aria-label="Start the free sorter from Top 5 card">Start the free sorter</button>
              </div>
              <p className="mt-3 text-[12px]">Know yours already and just want to type them in by hand? Tap <b className="text-[var(--text)]">+ Top 5</b> on any theme in the Atlas.</p>
            </div>
          )}

          {locked && topThemes.length > 0 && (
            <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] p-4 text-sm leading-relaxed">
              <p><b>Locked to your official results.</b> Everything in this app — the Atlas, journal, Aim It, insights, and Listen buttons — works from these five, so nothing here drifts away from your real CliftonStrengths report.{officialRanking.length === 34 ? " Your full 34 ranking is saved in the Official tab." : ""}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => setTab("official")} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold" aria-label="View or update official results">View / update official results</button>
                <button onClick={() => { if (confirmUnlock) { saveTop.mutate(topThemes); setConfirmUnlock(false); } else setConfirmUnlock(true); }} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold" aria-label="Unlock Top 5 to edit by hand">
                  {confirmUnlock ? "Tap again to unlock — Top 5 stays, the Official lock comes off" : "Unlock to edit by hand"}
                </button>
              </div>
            </div>
          )}

          {/* Domain balance */}
          {topThemes.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--dim)] mb-2">Domain balance</p>
              <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
                {DOMAINS.map(d => (domainCounts[d] ? <div key={d} style={{ flex: domainCounts[d], background: DOMAIN_META[d].color }} /> : null))}
                {topThemes.length < 5 && <div style={{ flex: 5 - topThemes.length, background: "var(--border)" }} />}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-[var(--dim)]">
                {DOMAINS.map(d => <span key={d}><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: DOMAIN_META[d].color }} />{d}: {domainCounts[d] || 0}</span>)}
              </div>
              <button disabled={insightMut.isPending} onClick={() => insightMut.mutate()} className="mt-4 w-full rounded-full bg-[var(--text)] text-[var(--bg)] py-3 font-semibold text-sm disabled:opacity-50" aria-label="Generate insight for my Top 5">
                {insightMut.isPending ? "Reading your combination…" : insight ? "Regenerate my combination insight" : "✦ What does this combination mean?"}
              </button>
              {insight && (
                <div className="mt-3 rounded-2xl bg-[var(--surface-alt)] p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-serif-d text-[19px] font-semibold leading-snug">{insight.headline}</p>
                    <SpeakButton variant="icon" id="top5-insight" label="Listen to my combination insight" text={`${insight.headline}. ${insight.body} Watch out: ${insight.blindSpot} This week: ${insight.thisWeekMove}`} />
                  </div>
                  <p className="text-sm leading-relaxed">{insight.body}</p>
                  <p className="text-sm leading-relaxed"><b>Watch out:</b> {insight.blindSpot}</p>
                  <p className="text-sm leading-relaxed"><b>This week:</b> {insight.thisWeekMove}</p>
                  <SpeakButton id="top5-insight-full" label="Listen to insight" text={`${insight.headline}. ${insight.body} Watch out: ${insight.blindSpot} This week: ${insight.thisWeekMove}`} />
                </div>
              )}
              {insightMut.isError && <p className="text-sm text-[var(--pain)] mt-2">Insight couldn't be generated right now — your Top 5 is saved. Try again in a moment.</p>}
            </div>
          )}
        </section>

        {/* Tabs */}
        <div className="flex rounded-[20px] sm:rounded-full bg-[var(--surface)] border border-[var(--border)] p-1 flex-wrap" role="tablist" aria-label="Sections">
          {([["assess", "✦ Free Sorter"], ["official", "⭐ Official"], ["atlas", "34 Theme Atlas"], ["journal", `Journal${reflections.length ? ` (${reflections.length})` : ""}`], ["aim", `Aim It${commitments.length ? ` (${commitments.filter(c => !c.done).length} open)` : ""}`]] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 min-w-[42%] sm:min-w-0 rounded-full py-2.5 px-2 text-[13px] sm:text-sm font-semibold ${tab === k ? "bg-[var(--text)] text-[var(--bg)]" : "text-[var(--dim)]"}`}>{label}</button>
          ))}
        </div>

        {tab === "assess" && (
          <section aria-label="Strengths assessment" className="space-y-4">
            {assessStage === "intro" && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
                <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--dim)]">Free reflective sorter · Inspired by the book's themes</p>
                <h2 className="font-serif-d text-[26px] font-semibold leading-tight mt-2">Find your Top 5 — the free sorter</h2>
                <p className="text-sm text-[var(--dim)] mt-2 leading-relaxed">This is an <b className="text-[var(--text)]">original reflective sorter inspired by the 34 themes</b> in <i>StrengthsFinder 2.0</i>. It does not use Gallup's questions, Gallup's method, or Gallup's scoring, and its results are a <b className="text-[var(--text)]">preview for reflection — not Gallup-validated CliftonStrengths results</b>. It runs in three stages: a broad round gives every theme two scored matchups, then only the top 10 advance — the head-to-head round and the behavior checks exist to separate those contenders with far more evidence, so treat themes outside the top 10 as “not measured further,” not “proven weak.” For each pair, pick which statement sounds more like you — and how strongly. There are no right answers. Go with your first instinct.</p>
                <div className="grid sm:grid-cols-3 gap-2 mt-4 text-[13px]">
                  <div className="rounded-2xl bg-[var(--surface-alt)] p-3"><b>Stage 1 · Broad round</b><br /><span className="text-[var(--dim)]">38 pairs. Every theme gets two scored matchups; four pairs repeat unscored, purely to check how consistent your answers are. The top 10 advance.</span></div>
                  <div className="rounded-2xl bg-[var(--surface-alt)] p-3"><b>Stage 2 · Head to head</b><br /><span className="text-[var(--dim)]">Your top 10 contenders face each other directly, so close calls get settled by comparison, not luck.</span></div>
                  <div className="rounded-2xl bg-[var(--surface-alt)] p-3"><b>Stage 3 · Behavior checks</b><br /><span className="text-[var(--dim)]">Each contender is rated on how often it shows up, how natural it feels, and how much energy it gives. Then your ranked 34.</span></div>
                </div>
                <p className="text-[12px] text-[var(--dim)] mt-3">Total: about 12 minutes. Strongly / Mostly / Neutral for each pair — don't overthink.</p>
                <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
                  <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--dim)]">The four domains the themes fall into</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {DOMAINS.map(d => <div key={d} className="text-[13px]"><span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: DOMAIN_META[d].color }} /><b>{d}</b><span className="block text-[var(--dim)] text-[12px] leading-snug mt-0.5">{DOMAIN_META[d].desc}</span></div>)}
                  </div>
                </div>
                {assessments.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] p-4">
                    <p className="text-sm font-semibold">Your last sorter run — {new Date(assessments[0]!.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                    <p className="text-sm text-[var(--dim)] mt-1">Top 5: {assessments[0]!.topThemes.slice(0, 5).join(" · ")}</p>
                    {assessments.length > 1 && <p className="text-[12px] text-[var(--dim)] mt-1">{assessments.length} sorter runs saved. Retaking is useful after a big role or life change — your talents are stable, your awareness sharpens.</p>}
                  </div>
                )}
                <div className="mt-4"><SpeakButton variant="primary" id="assess-intro" label="Listen to sorter instructions" text="Find your Top 5 with the free sorter. This is a reflective preview inspired by the book's themes. It is not Gallup's assessment and does not use Gallup's method or scoring. Stage 1 is the broad round: 38 pairs of statements, and every theme gets two scored matchups. Four pairs repeat unscored, to check how consistent your answers are. Only the top 10 from this round advance. Stage 2: your top 10 contenders go head to head against each other. Stage 3: behavior checks — for each contender, how often it shows up in your real life, how natural it feels, and how much energy it gives you. For each pair, pick which statement sounds more like you, and how strongly: Strongly, Mostly, or Neutral. There are no right answers. Go with your first instinct. It takes about 12 minutes, and you will get your Top 5, your full ranking of all 34 themes, and your domain balance. You can listen to each question and each statement as you go." /></div>
                <button onClick={startSorter} className="mt-3 w-full rounded-full bg-[var(--text)] text-[var(--bg)] py-3.5 font-semibold text-sm" aria-label="Begin the free sorter">
                  {assessments.length ? "Retake the sorter" : "Begin Stage 1 — the broad round"}
                </button>
                {locked && <p className="text-[12px] text-[var(--dim)] mt-3 leading-relaxed">You have official Gallup results locked in. You can still run the sorter for curiosity — but saving its results would replace your official Top 5, and the app will warn you before that happens.</p>}
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm leading-relaxed">
                  <p><b>Have official results already?</b> Skip the sorter. Enter your Gallup Top 5 (and full 34, if you have it) and lock in the real thing.</p>
                  <button onClick={() => setTab("official")} className="mt-2 rounded-full bg-[var(--text)] text-[var(--bg)] px-5 py-2.5 text-[13px] font-semibold" aria-label="Go to official results entry">Enter official results →</button>
                </div>
                <p className="text-[11px] text-[var(--dim)] mt-3 leading-relaxed">An original reflective exercise inspired by the book's 34 themes and four domains, with all statements written in original language. Not Gallup's official CliftonStrengths instrument, and not a substitute for it.</p>
              </div>
            )}

            {assessStage === "quiz" && currentQ && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{quizStage === 1 ? "Stage 1 · Broad round" : "Stage 2 · Head to head"} — Q{qIndex + 1} <span className="font-normal text-[var(--dim)]">of {activePairs.length}</span></p>
                  <p className="text-[12px] text-[var(--dim)]">{activeAnswered} answered</p>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--surface-alt)] mt-3 overflow-hidden" role="progressbar" aria-valuenow={qIndex + 1} aria-valuemin={1} aria-valuemax={activePairs.length} aria-label="Sorter progress">
                  <div className="h-full rounded-full bg-[var(--text)] transition-all" style={{ width: `${((qIndex + 1) / activePairs.length) * 100}%` }} />
                </div>
                <p className="text-[13px] text-[var(--dim)] mt-4 leading-relaxed">{quizStage === 1 ? "Every theme gets two scored matchups in this round. A few pairs repeat later, unscored — they check how consistent your answers are. Only the top 10 advance to Stage 2." : "Your top 10 contenders from the broad round now face each other directly. This is where close calls get settled."}</p>
                <div className="mt-2">
                  <SpeakButton id={`stage${quizStage}-instructions`} label={`Listen to Stage ${quizStage} instructions`} text={quizStage === 1 ? "Stage 1, the broad round. Every theme gets two scored matchups. A few pairs repeat later, unscored, to check how consistent your answers are. Only the top 10 advance to Stage 2. For each pair, choose Strongly A, Mostly A, Neutral, Mostly B, or Strongly B." : "Stage 2, head to head. Your top 10 contenders from the broad round now face each other directly. Same choices: Strongly A, Mostly A, Neutral, Mostly B, or Strongly B."} />
                </div>
                <p className="text-center text-[13px] text-[var(--dim)] mt-5">Which sounds more like you?</p>
                <div className="flex justify-center mt-2">
                  <SpeakButton id={`q-${currentQ.key}-both`} label={`Listen to question ${qIndex + 1}`} text={`Question ${qIndex + 1} of ${activePairs.length}. Which sounds more like you? Statement A: ${currentQ.aText} Statement B: ${currentQ.bText} Choose Strongly A, Mostly A, Neutral, Mostly B, or Strongly B.`} />
                </div>

                <div className="grid gap-3 mt-3">
                  <div className={`rounded-[18px] border-2 p-4 ${(activeAnswers[currentQ.key] ?? 0) > 0 ? "border-[var(--text)] bg-[var(--surface-alt)]" : "border-[var(--border)]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--dim)]">Statement A</p>
                      <SpeakButton variant="icon" id={`q-${currentQ.key}-a`} label={`Listen to Statement A, question ${qIndex + 1}`} text={`Statement A: ${currentQ.aText}`} />
                    </div>
                    <p className="text-[15px] leading-relaxed mt-1.5 font-medium">“{currentQ.aText}”</p>
                  </div>
                  <div className={`rounded-[18px] border-2 p-4 ${(activeAnswers[currentQ.key] ?? 0) < 0 ? "border-[var(--text)] bg-[var(--surface-alt)]" : "border-[var(--border)]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--dim)]">Statement B</p>
                      <SpeakButton variant="icon" id={`q-${currentQ.key}-b`} label={`Listen to Statement B, question ${qIndex + 1}`} text={`Statement B: ${currentQ.bText}`} />
                    </div>
                    <p className="text-[15px] leading-relaxed mt-1.5 font-medium">“{currentQ.bText}”</p>
                  </div>
                </div>

                <div className="mt-5" role="radiogroup" aria-label="Choose how strongly each statement fits">
                  <div className="flex justify-between text-[11px] font-semibold text-[var(--dim)] px-1"><span>← A is me</span><span>Both / neither</span><span>B is me →</span></div>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {([
                      [2, "Strongly A"],
                      [1, "Mostly A"],
                      [0, "Neutral"],
                      [-1, "Mostly B"],
                      [-2, "Strongly B"],
                    ] as [AnswerValue, string][]).map(([val, label]) => (
                      <button key={label} role="radio" aria-checked={activeAnswers[currentQ.key] === val} aria-label={label} onClick={() => answerCurrent(val)}
                        className={`rounded-2xl py-3 px-1 text-[12px] font-bold border ${activeAnswers[currentQ.key] === val ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]" : "bg-[var(--surface)] border-[var(--border)]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button disabled={qIndex === 0 && quizStage === 1} onClick={() => { if (qIndex > 0) setQIndex(qIndex - 1); else { setQuizStage(1); setQIndex(stage1Pairs.length - 1); } }} className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold disabled:opacity-40" aria-label="Previous question">← Back</button>
                  {qIndex < activePairs.length - 1 ? (
                    <button disabled={activeAnswers[currentQ.key] === undefined} onClick={() => setQIndex(qIndex + 1)} className="flex-1 rounded-full bg-[var(--text)] text-[var(--bg)] py-3 font-semibold text-sm disabled:opacity-40" aria-label="Next question">Next →</button>
                  ) : (
                    <button disabled={activeAnswered < activePairs.length} onClick={nextQuestion} className="flex-1 rounded-full bg-[var(--text)] text-[var(--bg)] py-3 font-semibold text-sm disabled:opacity-40" aria-label={quizStage === 1 ? "Finish Stage 1" : "Finish Stage 2"}>
                      {activeAnswered < activePairs.length ? `Answer ${activePairs.length - activeAnswered} more to finish this stage` : quizStage === 1 ? "Finish Stage 1 → top 10 head to head" : "Finish Stage 2 → behavior checks"}
                    </button>
                  )}
                </div>
                <button onClick={() => setAssessStage("intro")} className="w-full text-[12px] text-[var(--dim)] underline mt-3" aria-label="Exit sorter">Exit — answers on this screen will be cleared</button>
              </div>
            )}

            {assessStage === "stage3" && bTheme && bThemeObj && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Stage 3 · Behavior check {bIndex + 1} <span className="font-normal text-[var(--dim)]">of {contenders.length}</span></p>
                  <p className="text-[12px] text-[var(--dim)]">Top 10 contenders</p>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--surface-alt)] mt-3 overflow-hidden" role="progressbar" aria-valuenow={bIndex + 1} aria-valuemin={1} aria-valuemax={contenders.length} aria-label="Behavior check progress">
                  <div className="h-full rounded-full bg-[var(--text)] transition-all" style={{ width: `${((bIndex + 1) / Math.max(contenders.length, 1)) * 100}%` }} />
                </div>
                <p className="text-[13px] text-[var(--dim)] mt-4 leading-relaxed">A theme can rank high because you admire it. This stage checks whether you actually live it. Answer from your last month, not your best intentions.</p>
                <div className="rounded-[18px] border border-[var(--border)] p-4 mt-3" style={{ background: DOMAIN_META[bThemeObj.domain].bg + "55" }}>
                  <h3 className="font-serif-d text-[26px] font-semibold leading-tight">{bTheme}</h3>
                  <p className="text-[13px] font-medium mt-0.5" style={{ color: DOMAIN_META[bThemeObj.domain].color }}>{bThemeObj.tagline}</p>
                  <p className="text-sm text-[var(--dim)] leading-relaxed mt-2">{bThemeObj.essence}</p>
                </div>
                <div className="mt-3">
                  <SpeakButton id={`behavior-${bTheme}`} label={`Listen to behavior check for ${bTheme}`} text={`${bTheme}. ${bThemeObj.tagline}. ${bThemeObj.essence} Three questions, each rated 1 to 5. ${BEHAVIOR_DIMS.map(d => `${d.label}. ${d.prompt(bTheme)} 1 means ${d.low}. 5 means ${d.high}.`).join(" ")}`} />
                </div>
                {BEHAVIOR_DIMS.map(d => {
                  const cur = behavior[bTheme]?.[d.key];
                  return (
                    <div key={d.key} className="mt-5">
                      <p className="text-sm font-semibold">{d.label}</p>
                      <p className="text-[13px] text-[var(--dim)] leading-snug mt-0.5">{d.prompt(bTheme)}</p>
                      <div className="flex justify-between text-[11px] font-semibold text-[var(--dim)] px-1 mt-2"><span>1 · {d.low}</span><span>5 · {d.high}</span></div>
                      <div className="grid grid-cols-5 gap-2 mt-1.5" role="radiogroup" aria-label={`${d.label} for ${bTheme}`}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} role="radio" aria-checked={cur === n} aria-label={`${d.label}: ${n} of 5`} onClick={() => setBehavior(prev => ({ ...prev, [bTheme]: { ...prev[bTheme], [d.key]: n } }))}
                            className={`rounded-2xl py-3 text-[14px] font-bold border ${cur === n ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]" : "bg-[var(--surface)] border-[var(--border)]"}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2 mt-6">
                  <button onClick={() => { if (bIndex > 0) setBIndex(bIndex - 1); else { setAssessStage("quiz"); setQuizStage(2); setQIndex(Math.max(stage2Pairs.length - 1, 0)); } }} className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold" aria-label="Previous behavior check">← Back</button>
                  {bIndex < contenders.length - 1 ? (
                    <button disabled={!behaviorComplete[bTheme]} onClick={() => setBIndex(bIndex + 1)} className="flex-1 rounded-full bg-[var(--text)] text-[var(--bg)] py-3 font-semibold text-sm disabled:opacity-40" aria-label="Next behavior check">Next contender →</button>
                  ) : (
                    <button disabled={!behaviorComplete[bTheme]} onClick={() => setAssessStage("results")} className="flex-1 rounded-full bg-[var(--text)] text-[var(--bg)] py-3 font-semibold text-sm disabled:opacity-40" aria-label="See my sorter results">See my sorter preview →</button>
                  )}
                </div>
                {!behaviorComplete[bTheme] && <p className="text-[12px] text-[var(--dim)] mt-3 text-center">Rate all three — how often, how natural, energy — to continue.</p>}
                <button onClick={() => setAssessStage("intro")} className="w-full text-[12px] text-[var(--dim)] underline mt-3" aria-label="Exit sorter from behavior checks">Exit — answers on this screen will be cleared</button>
              </div>
            )}

            {assessStage === "results" && (
              <div className="space-y-4">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
                  <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--dim)]">Sorter preview · Not Gallup-validated</p>
                  <h2 className="font-serif-d text-[28px] font-semibold leading-tight mt-2">Your Top 5 — preview</h2>
                  <p className="text-sm text-[var(--dim)] mt-1 leading-relaxed">These five patterns scored highest across the broad round, the head-to-head round, and the behavior checks. Read them in order — #1 is the lens you reach for first. Treat this as a strong starting read, not a verified result: for the real CliftonStrengths ranking, enter your official Gallup results in the Official tab. Tap any theme for its balcony, basement, and ideas for action.</p>
                  <div className="mt-3"><SpeakButton id="results-top5-all" label="Listen to my Top 5 preview" text={`Your Top 5 preview from the sorter. This is a reflective preview, not a Gallup result. ${hybrid.slice(0, 5).map((s, i) => { const t = themeByName(s.theme); return `${i + 1}. ${s.theme}. ${t ? t.tagline + ", " + t.domain + ". " + t.essence : ""}`; }).join(" ")}`} /></div>
                  <ol className="mt-4 space-y-2">
                    {hybrid.slice(0, 5).map((s, i) => {
                      const t = themeByName(s.theme)!; const meta = DOMAIN_META[t.domain];
                      return (
                        <li key={s.theme} className="flex items-center gap-2 rounded-2xl border border-[var(--border)] p-2" style={{ background: meta.bg + "66" }}>
                          <button onClick={() => setSelected(t)} className="flex-1 flex items-center gap-3 p-1.5 text-left" aria-label={`Open ${s.theme} result details`}>
                            <span className="font-serif-d text-[28px] font-bold w-8 text-center" style={{ color: meta.color }}>{i + 1}</span>
                            <span className="flex-1"><span className="font-semibold text-[16px]">{s.theme}</span><span className="block text-[13px] text-[var(--dim)] leading-snug">{t.tagline} · {t.domain}</span><span className="block text-[11px] text-[var(--dim)] mt-0.5">Broad {s.stage1} · Head-to-head {s.stage2} · Behavior {s.behaviorBonus >= 0 ? "+" : ""}{s.behaviorBonus}</span></span>
                            <span className="text-[12px] font-bold rounded-full bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1">Score {s.score}</span>
                          </button>
                          <SpeakButton variant="icon" id={`result-${s.theme}`} label={`Listen to ${s.theme} result`} text={`${i + 1}. ${s.theme}. ${t.tagline}. ${t.domain}. ${t.essence}`} />
                        </li>
                      );
                    })}
                  </ol>

                  <div className="mt-4">
                    <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--dim)] mb-2">Domain balance — your Top 5</p>
                    <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
                      {DOMAINS.map(d => {
                        const n = resultTop5.map(nm => themeByName(nm)).filter(t => t?.domain === d).length;
                        return n ? <div key={d} style={{ flex: n, background: DOMAIN_META[d].color }} /> : null;
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-[var(--dim)]">
                      {DOMAINS.map(d => <span key={d}><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: DOMAIN_META[d].color }} />{d}: {resultTop5.map(nm => themeByName(nm)).filter(t => t?.domain === d).length}</span>)}
                    </div>
                  </div>

                  {locked && !savedResultId && <p className="text-[13px] text-[var(--dim)] mt-4 leading-relaxed rounded-2xl border border-dashed border-[var(--border)] p-3">⚠ You have <b className="text-[var(--text)]">official Gallup results</b> locked in. Saving this preview would replace them as your Top 5 and remove the Official lock. Only save if you mean to do that.</p>}
                  {savedResultId ? (
                    <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] p-4 text-sm"><b>Saved.</b> This preview is now your Top 5 at the top of the page. Next: run the <b>7-day proof check</b> — log real moments in <button className="underline font-semibold" onClick={() => setTab("journal")} aria-label="Go to journal from results">Claim It</button> and let a week of evidence confirm or challenge this ranking. Or set a move in <button className="underline font-semibold" onClick={() => setTab("aim")} aria-label="Go to Aim It from results">Aim It</button>.</div>
                  ) : (
                    <button disabled={saveAssessMut.isPending} onClick={() => saveAssessMut.mutate({ topThemes: resultTop5, scores: Object.fromEntries(hybrid.map(s => [s.theme, s.score])), answers: ASSESSMENT_QUESTIONS.map(q => stage1Answers[`s1-${q.id}`] ?? 0) })} className="mt-4 w-full rounded-full bg-[var(--text)] text-[var(--bg)] py-3.5 font-semibold text-sm disabled:opacity-50" aria-label="Save sorter preview as my Top 5">
                      {saveAssessMut.isPending ? "Saving…" : locked ? "Replace my official Top 5 with this preview" : "Save preview as my Top 5"}
                    </button>
                  )}
                  {saveAssessMut.isError && <p className="text-sm text-[var(--pain)] mt-2">Saving failed — your results are still on this screen. Try Save again.</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={startSorter} className="flex-1 rounded-full border border-[var(--border)] py-3 text-sm font-semibold" aria-label="Retake sorter">Retake</button>
                    <button onClick={() => setTab("atlas")} className="flex-1 rounded-full border border-[var(--border)] py-3 text-sm font-semibold" aria-label="Explore all themes from results">Explore all 34 →</button>
                  </div>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif-d text-[20px] font-semibold">Consistency check</h3>
                    <SpeakButton variant="icon" id="results-consistency" label="Listen to consistency check" text={consistency.checked ? `Consistency check. ${consistency.consistent} of your ${consistency.checked} repeated pairs matched your first answer. ${consistency.flippedThemes.length ? `You flipped toward ${consistency.flippedThemes.join(", ")} on a repeat — hold those themes a little loosely until real-life proof settles them.` : "No contradictions found."}` : "Consistency check. No repeated pairs were answered, so there is nothing to compare."} />
                  </div>
                  {consistency.checked > 0 ? (
                    <>
                      <p className="text-sm leading-relaxed mt-1"><b>{consistency.consistent} of {consistency.checked}</b> repeated pairs matched your first answer{consistency.consistent === consistency.checked ? " — you answered steadily, which makes this preview more trustworthy." : "."}</p>
                      <div className="flex gap-1.5 mt-3" aria-hidden="true">
                        {Array.from({ length: consistency.checked }).map((_, i) => <span key={i} className="h-2.5 flex-1 rounded-full" style={{ background: i < consistency.consistent ? "#1B7A4D" : "#C0392B" }} />)}
                      </div>
                      {consistency.flippedThemes.length > 0 && <p className="text-sm text-[var(--dim)] leading-relaxed mt-3">On a repeat, you flipped toward <b className="text-[var(--text)]">{consistency.flippedThemes.join(", ")}</b>. That's not a failure — it usually means two real patterns are close, or one answer was aspirational. The 7-day proof check in your journal is what settles it: themes you actually live leave evidence.</p>}
                    </>
                  ) : <p className="text-sm text-[var(--dim)] mt-1">No repeated pairs were answered, so there is nothing to compare.</p>}
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
                  <h3 className="font-serif-d text-[20px] font-semibold">Your full ranking — all 34</h3>
                  <p className="text-[13px] text-[var(--dim)] mt-1 leading-relaxed">The book’s point isn’t that your bottom themes are flaws — it’s that you grow fastest by investing in the top. Use the bottom of this list to know what to partner for or systematize, not to fix yourself.</p>
                  <div className="mt-3"><SpeakButton id="results-full-ranking" label="Listen to full ranking" text={`Your full sorter ranking, a preview only. ${hybrid.map((s, i) => `${i + 1}. ${s.theme}`).join(". ")}`} /></div>
                  <ol className="mt-3 space-y-1.5">
                    {hybrid.map((s, i) => {
                      const t = themeByName(s.theme)!; const meta = DOMAIN_META[t.domain]; const max = Math.max(...hybrid.map(x => x.score), 1);
                      return (
                        <li key={s.theme} className="flex items-center gap-1">
                          <button onClick={() => setSelected(t)} className="flex-1 flex items-center gap-3 py-1.5 text-left" aria-label={`Rank ${i + 1}: ${s.theme}, score ${s.score}`}>
                            <span className="text-[12px] font-bold text-[var(--dim)] w-6 text-right">{i + 1}</span>
                            <span className="w-[118px] shrink-0 text-[13px] font-semibold truncate">{s.theme}</span>
                            <span className="flex-1 h-2.5 rounded-full bg-[var(--surface-alt)] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${(s.score / max) * 100}%`, background: meta.color }} /></span>
                            <span className="text-[12px] text-[var(--dim)] w-8">{s.score}</span>
                          </button>
                          <SpeakButton variant="icon" id={`rank-${s.theme}`} label={`Listen to ${s.theme}`} text={`${s.theme}. Rank ${i + 1}. ${t.tagline}. ${t.essence}`} />
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "official" && (
          <section aria-label="Official Gallup results" className="space-y-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--dim)]">The gold path · Your real results</p>
              <h2 className="font-serif-d text-[26px] font-semibold leading-tight mt-2">Enter your official Gallup results</h2>
              <p className="text-sm text-[var(--dim)] mt-2 leading-relaxed">No sorter — free or paid — can match Gallup's own instrument. If you've taken the real CliftonStrengths, enter the results here. They're marked <b className="text-[var(--text)]">Official</b> and locked in as your true Top 5: the Atlas, Claim It journal, Aim It board, combination insight, and every Listen button then work from your real results.</p>
              <div className="mt-3"><SpeakButton variant="primary" id="official-intro" label="Listen to official results instructions" text="Enter your official Gallup results. This is the gold path: your real results from the actual CliftonStrengths assessment. Step 1: take the official assessment if you have not yet. Every copy of the StrengthsFinder 2.0 book includes a unique access code for it, or you can buy the assessment or a Top 5 report from Gallup at gallup.com. Step 2: open your Gallup report and find your Top 5, in order. If you bought the full report, you also have your complete ranking of all 34. Step 3: enter your Top 5 below, in order, and paste your full 34 if you have it. This app is not Gallup and cannot verify entries, so type them exactly as your report shows. Once saved, your official results are locked in as your Top 5 everywhere in this app." /></div>
              <div className="grid sm:grid-cols-3 gap-2 mt-4 text-[13px]">
                <div className="rounded-2xl bg-[var(--surface-alt)] p-3"><b>1 · Take it</b><br /><span className="text-[var(--dim)]">Use the access code inside your <i>StrengthsFinder 2.0</i> book, or buy the assessment / a Top 5 report at gallup.com (search “CliftonStrengths”).</span></div>
                <div className="rounded-2xl bg-[var(--surface-alt)] p-3"><b>2 · Open your report</b><br /><span className="text-[var(--dim)]">Your Top 5 in order is in your Gallup account and report PDF. Bought the full unlock? Your complete 1–34 ranking is there too.</span></div>
                <div className="rounded-2xl bg-[var(--surface-alt)] p-3"><b>3 · Enter them here</b><br /><span className="text-[var(--dim)]">Pick your five in order below; paste the full 34 if you have it. This app isn't Gallup and can't verify entries — copy them exactly.</span></div>
              </div>

              {locked && (
                <div className="mt-4 rounded-2xl bg-[#E2F3E8] text-[#16213A] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">✓ Official results on file — locked in</p>
                    <SpeakButton variant="icon" id="official-current" label="Listen to my official Top 5" text={`Your official Gallup Top 5, locked in. ${topThemes.map((n, i) => `${i + 1}. ${n}`).join(". ")}${officialRanking.length === 34 ? " Your full 34 ranking is saved too." : ""}`} />
                  </div>
                  <p className="text-sm mt-1">{topThemes.map((n, i) => `${i + 1}. ${n}`).join("  ·  ")}</p>
                  <p className="text-[12px] text-[var(--dim)] mt-1">{officialRanking.length === 34 ? "Full 34 ranking saved — see it below." : "Top 5 only — add your full 34 any time by pasting it below and saving again."} To change the lock itself, use “Unlock to edit by hand” on the Top 5 card, or save corrected results below.</p>
                </div>
              )}

              <p className="text-xs font-bold tracking-wide uppercase text-[var(--dim)] mt-5 mb-1">Your official Top 5 — in order</p>
              <div className="space-y-2">
                {officialTop.map((val, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-serif-d text-[22px] font-bold w-7 text-center text-[var(--dim)]">{i + 1}</span>
                    <label htmlFor={`official-rank-${i + 1}`} className="sr-only">Official rank {i + 1}</label>
                    <select id={`official-rank-${i + 1}`} value={val} onChange={e => { const next = [...officialTop]; next[i] = e.target.value; setOfficialTop(next); setOfficialMsg(""); }} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
                      <option value="">Choose rank {i + 1}…</option>
                      {ALL_NAMES.map(n => <option key={n} value={n} disabled={n !== val && officialTop.includes(n)}>{n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {officialTop.every(Boolean) && new Set(officialTop).size !== 5 && <p className="text-[13px] text-[var(--pain)] mt-2">Each theme can only appear once — you have a duplicate.</p>}

              <label htmlFor="official-full" className="text-xs font-bold tracking-wide uppercase text-[var(--dim)] block mt-5 mb-1">Full 34 ranking (optional)</label>
              <textarea id="official-full" value={officialFull} onChange={e => { setOfficialFull(e.target.value); setOfficialMsg(""); }} rows={5} placeholder={"Paste your full ranking from your Gallup report — one theme per line, or separated by commas:\nAchiever\nResponsibility\nLearner\n…"} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none" />
              {officialFull.trim() && (parsedFull.error
                ? <p className="text-[13px] text-[var(--pain)] mt-1.5">{parsedFull.error}</p>
                : <p className="text-[13px] mt-1.5" style={{ color: "#1B7A4D" }}>✓ All 34 matched. First 5 from the list: {parsedFull.names.slice(0, 5).join(", ")}.</p>)}

              <button disabled={!officialValid || saveOfficialMut.isPending} onClick={() => saveOfficialMut.mutate({ topThemes: officialTop, fullRanking: parsedFull.names })} className="mt-4 w-full rounded-full bg-[var(--text)] text-[var(--bg)] py-3.5 font-semibold text-sm disabled:opacity-40" aria-label="Save official Gallup results">
                {saveOfficialMut.isPending ? "Saving…" : locked ? "Save corrected official results" : "Save & lock in my official results"}
              </button>
              {!officialValid && <p className="text-[12px] text-[var(--dim)] mt-2 text-center">Pick all five Top 5 themes (no duplicates) to save. The full 34 box can stay empty.</p>}
              {officialMsg && <p className="text-sm mt-3 rounded-2xl bg-[var(--surface-alt)] p-3 leading-relaxed">{officialMsg}</p>}
            </div>

            {officialRanking.length === 34 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
                <h3 className="font-serif-d text-[20px] font-semibold">Your official full 34</h3>
                <p className="text-[13px] text-[var(--dim)] mt-1 leading-relaxed">Straight from your Gallup report, as you entered it. Your bottom themes aren't flaws — they're what you partner for or systematize.</p>
                <div className="mt-3"><SpeakButton id="official-full-ranking" label="Listen to my official full ranking" text={`Your official full ranking of all 34. ${officialRanking.map((n, i) => `${i + 1}. ${n}`).join(". ")}`} /></div>
                <ol className="mt-3 space-y-1.5">
                  {officialRanking.map((n, i) => {
                    const t = themeByName(n); const meta = t ? DOMAIN_META[t.domain] : null;
                    return (
                      <li key={n} className="flex items-center gap-1">
                        <button onClick={() => t && setSelected(t)} className="flex-1 flex items-center gap-3 py-1.5 text-left" aria-label={`Official rank ${i + 1}: ${n}`}>
                          <span className="text-[12px] font-bold text-[var(--dim)] w-6 text-right">{i + 1}</span>
                          <span className="text-[13px] font-semibold">{n}</span>
                          {meta && <span className="text-[12px] text-[var(--dim)]">{t!.domain}</span>}
                          {i < 5 && <span className="text-[10px] font-bold rounded-full bg-[var(--text)] text-[var(--bg)] px-2 py-0.5">TOP 5</span>}
                        </button>
                        {t && <SpeakButton variant="icon" id={`official-rank-${n}`} label={`Listen to ${n}`} text={`${n}. Official rank ${i + 1}. ${t.tagline}. ${t.essence}`} />}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        )}

        {tab === "atlas" && (
          <section aria-label="Theme atlas">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {DOMAINS.map(d => (
                <div key={d} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <p className="font-serif-d font-semibold text-[15px]" style={{ color: DOMAIN_META[d].color }}>{d}</p>
                  <p className="text-[12px] text-[var(--dim)] leading-snug mt-0.5">{DOMAIN_META[d].desc}</p>
                </div>
              ))}
            </div>
            <label htmlFor="search" className="sr-only">Search themes</label>
            <input id="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search themes — try 'risk', 'people', 'future'…" className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none" />
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1" aria-label="Filter by domain">
              {(["All", ...DOMAINS] as const).map(d => (
                <button key={d} onClick={() => setFilterDomain(d)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold border ${filterDomain === d ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]" : "bg-[var(--surface)] border-[var(--border)]"}`} aria-label={`Filter ${d}`}>{d}</button>
              ))}
            </div>
            <p className="text-[12px] text-[var(--dim)] mt-2">{filtered.length} themes · Tap a card for balcony / basement, needs & ideas for action</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {filtered.map(t => {
                const meta = DOMAIN_META[t.domain]; const inTop = topThemes.includes(t.name); const rank = topThemes.indexOf(t.name);
                return (
                  <article key={t.name} className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Chip label={t.domain} color={meta.color} bg={meta.bg} />
                      <div className="flex items-center gap-1.5">
                        {inTop && <span className="text-[11px] font-bold rounded-full bg-[var(--text)] text-[var(--bg)] px-2 py-0.5">#{rank + 1} in your Top 5</span>}
                        <SpeakButton variant="icon" id={`atlas-${t.name}`} label={`Listen to ${t.name}`} text={themeSpeechText(t)} />
                      </div>
                    </div>
                    <button className="text-left mt-2" onClick={() => setSelected(t)} aria-label={`Open ${t.name} details`}>
                      <h3 className="font-serif-d text-[22px] font-semibold leading-tight">{t.name}</h3>
                      <p className="text-[13px] font-medium mt-0.5" style={{ color: meta.color }}>{t.tagline}</p>
                      <p className="text-sm text-[var(--dim)] leading-relaxed mt-2 line-clamp-3">{t.essence}</p>
                    </button>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                      <button onClick={() => setSelected(t)} className="flex-1 rounded-full border border-[var(--border)] py-2 text-[13px] font-semibold" aria-label={`Read more about ${t.name}`}>Read more</button>
                      <button onClick={() => toggleTop(t.name)} disabled={locked || (!inTop && topThemes.length >= 5)} className="flex-1 rounded-full py-2 text-[13px] font-semibold disabled:opacity-40" style={{ background: inTop ? "var(--surface-alt)" : meta.color, color: inTop ? "var(--text)" : "#fff" }} aria-label={locked ? `${t.name} — Top 5 locked to official results` : inTop ? `Remove ${t.name} from Top 5` : `Add ${t.name} to Top 5`}>{locked ? "🔒 Official" : inTop ? "Remove" : "+ Top 5"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
            {filtered.length === 0 && <p className="text-sm text-[var(--dim)] py-8 text-center">No themes match that search. Try a single word like “learn” or “fair”.</p>}
          </section>
        )}

        {tab === "journal" && (
          <section aria-label="Claim it journal" className="space-y-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-serif-d text-[22px] font-semibold">7-day proof check</h2>
                {topThemes.length > 0 && <SpeakButton variant="icon" id="proof-check" label="Listen to my 7-day proof check" text={`Your 7-day proof check. ${topThemes.map(n => `${n}: ${proofCounts[n] ?? 0} proof moment${(proofCounts[n] ?? 0) === 1 ? "" : "s"} logged in the last 7 days.`).join(" ")} ${unprovenThemes.length ? `Flagged with no proof yet: ${unprovenThemes.join(", ")}. Either watch harder this week and log what you catch, or question whether it earned the spot.` : "Every Top 5 theme has fresh proof. This is what claimed strengths look like."}`} />}
              </div>
              <p className="text-sm text-[var(--dim)] mt-1 leading-relaxed">Any ranking — sorter preview or strong hunch — can put a theme high because you admire it, not because you live it. Proof settles it: real moments from the last 7 days, logged below. One honest moment per theme per week is the standard.</p>
              {topThemes.length === 0 ? (
                <p className="text-sm mt-3 rounded-2xl bg-[var(--surface-alt)] p-3">Set your Top 5 first — enter official results or run the free sorter — and this check starts watching for proof.</p>
              ) : (
                <>
                  <ul className="mt-4 space-y-2">
                    {topThemes.map(name => {
                      const c = proofCounts[name] ?? 0;
                      const t = themeByName(name); const meta = t ? DOMAIN_META[t.domain] : null;
                      return (
                        <li key={name} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c === 0 ? "#C0392B" : "#1B7A4D" }} aria-hidden="true" />
                          <span className="flex-1 min-w-0">
                            <span className="text-sm font-semibold">{name}</span>
                            {meta && <span className="text-[12px] text-[var(--dim)]"> · {t!.domain}</span>}
                            <span className="block text-[12px] text-[var(--dim)]">{c === 0 ? "No proof moments in the last 7 days" : `${c} proof moment${c === 1 ? "" : "s"} in the last 7 days`}</span>
                          </span>
                          {c === 0
                            ? <span className="text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0" style={{ background: "#FDECEA", color: "#C0392B" }}>⚠ UNPROVEN</span>
                            : <span className="text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0" style={{ background: "#E2F3E8", color: "#1B7A4D" }}>✓ PROVEN</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {unprovenThemes.length > 0 ? (
                    <p className="text-sm mt-3 rounded-2xl bg-[var(--surface-alt)] p-3 leading-relaxed"><b>Flagged:</b> {unprovenThemes.join(", ")} — no real moments logged in 7 days. Two honest options: watch harder this week and log what you catch below, or question whether the theme earned its spot. A week of normal life is a fair test.</p>
                  ) : (
                    <p className="text-sm mt-3 rounded-2xl bg-[var(--surface-alt)] p-3 leading-relaxed"><b>All five proven.</b> Every Top 5 theme left evidence this week. That's what claimed strengths look like — keep the streak alive with one moment a day.</p>
                  )}
                  <div className="mt-3"><SpeakButton id="proof-check-full" label="Listen to proof check" text={`Your 7-day proof check. ${topThemes.map(n => `${n}: ${proofCounts[n] ?? 0} proof moments in the last 7 days.`).join(" ")} ${unprovenThemes.length ? `Flagged with no proof yet: ${unprovenThemes.join(", ")}.` : "Every theme has proof."}`} /></div>
                </>
              )}
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-serif-d text-[22px] font-semibold">Claim it — collect the proof</h2>
                <SpeakButton variant="icon" id="journal-intro" label="Listen to Claim it instructions" text="Claim it. Collect the proof. A talent only becomes a strength when you can point to moments it worked. Log one real moment: what happened, and which theme showed up. Small counts." />
              </div>
              <p className="text-sm text-[var(--dim)] mt-1 leading-relaxed">The book's turning point: a talent only becomes a strength when you can point to moments it worked. Log one real moment — what happened, which theme showed up. Small counts.</p>
              {reflections.length > 0 && <div className="mt-3"><SpeakButton id="journal-all" label="Listen to all journal entries" text={`Your journal. ${reflections.map(r => `${r.themeName}, ${r.kind}. ${r.body}`).join(" ")}`} /></div>}
              <label htmlFor="refl-theme" className="text-xs font-bold tracking-wide uppercase text-[var(--dim)] block mt-4 mb-1">Theme</label>
              <select id="refl-theme" value={reflTheme} onChange={e => setReflTheme(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
                <option value="">Choose — defaults to your #1</option>
                {THEMES.map(t => <option key={t.name} value={t.name}>{t.name}{topThemes.includes(t.name) ? ` · #${topThemes.indexOf(t.name) + 1}` : ""}</option>)}
              </select>
              <label htmlFor="refl-kind" className="text-xs font-bold tracking-wide uppercase text-[var(--dim)] block mt-3 mb-1">Kind</label>
              <select id="refl-kind" value={reflKind} onChange={e => setReflKind(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
                <option value="moment">A moment it showed up</option>
                <option value="win">A win</option>
                <option value="learning">A learning / basement moment</option>
              </select>
              <label htmlFor="refl-body" className="text-xs font-bold tracking-wide uppercase text-[var(--dim)] block mt-3 mb-1">What happened?</label>
              <textarea id="refl-body" value={reflBody} onChange={e => setReflBody(e.target.value)} rows={3} placeholder="e.g. Responsibility: I stayed to fix the shared doc before handing it over broken — 20 minutes now saved the next person a week. Or Learner: I finally understood the chord change I have been drilling all month." className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none" />
              <button disabled={!reflBody.trim() || addRefl.isPending} onClick={() => addRefl.mutate()} className="mt-3 w-full rounded-full bg-[var(--text)] text-[var(--bg)] py-3 font-semibold text-sm disabled:opacity-40" aria-label="Save reflection">Save reflection</button>
            </div>
            {reflections.length === 0 ? <p className="text-sm text-[var(--dim)] text-center py-6">No reflections yet. Your first proof moment is the hardest — make it tiny and true.</p> : reflections.map(r => (
              <article key={r.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{r.themeName} <span className="font-normal text-[var(--dim)]">· {r.kind}</span></span>
                  <span className="text-[12px] text-[var(--dim)]">{new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <p className="text-sm leading-relaxed mt-1.5">{r.body}</p>
                <div className="flex items-center gap-3 mt-2">
                  <SpeakButton id={`reflection-${r.id}`} label={`Listen to reflection for ${r.themeName}`} text={`${r.themeName}, ${r.kind}. ${r.body}`} />
                  <button onClick={() => delRefl.mutate(r.id)} className="text-[12px] text-[var(--dim)] underline" aria-label={`Delete reflection for ${r.themeName}`}>Delete</button>
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === "aim" && (
          <section aria-label="Aim it commitments" className="space-y-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-serif-d text-[22px] font-semibold">Aim it — one move this week</h2>
                <SpeakButton variant="icon" id="aim-intro" label="Listen to Aim it instructions" text="Aim it. One move this week. Strengths grow when aimed at a real outcome. Pick a theme, write one small, finishable move, and check it off." />
              </div>
              <p className="text-sm text-[var(--dim)] mt-1 leading-relaxed">Strengths grow when aimed at a real outcome. Pick a theme, write one small, finishable move, and check it off. Use the “Ideas for action” inside any theme card if you're stuck.</p>
              {commitments.length > 0 && <div className="mt-3"><SpeakButton id="aim-all" label="Listen to all my moves" text={`Your moves. ${commitments.map(c => `${c.themeName}: ${c.text}. ${c.done ? "Done." : "Still open."}`).join(" ")}`} /></div>}
              <label htmlFor="commit-theme" className="text-xs font-bold tracking-wide uppercase text-[var(--dim)] block mt-4 mb-1">Theme to aim</label>
              <select id="commit-theme" value={commitTheme} onChange={e => setCommitTheme(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
                <option value="">Choose — defaults to your #1</option>
                {THEMES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
              <label htmlFor="commit-text" className="text-xs font-bold tracking-wide uppercase text-[var(--dim)] block mt-3 mb-1">My move</label>
              <input id="commit-text" value={commitText} onChange={e => setCommitText(e.target.value)} placeholder="e.g. Learner: finish module 2 and teach one idea to Sam by Friday · Empathy: call Mum and just listen · Ideation: sketch three angles for the story opening" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none" />
              <button disabled={!commitText.trim() || addCommit.isPending} onClick={() => addCommit.mutate()} className="mt-3 w-full rounded-full bg-[var(--text)] text-[var(--bg)] py-3 font-semibold text-sm disabled:opacity-40" aria-label="Add commitment">Add this week's move</button>
            </div>
            {commitments.length === 0 ? <p className="text-sm text-[var(--dim)] text-center py-6">No moves yet. One small, aimed action beats ten good intentions.</p> : commitments.map(c => (
              <div key={c.id} className="flex items-start gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
                <input type="checkbox" checked={c.done} onChange={e => toggleCommit.mutate({ id: c.id, done: e.target.checked })} aria-label={`Mark ${c.text} done`} className="mt-1 w-5 h-5 accent-[#8fb400]" />
                <div className="flex-1">
                  <p className={`text-sm leading-relaxed ${c.done ? "line-through text-[var(--dim)]" : ""}`}><b>{c.themeName}:</b> {c.text}</p>
                  <p className="text-[12px] text-[var(--dim)] mt-0.5">{new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                </div>
                <SpeakButton variant="icon" id={`commit-${c.id}`} label={`Listen to move for ${c.themeName}`} text={`${c.themeName}: ${c.text}. ${c.done ? "Done." : "Still open."}`} />
                <button onClick={() => delCommit.mutate(c.id)} className="text-[var(--dim)] text-sm" aria-label={`Delete commitment ${c.text}`}>✕</button>
              </div>
            ))}
            <div className="rounded-[20px] bg-[var(--surface-alt)] p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif-d font-semibold text-[18px]">Balcony & basement — a 2-minute check</h3>
                <SpeakButton variant="icon" id="balcony-check" label="Listen to balcony and basement check" text="Balcony and basement, a 2 minute check. Every theme has a balcony, its best expression, and a basement, its overuse. Once a week ask: Where did my Top 5 lift the work, and where did one of them run too hot? Log the answer in your Journal as a learning." />
              </div>
              <p className="text-sm leading-relaxed mt-1 text-[var(--dim)]">Every theme has a balcony (its best expression) and a basement (its overuse). Once a week ask: <i className="text-[var(--text)]">Where did my Top 5 lift the work — and where did one of them run too hot?</i> Log the answer in your Journal as a “learning.” That honesty is what turns talent into strength.</p>
            </div>
          </section>
        )}

        <footer className="text-[12px] text-[var(--dim)] leading-relaxed pt-2">
          <p><b className="text-[var(--text)]">About the book:</b> <i>StrengthsFinder 2.0</i> by Tom Rath (Gallup Press, 2007) introduced millions to the CliftonStrengths assessment — 34 themes in four domains — with the argument that developing strengths yields faster growth than fixing weaknesses. The sorter in this app is an original reflective exercise inspired by the book's 34 themes and four domains. It does not use Gallup's method, questions, or scoring, and its results are a preview for reflection — not verified CliftonStrengths results. For the real thing, use the access code in the book or buy the assessment from Gallup, then enter your results in the Official tab.</p>
        </footer>
      </div>

      {/* Theme detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={`${selected.name} details`}>
          <div className="bg-[var(--surface)] w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] p-6">
            <div className="flex items-start justify-between gap-3">
              <Chip label={selected.domain} color={DOMAIN_META[selected.domain].color} bg={DOMAIN_META[selected.domain].bg} />
              <button onClick={() => { sp.stop(); setSelected(null); }} className="rounded-full border border-[var(--border)] w-9 h-9" aria-label="Close details">✕</button>
            </div>
            <h2 className="font-serif-d text-[32px] font-semibold leading-tight mt-3">{selected.name}</h2>
            <p className="font-medium" style={{ color: DOMAIN_META[selected.domain].color }}>{selected.tagline}</p>
            <p className="text-[15px] leading-relaxed mt-3">{selected.essence}</p>
            <div className="mt-4">
              <SpeakButton variant="primary" id={`detail-${selected.name}`} label={`Listen to full ${selected.name} details`} text={themeSpeechText(selected)} />
              <p className="text-[11px] text-[var(--dim)] mt-1.5 text-center">Reads name, description, balcony, basement, needs, partners & ideas for action</p>
            </div>
            <div className="grid gap-3 mt-5">
              <div className="rounded-2xl p-4" style={{ background: DOMAIN_META[selected.domain].bg }}>
                <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: DOMAIN_META[selected.domain].color }}>Balcony — at its best</p>
                <p className="text-sm leading-relaxed mt-1">{selected.atBest}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--dim)]">Basement — watch out</p>
                <p className="text-sm leading-relaxed mt-1">{selected.watchOut}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--dim)]">What it needs to thrive</p>
                <p className="text-sm leading-relaxed mt-1">{selected.needs}</p>
                <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--dim)] mt-3">Partners well with</p>
                <p className="text-sm mt-1">{selected.partners.join(" · ")}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--dim)]">Ideas for action</p>
                <ul className="mt-2 space-y-2">
                  {selected.ideas.map((idea, i) => <li key={i} className="flex gap-2 text-sm leading-relaxed"><span className="font-serif-d font-bold" style={{ color: DOMAIN_META[selected.domain].color }}>{i + 1}.</span>{idea}</li>)}
                </ul>
              </div>
            </div>
            {locked ? (
              <p className="mt-5 text-sm text-center rounded-2xl bg-[var(--surface-alt)] p-3 leading-relaxed">Your Top 5 is locked to your official Gallup results. Unlock it in the Official tab to edit by hand.</p>
            ) : (
              <button onClick={() => toggleTop(selected.name)} disabled={!topThemes.includes(selected.name) && topThemes.length >= 5} className="mt-5 w-full rounded-full py-3 font-semibold text-sm disabled:opacity-40" style={{ background: DOMAIN_META[selected.domain].color, color: "#fff" }} aria-label={topThemes.includes(selected.name) ? `Remove ${selected.name} from Top 5` : `Add ${selected.name} to Top 5`}>
                {topThemes.includes(selected.name) ? `Remove from my Top 5` : topThemes.length >= 5 ? "Top 5 is full — remove one first" : `Add ${selected.name} to my Top 5`}
              </button>
            )}
            <button onClick={() => { setReflTheme(selected.name); setTab("journal"); setSelected(null); }} className="mt-2 w-full rounded-full border border-[var(--border)] py-3 font-semibold text-sm" aria-label={`Log a moment for ${selected.name}`}>Log a moment for this theme →</button>
          </div>
        </div>
      )}
    </main>
  );
}
