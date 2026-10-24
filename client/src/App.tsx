import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";
import { DeciderSection, HigherSelfView } from "./HigherSelfView";
import { AppNavigation } from "./components/AppNavigation";
import { TodayOverview } from "./components/TodayOverview";

type AppState = ApiResponse<typeof api, "getAppState">;
type FocusState = ApiResponse<typeof api, "getFocusState">;
type SessionType = "full_body" | "upper" | "lower" | "session_a" | "session_b" | "aerobic";
type Exercise = AppState["program"]["session_a"][number];
type DraftSet = { weight: string; reps: string; rpe: string; completed: boolean; missed: boolean };
type DraftExercise = { name: string; pain: boolean; sets: DraftSet[] };
type StoredSessionDraft = { requestId: string; sessionType: SessionType; exercises: DraftExercise[] };
export type Tab = "focus" | "train" | "history" | "trends" | "higher";
type RitualKey = "sunlight" | "meditation" | "visualization" | "chewingGum" | "oneFootStand";

const ritualMeta: Array<{ key: RitualKey; title: string; detail: string }> = [
  { key: "sunlight", title: "Morning sunlight", detail: "5–10 min outdoors · no sunglasses" },
  { key: "meditation", title: "Meditation", detail: "10 min seated · breath focus" },
  { key: "visualization", title: "Visualization", detail: "5 min · next workout + strength goals" },
  { key: "chewingGum", title: "Chewing gum", detail: "Morning routine · chew gum after you get up" },
  { key: "oneFootStand", title: "Stand on one foot", detail: "Balance · 30s per side · near a wall for support" },
];

function localDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function makeDraft(program: Exercise[], recommendations: AppState["upcoming"]): DraftExercise[] {
  return program.map((exercise) => {
    const recommended = recommendations?.recommendations.find((item) => item.name === exercise.name)?.weight;
    const startWeight = recommended ?? exercise.startingLoad;
    return {
      name: exercise.name,
      pain: false,
      sets: Array.from({ length: exercise.sets }, () => ({ weight: exercise.weighted ? (startWeight == null ? "" : String(startWeight)) : "0", reps: "", rpe: "", completed: false, missed: false })),
    };
  });
}

function draftStorageKey(sessionType: SessionType): string {
  return `workout-log:draft:${sessionType}`;
}

function isDraftSet(value: unknown): value is DraftSet {
  if (!value || typeof value !== "object") return false;
  const set = value as Record<string, unknown>;
  return typeof set.weight === "string" && typeof set.reps === "string" && typeof set.rpe === "string" && typeof set.completed === "boolean" && typeof set.missed === "boolean";
}

function readStoredDraft(sessionType: SessionType, program: Exercise[], recommendations: AppState["upcoming"]): StoredSessionDraft {
  const fallback = { requestId: crypto.randomUUID(), sessionType, exercises: makeDraft(program, recommendations) };
  try {
    const raw = localStorage.getItem(draftStorageKey(sessionType));
    if (!raw) return fallback;
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return fallback;
    const candidate = value as Record<string, unknown>;
    if (candidate.sessionType !== sessionType || typeof candidate.requestId !== "string" || !Array.isArray(candidate.exercises)) return fallback;
    const exercises = candidate.exercises;
    const matchesProgram = exercises.length === program.length && exercises.every((item, index) => {
      if (!item || typeof item !== "object") return false;
      const exercise = item as Record<string, unknown>;
      const definition = program[index];
      return Boolean(definition && exercise.name === definition.name && typeof exercise.pain === "boolean" && Array.isArray(exercise.sets) && exercise.sets.length === definition.sets && exercise.sets.every(isDraftSet));
    });
    return matchesProgram ? candidate as StoredSessionDraft : fallback;
  } catch {
    return fallback;
  }
}

function formatSession(type: SessionType): string {
  if (type === "full_body") return "FULL BODY PRIMER";
  if (type === "session_a") return "SESSION A";
  if (type === "session_b") return "SESSION B";
  if (type === "aerobic") return "AEROBIC DAY";
  return type === "upper" ? "UPPER A" : "LOWER B";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function dateKeyFromInstant(value: string): string {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function CheckMark({ checked }: { checked: boolean }) {
  return <span aria-hidden="true" className={`checkmark ${checked ? "checked" : ""}`}>{checked ? "✓" : ""}</span>;
}

function RitualsCard({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { ritual: RitualKey; completed: boolean }) => api.setDailyRitual({ dateKey, ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] }),
  });
  return (
    <section className="ritual-card" aria-labelledby="ritual-heading">
      <div className="section-line">
        <div>
          <p className="eyebrow">Every day · rest days count</p>
          <h2 id="ritual-heading">Daily rituals</h2>
        </div>
        <span className="ritual-total">{ritualMeta.filter((ritual) => state.rituals.today[ritual.key]).length}/{ritualMeta.length}</span>
      </div>
      <div className="ritual-list">
        {ritualMeta.map((ritual) => {
          const complete = state.rituals.today[ritual.key];
          const streak = state.rituals.streaks[ritual.key];
          return (
            <button
              className={`ritual-row ${complete ? "complete" : ""}`}
              key={ritual.key}
              onClick={() => mutation.mutate({ ritual: ritual.key, completed: !complete })}
              disabled={mutation.isPending}
              aria-pressed={complete}
              aria-label={`${complete ? "Uncheck" : "Check"} ${ritual.title}`}
            >
              <CheckMark checked={complete} />
              <span className="ritual-copy"><strong>{ritual.title}</strong><small>{ritual.detail}</small></span>
              <span className="streak"><b>{streak}</b><small>day streak</small></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function QuickCapture({ state, focus, dateKey, onCheckin }: { state: AppState; focus: FocusState | undefined; dateKey: string; onCheckin: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ tone: "ok" | "help" | "error"; message: string } | null>(null);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] }),
      queryClient.invalidateQueries({ queryKey: ["focus-state", dateKey] }),
    ]);
  };
  const ritualMutation = useMutation({
    mutationFn: (input: { ritual: RitualKey; completed: boolean }) => api.setDailyRitual({ dateKey, ...input }),
    onSuccess: refresh,
  });
  const startMutation = useMutation({
    mutationFn: () => api.startFrog({ dateKey }),
    onSuccess: async () => { setResult({ tone: "ok", message: "Frog started. Stay on it." }); await refresh(); },
  });
  const captureMutation = useMutation({
    mutationFn: (entry: string) => api.quickCapture({ dateKey, text: entry }),
    onSuccess: async (response) => {
      setResult({ tone: response.status === "saved" ? "ok" : response.status === "needs_input" ? "help" : "error", message: response.message });
      if (response.status === "saved") { setText(""); await refresh(); }
    },
    onError: () => setResult({ tone: "error", message: "Couldn’t capture that. Your words are still here." }),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entry = text.trim();
    if (entry && !captureMutation.isPending) captureMutation.mutate(entry);
  };
  const quickRituals: Array<{ key: RitualKey; label: string }> = [
    { key: "sunlight", label: "Sunlight" },
    { key: "meditation", label: "Meditated" },
    { key: "visualization", label: "Visualized" },
    { key: "chewingGum", label: "Chewing gum" },
    { key: "oneFootStand", label: "One-foot stand" },
  ];
  return <section className="quick-capture" aria-labelledby="capture-heading">
    <div className="capture-head"><div><p className="eyebrow">ONE TAP OR ONE LINE</p><h2 id="capture-heading">Capture it now</h2></div><button className="checkin-jump" type="button" onClick={onCheckin}>Check in</button></div>
    <div className="capture-chips" aria-label="One-tap capture">
      {quickRituals.map((item) => {
        const complete = state.rituals.today[item.key];
        return <button key={item.key} type="button" className={complete ? "captured" : ""} aria-pressed={complete} disabled={ritualMutation.isPending} onClick={() => ritualMutation.mutate({ ritual: item.key, completed: !complete })}><span aria-hidden="true">{complete ? "✓" : "+"}</span>{item.label}</button>;
      })}
      {focus?.plan.frog && !focus.plan.frogStartedAt && !focus.plan.frogCompleted && <button type="button" className="start-chip" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}><span aria-hidden="true">▶</span>Start frog</button>}
    </div>
    <form className="capture-form" onSubmit={submit}>
      <label htmlFor="quick-capture-input">Natural-language capture</label>
      <div><input id="quick-capture-input" value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder="woke 5:40 · park reply to James · slept 7h, energy 3…" /><button disabled={!text.trim() || captureMutation.isPending}>{captureMutation.isPending ? "Reading…" : "Capture"}</button></div>
    </form>
    {result && <p className={`capture-result ${result.tone}`} role="status">{result.message}</p>}
  </section>;
}

function WellnessCheckin({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const saved = state.wellness.today;
  const [mood, setMood] = useState(saved?.mood ?? 3);
  const [energy, setEnergy] = useState(saved?.energy ?? 3);
  const [sleepHours, setSleepHours] = useState(String(saved?.sleepHours ?? 7));
  const [sleepQuality, setSleepQuality] = useState(saved?.sleepQuality ?? 3);
  const [stress, setStress] = useState(saved?.stress ?? 3);
  const [soreness, setSoreness] = useState(saved?.soreness ?? 2);
  const [journal, setJournal] = useState(saved?.journal ?? "");
  const [expanded, setExpanded] = useState(!saved);

  useEffect(() => {
    if (!saved) return;
    setMood(saved.mood); setEnergy(saved.energy); setSleepHours(String(saved.sleepHours)); setSleepQuality(saved.sleepQuality); setStress(saved.stress); setSoreness(saved.soreness); setJournal(saved.journal);
  }, [saved?.updatedAt]);

  const mutation = useMutation({
    mutationFn: () => api.saveWellnessCheckin({ dateKey, mood, energy, sleepHours: Number(sleepHours), sleepQuality, stress, soreness, journal }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] });
      setExpanded(false);
    },
  });
  const sleepValid = sleepHours !== "" && Number.isFinite(Number(sleepHours)) && Number(sleepHours) >= 0 && Number(sleepHours) <= 24;
  const controls: Array<{ label: string; value: number; set: (value: number) => void; low: string; high: string }> = [
    { label: "Mood", value: mood, set: setMood, low: "Low", high: "Great" },
    { label: "Energy", value: energy, set: setEnergy, low: "Empty", high: "Full" },
    { label: "Sleep quality", value: sleepQuality, set: setSleepQuality, low: "Poor", high: "Great" },
    { label: "Stress", value: stress, set: setStress, low: "Calm", high: "High" },
    { label: "Soreness", value: soreness, set: setSoreness, low: "Fresh", high: "Sore" },
  ];

  return (
    <section id="wellness-checkin" className={`wellness-card ${saved && !expanded ? "wellness-saved" : ""}`} aria-labelledby="wellness-heading">
      <button className="wellness-header" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span><span className="eyebrow">30-SECOND CHECK-IN</span><strong id="wellness-heading">How are you today?</strong></span>
        <span className="wellness-status">{saved ? (expanded ? "Close" : "Saved · edit") : (expanded ? "Close" : "Open")}</span>
      </button>
      {expanded && <div className="wellness-form">
        <div className="wellness-sliders">
          {controls.map((control) => <label className="wellness-range" key={control.label}>
            <span><b>{control.label}</b><output>{control.value}/5</output></span>
            <input type="range" min="1" max="5" step="1" value={control.value} onChange={(event) => control.set(Number(event.target.value))} aria-label={`${control.label}, ${control.value} out of 5`} />
            <small><span>{control.low}</span><span>{control.high}</span></small>
          </label>)}
        </div>
        <label className="sleep-hours"><span>Sleep hours</span><input type="number" min="0" max="24" step="0.5" inputMode="decimal" value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} aria-label="Sleep hours" /></label>
        <label className="journal-line"><span>One-line note</span><input type="text" maxLength={240} value={journal} onChange={(event) => setJournal(event.target.value)} placeholder="Anything worth remembering?" aria-label="One-line daily journal" /></label>
        <button className="save-checkin" disabled={!sleepValid || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Saving…" : saved ? "Update check-in" : "Save check-in"}</button>
        {mutation.isError && <p className="inline-error" role="alert">Couldn’t save yet. Your entries are still here.</p>}
      </div>}
    </section>
  );
}

function NightlyCheck({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const saved = state.nightly?.today ?? null;
  const [somethingGood, setSomethingGood] = useState(saved?.somethingGood ?? "");
  const [somethingHard, setSomethingHard] = useState(saved?.somethingHard ?? "");
  const [somethingKind, setSomethingKind] = useState(saved?.somethingKind ?? "");
  const [expanded, setExpanded] = useState(!saved);

  useEffect(() => {
    if (!saved) return;
    setSomethingGood(saved.somethingGood); setSomethingHard(saved.somethingHard); setSomethingKind(saved.somethingKind);
  }, [saved?.updatedAt]);

  const mutation = useMutation({
    mutationFn: () => api.saveNightlyCheck({ dateKey, somethingGood, somethingHard, somethingKind }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] });
      setExpanded(false);
    },
  });
  const hasAny = Boolean(somethingGood.trim() || somethingHard.trim() || somethingKind.trim());

  return (
    <section id="nightly-check" className={`nightly-card ${saved && !expanded ? "nightly-saved" : ""}`} aria-labelledby="nightly-heading">
      <button className="wellness-header" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span><span className="eyebrow">NIGHTLY CHECK · EVENING</span><strong id="nightly-heading">Nightly check</strong></span>
        <span className="wellness-status">{saved ? (expanded ? "Close" : "Saved · edit") : (expanded ? "Close" : "Open")}</span>
      </button>
      {expanded && <div className="nightly-form">
        <label className="nightly-field"><span>Something good I did</span><textarea maxLength={500} rows={2} value={somethingGood} onChange={(event) => setSomethingGood(event.target.value)} placeholder="One good thing from today" aria-label="Something good I did" /></label>
        <label className="nightly-field"><span>Something hard I faced</span><textarea maxLength={500} rows={2} value={somethingHard} onChange={(event) => setSomethingHard(event.target.value)} placeholder="What was hard today?" aria-label="Something hard I faced" /></label>
        <label className="nightly-field"><span>Something kind</span><textarea maxLength={500} rows={2} value={somethingKind} onChange={(event) => setSomethingKind(event.target.value)} placeholder="A kind moment — given or received" aria-label="Something kind" /></label>
        <button className="save-checkin" disabled={!hasAny || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Saving…" : saved ? "Update nightly check" : "Save nightly check"}</button>
        {mutation.isError && <p className="inline-error" role="alert">Couldn’t save yet. Your entries are still here.</p>}
      </div>}
    </section>
  );
}

const FOCUS_TIMER_KEY = "workout-log:focus-timer";

type TimerState = { task: string; plannedMinutes: number; elapsedSeconds: number; startedAt: number | null };

function readFocusTimer(): TimerState {
  try {
    const parsed = JSON.parse(localStorage.getItem(FOCUS_TIMER_KEY) ?? "null") as Partial<TimerState> | null;
    if (!parsed || typeof parsed.task !== "string" || typeof parsed.plannedMinutes !== "number" || typeof parsed.elapsedSeconds !== "number") return { task: "", plannedMinutes: 90, elapsedSeconds: 0, startedAt: null };
    return { task: parsed.task, plannedMinutes: parsed.plannedMinutes, elapsedSeconds: parsed.elapsedSeconds, startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : null };
  } catch {
    return { task: "", plannedMinutes: 90, elapsedSeconds: 0, startedAt: null };
  }
}

function formatTime12h(value: string): string {
  const [h = 0, m = 0] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function WakeTracker({ focus, dateKey }: { focus: FocusState | undefined; dateKey: string }) {
  const queryClient = useQueryClient();
  const [wakeInput, setWakeInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setWakeInput(focus?.plan.wakeTime ?? "");
    setTargetInput(focus?.plan.wakeTarget ?? "");
    if (focus?.plan.wakeTime) setEditing(false);
    else if (focus) setEditing(true);
  }, [focus?.plan.wakeTime, focus?.plan.wakeTarget]);

  const save = useMutation({
    mutationFn: (input: { wakeTime: string | null; wakeTarget?: string | null }) => api.saveWakeTime({ dateKey, ...input }),
    onSuccess: async () => {
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["focus-state", dateKey] });
    },
  });
  const wakeNow = () => {
    const now = new Date();
    const value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setWakeInput(value);
    save.mutate({ wakeTime: value });
  };
  const wakeTime = focus?.plan.wakeTime ?? null;
  const wakeTarget = focus?.plan.wakeTarget ?? null;
  const onTarget = Boolean(wakeTime && wakeTarget && wakeTime <= wakeTarget);
  const wakeValid = wakeInput === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(wakeInput);
  const targetValid = targetInput === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(targetInput);
  const wakeUnchanged = wakeInput === (focus?.plan.wakeTime ?? "") && targetInput === (focus?.plan.wakeTarget ?? "");

  return (
    <section className="wake-card" aria-labelledby="wake-heading">
      <div className="section-line">
        <div>
          <p className="eyebrow">WAKE TIME · DAY STARTS HERE</p>
          <h2 id="wake-heading">{wakeTime ? `Up at ${formatTime12h(wakeTime)}` : "When did you get up?"}</h2>
        </div>
        <span className="ritual-total">{focus?.wakeStreak ?? 0}<small> day streak</small></span>
      </div>
      <p className="wake-status">
        {wakeTime
          ? wakeTarget
            ? onTarget
              ? `On target. Goal was ${formatTime12h(wakeTarget)} — the morning is yours.`
              : `Target was ${formatTime12h(wakeTarget)}. Logged, not judged — tomorrow is the next rep.`
            : "Logged. Set a target wake time and the streak starts counting."
          : wakeTarget
            ? `Target: ${formatTime12h(wakeTarget)}. Log the real time when you get up — no rounding in your favor.`
            : "Log the real time you got up and set a target. The streak counts days you beat the target."}
      </p>
      <div className="wake-week" aria-label="Wake times for the last seven days">
        {(focus?.wakeWeek ?? []).map((day) => (
          <div className={`wake-day ${day.dateKey === dateKey ? "today" : ""}`} key={day.dateKey}>
            <span className="wake-day-name">{new Date(`${day.dateKey}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}</span>
            <span className={`wake-dot ${day.wakeTime ? (day.onTarget ? "hit" : "logged") : ""}`} aria-hidden="true" />
            <span className="wake-day-time">{day.wakeTime ? formatTime12h(day.wakeTime) : "—"}</span>
          </div>
        ))}
      </div>
      <div className="needle-delay">
        <span>Time to needle · wake → frog start</span>
        <strong>{focus?.needleDelayToday != null ? formatDelay(focus.needleDelayToday) : focus?.plan.frogStartedAt ? "Needs a wake time" : "Frog not started yet"}</strong>
        <div className="delay-week" aria-label="Time to needle for the last seven days">
          {(focus?.needleDelayWeek ?? []).map((day) => (
            <div className={`wake-day ${day.dateKey === dateKey ? "today" : ""}`} key={day.dateKey}>
              <span className={`wake-dot ${day.minutes != null ? (day.minutes <= 120 ? "hit" : "logged") : ""}`} aria-hidden="true" />
              <span className="wake-day-time">{day.minutes != null ? formatDelay(day.minutes) : "—"}</span>
            </div>
          ))}
        </div>
      </div>
      {editing ? (
        <div className="wake-form">
          <label><span>Wake time today</span><input type="time" value={wakeInput} onChange={(event) => setWakeInput(event.target.value)} aria-label="Wake time today" /></label>
          <label><span>Target wake time</span><input type="time" value={targetInput} onChange={(event) => setTargetInput(event.target.value)} aria-label="Target wake time" /></label>
          <div className="wake-form-actions">
            <button className="save-wake" disabled={!wakeValid || !targetValid || wakeUnchanged || save.isPending} onClick={() => save.mutate({ wakeTime: wakeInput || null, wakeTarget: targetInput || null })}>{save.isPending ? "Saving…" : "Save wake log"}</button>
            {wakeTime && <button className="wake-cancel" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
          {save.isError && <p className="inline-error" role="alert">Couldn’t save yet. Your entries are still here.</p>}
        </div>
      ) : (
        <div className="wake-actions">
          {!wakeTime && <button className="save-wake" onClick={wakeNow} disabled={save.isPending}>I’m up now</button>}
          <button className="wake-edit" onClick={() => setEditing(true)}>{wakeTime ? "Edit wake log" : "Log a different time"}</button>
          {wakeTime && <button className="wake-edit" onClick={() => save.mutate({ wakeTime: null })} disabled={save.isPending}>Clear today</button>}
        </div>
      )}
    </section>
  );
}

function FocusView({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const focusQuery = useQuery({ queryKey: ["focus-state", dateKey], queryFn: () => api.getFocusState({ dateKey }) });
  const focus = focusQuery.data;
  const [frog, setFrog] = useState("");
  const [reason, setReason] = useState("");
  const [taskTwo, setTaskTwo] = useState("");
  const [taskThree, setTaskThree] = useState("");
  const [parkingDraft, setParkingDraft] = useState("");
  const [editingPlan, setEditingPlan] = useState(false);
  const [timer, setTimer] = useState<TimerState>(readFocusTimer);
  const [now, setNow] = useState(Date.now());
  const [ratingOpen, setRatingOpen] = useState(false);
  const [focusRating, setFocusRating] = useState(4);

  const [planSnapshot, setPlanSnapshot] = useState<{ frog: string; reason: string; taskTwo: string; taskThree: string } | null>(null);
  const [editorOpenedByUser, setEditorOpenedByUser] = useState(false);
  useEffect(() => {
    if (!focus) return;
    const incoming = { frog: focus.plan.frog, reason: focus.plan.frogReason, taskTwo: focus.plan.taskTwo, taskThree: focus.plan.taskThree };
    if (planSnapshot && incoming.frog === planSnapshot.frog && incoming.reason === planSnapshot.reason && incoming.taskTwo === planSnapshot.taskTwo && incoming.taskThree === planSnapshot.taskThree) return;
    // Adopt outside changes (first load, quick capture) only when the form
    // still shows the last synced plan — never overwrite unsaved typing.
    const formPristine = !planSnapshot || (frog === planSnapshot.frog && reason === planSnapshot.reason && taskTwo === planSnapshot.taskTwo && taskThree === planSnapshot.taskThree);
    if (!formPristine) return;
    setFrog(incoming.frog); setReason(incoming.reason); setTaskTwo(incoming.taskTwo); setTaskThree(incoming.taskThree);
    setPlanSnapshot(incoming);
    if (!editorOpenedByUser) setEditingPlan(!incoming.frog);
  }, [focus?.plan.frog, focus?.plan.frogReason, focus?.plan.taskTwo, focus?.plan.taskThree, planSnapshot, editorOpenedByUser]);

  const openPlanEditor = () => {
    if (focus) {
      const current = { frog: focus.plan.frog, reason: focus.plan.frogReason, taskTwo: focus.plan.taskTwo, taskThree: focus.plan.taskThree };
      setFrog(current.frog); setReason(current.reason); setTaskTwo(current.taskTwo); setTaskThree(current.taskThree);
      setPlanSnapshot(current);
    }
    setEditorOpenedByUser(true);
    setEditingPlan(true);
  };
  const cancelPlanEditor = () => {
    if (focus) {
      setFrog(focus.plan.frog); setReason(focus.plan.frogReason); setTaskTwo(focus.plan.taskTwo); setTaskThree(focus.plan.taskThree);
    }
    setEditorOpenedByUser(false);
    setEditingPlan(false);
  };

  useEffect(() => {
    localStorage.setItem(FOCUS_TIMER_KEY, JSON.stringify(timer));
    if (timer.startedAt == null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer]);

  const elapsedSeconds = timer.elapsedSeconds + (timer.startedAt == null ? 0 : Math.max(0, Math.floor((now - timer.startedAt) / 1000)));
  const targetSeconds = timer.plannedMinutes * 60;
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const timerActive = Boolean(timer.task);
  const timerRunning = timer.startedAt != null;
  const timerLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["focus-state", dateKey] });

  const savePlan = useMutation({
    mutationFn: () => api.saveDailyFocus({ dateKey, frog, frogReason: reason, taskTwo, taskThree }),
    onSuccess: async () => {
      const previousFrog = focus?.plan.frog ?? "";
      if (timer.task && timer.task === previousFrog && previousFrog !== frog.trim()) {
        setTimer({ task: "", plannedMinutes: 90, elapsedSeconds: 0, startedAt: null });
        localStorage.removeItem(FOCUS_TIMER_KEY);
      }
      await refresh();
      setPlanSnapshot({ frog: frog.trim(), reason: reason.trim(), taskTwo: taskTwo.trim(), taskThree: taskThree.trim() });
      setEditorOpenedByUser(false);
      setEditingPlan(false);
    },
  });
  const startFrog = useMutation({
    mutationFn: () => api.startFrog({ dateKey }),
    onSuccess: () => refresh(),
  });
  const frogDone = useMutation({
    mutationFn: (completed: boolean) => api.setFrogCompleted({ dateKey, completed }),
    onSuccess: () => refresh(),
  });
  const addParking = useMutation({
    mutationFn: (text: string) => api.addParkingLotItem({ dateKey, text }),
    onSuccess: async () => { setParkingDraft(""); await refresh(); },
  });
  const clearParking = useMutation({
    mutationFn: (id: number) => api.clearParkingLotItem({ id }),
    onSuccess: () => refresh(),
  });
  const saveBlock = useMutation({
    mutationFn: () => api.saveFocusBlock({ dateKey, task: timer.task, plannedMinutes: timer.plannedMinutes, actualMinutes: Math.max(1, Math.round(elapsedSeconds / 60)), focusRating }),
    onSuccess: async () => {
      setTimer({ task: "", plannedMinutes: 90, elapsedSeconds: 0, startedAt: null });
      setRatingOpen(false);
      localStorage.removeItem(FOCUS_TIMER_KEY);
      await refresh();
    },
  });

  const beginBlock = (task: string) => {
    if (!task.trim()) { openPlanEditor(); return; }
    const next = { task: task.trim(), plannedMinutes: 90, elapsedSeconds: 0, startedAt: Date.now() };
    setNow(Date.now());
    setTimer(next);
    startFrog.mutate();
  };
  const toggleTimer = () => {
    if (timer.startedAt == null) {
      setNow(Date.now());
      setTimer((current) => ({ ...current, startedAt: Date.now() }));
    } else {
      const extra = Math.max(0, Math.floor((Date.now() - timer.startedAt) / 1000));
      setTimer((current) => ({ ...current, elapsedSeconds: current.elapsedSeconds + extra, startedAt: null }));
    }
  };

  const hour = new Date().getHours();
  const middayTripwire = hour >= 13 && focus && focus.plan.frog && !focus.plan.frogStartedAt && !focus.plan.frogCompleted;
  const weekMinutes = focus?.lastSevenDays.reduce((sum, day) => sum + day.minutes, 0) ?? 0;
  const jumpToCheckin = () => {
    const card = document.getElementById("wellness-checkin");
    const toggle = card?.querySelector<HTMLButtonElement>(".wellness-header");
    if (toggle?.getAttribute("aria-expanded") === "false") toggle.click();
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const recoveryPrompt = state.wellness.today && (state.wellness.today.energy <= 2 || state.wellness.today.sleepHours < 6)
    ? `Energy is ${state.wellness.today.energy}/5 after ${state.wellness.today.sleepHours} hours of sleep. Check in before you force the pace.`
    : null;

  return <main className="page focus-page">
    <section className="focus-masthead">
      <div><p className="eyebrow">YOUR DAY, WITH INTENTION</p><h1>{focus?.plan.frogCompleted ? "A little progress. A big difference." : "Make room for what matters."}</h1><p className="page-subtitle">One meaningful priority. A little movement. Time for yourself.</p></div>
      <div className="needle-stat"><b>{focus?.todayNeedleMinutes ?? 0}</b><span>needle min</span></div>
    </section>

    <TodayOverview minutes={focus?.todayNeedleMinutes ?? 0} ritualsDone={ritualMeta.filter((ritual) => state.rituals.today[ritual.key]).length} ritualsTotal={ritualMeta.length} energy={state.wellness.today?.energy ?? null} />

    <div className="focus-main-column">
    {focusQuery.isError && <p className="inline-error" role="alert">Your focus plan couldn’t load. <button onClick={() => focusQuery.refetch()}>Try again</button></p>}

    {!state.wellness.today && <aside className="proactive-check" aria-label="Proactive check-in"><div><strong>How are you arriving today?</strong><span>Thirty seconds: sleep, energy, stress, soreness.</span></div><button onClick={jumpToCheckin}>Check in now</button></aside>}
    {recoveryPrompt && <aside className="proactive-check recovery" aria-label="Recovery check-in"><div><strong>A gentler pace might help today.</strong><span>{recoveryPrompt}</span></div><button onClick={jumpToCheckin}>Review</button></aside>}
    {middayTripwire && focus && <div className="tripwire" role="status"><div><strong>Midday check: “{focus.plan.frog}” hasn’t started.</strong><span>{focus.parkingLot.length > 0 ? `${focus.parkingLot.length} side task${focus.parkingLot.length === 1 ? "" : "s"} already parked (${focus.parkingLot.slice(0, 2).map((item) => item.text).join(", ")}${focus.parkingLot.length > 2 ? "…" : ""}) and the frog still hasn’t moved. Start it before another side task wins.` : "The frog you locked this morning is still untouched. Start it before another side task wins."}</span></div><button onClick={() => startFrog.mutate()} disabled={startFrog.isPending} aria-label={`Start ${focus.plan.frog}`}>Start now</button></div>}

    <section className={`frog-card ${focus?.plan.frogCompleted ? "complete" : ""}`} aria-labelledby="frog-heading">
      <div className="frog-label"><span>01</span><div><p className="eyebrow">TODAY’S TOP PRIORITY</p><h2 id="frog-heading">{editingPlan ? (focus?.plan.frog ? "Edit today’s Big 3" : "What matters most today?") : (focus?.plan.frog || "What matters most today?")}</h2></div>{!editingPlan && focus?.plan.frog && <span className="lock-chip">{focus.plan.frogCompleted ? "Done" : focus.plan.frogStartedAt ? "Started" : "Locked"}</span>}</div>
      {focus?.plan.frogReason && !editingPlan && <p className="needle-reason">Why it matters: <b>{focus.plan.frogReason}</b></p>}
      {editingPlan && <div className="big-three-form">
        <label><span>1 · Your most important task</span><input value={frog} onChange={(event) => setFrog(event.target.value)} maxLength={180} placeholder="Call the first 20 roofers" /></label>
        <label><span>Why this moves the goal</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={240} placeholder="Direct path to the next client" /></label>
        <label><span>2 · Next outcome</span><input value={taskTwo} onChange={(event) => setTaskTwo(event.target.value)} maxLength={180} placeholder="One concrete outcome" /></label>
        <label><span>3 · Last outcome</span><input value={taskThree} onChange={(event) => setTaskThree(event.target.value)} maxLength={180} placeholder="One concrete outcome" /></label>
        <div className="big-three-actions">
          <button className="save-plan" disabled={!frog.trim() || !reason.trim() || !taskTwo.trim() || !taskThree.trim() || savePlan.isPending} onClick={() => savePlan.mutate()}>{savePlan.isPending ? "Saving…" : focus?.plan.frog ? "Save Big 3" : "Save today’s plan"}</button>
          {focus?.plan.frog && <button className="cancel-plan" onClick={cancelPlanEditor}>Cancel</button>}
        </div>
        {savePlan.isError && <p className="inline-error" role="alert">Couldn’t save yet. Your Big 3 is still here.</p>}
      </div>}
      {!editingPlan && focus && <>
        <div className="frog-actions">
          <button className="frog-check" onClick={() => frogDone.mutate(!focus.plan.frogCompleted)} aria-pressed={focus.plan.frogCompleted}><CheckMark checked={focus.plan.frogCompleted} />{focus.plan.frogCompleted ? "Completed" : "Mark done"}</button>
          <button className="start-focus" onClick={() => beginBlock(focus.plan.frog)} disabled={timerActive || focus.plan.frogCompleted}>Start 90 min</button>
          <button className="edit-plan" onClick={openPlanEditor}>Edit</button>
        </div>
        <ol className="big-three-list">
          {focus.plan.taskTwo && <li><span>02</span>{focus.plan.taskTwo}</li>}
          {focus.plan.taskThree && <li><span>03</span>{focus.plan.taskThree}</li>}
        </ol>
      </>}
    </section>

    {timerActive && <section className="focus-timer" aria-label="Focus timer">
      <p className="eyebrow">ONE TASK. NOTHING ELSE.</p>
      <h2>{timer.task}</h2>
      <output aria-label={`${timerLabel} remaining`}>{timerLabel}</output>
      <div className="timer-track"><span style={{ width: `${Math.min(100, elapsedSeconds / targetSeconds * 100)}%` }} /></div>
      <div className="timer-actions"><button onClick={toggleTimer}>{timerRunning ? "Pause" : "Resume"}</button><button onClick={() => { if (timerRunning) toggleTimer(); setRatingOpen(true); }}>End block</button></div>
      {ratingOpen && <div className="rating-panel"><span>How focused were you?</span><div>{[1,2,3,4,5].map((value) => <button key={value} className={focusRating === value ? "selected" : ""} onClick={() => setFocusRating(value)} aria-label={`Focus rating ${value} out of 5`}>{value}</button>)}</div><button className="save-block" onClick={() => saveBlock.mutate()} disabled={saveBlock.isPending}>{saveBlock.isPending ? "Saving…" : "Save block"}</button></div>}
    </section>}

    <QuickCapture state={state} focus={focus} dateKey={dateKey} onCheckin={jumpToCheckin} />

    <section className="parking-card" aria-labelledby="parking-heading">
      <div className="section-line"><div><p className="eyebrow">CLEAR YOUR MIND, KEEP YOUR FOCUS</p><h2 id="parking-heading">Save for later</h2></div><span className="parking-count">{focus?.parkingLot.length ?? 0}</span></div>
      <form className="parking-entry" onSubmit={(event) => { event.preventDefault(); const text = parkingDraft.trim(); if (text) addParking.mutate(text); }}>
        <input value={parkingDraft} onChange={(event) => setParkingDraft(event.target.value)} maxLength={180} placeholder="A thought or task for later…" aria-label="Side task to park" />
        <button disabled={!parkingDraft.trim() || addParking.isPending}>Park it</button>
      </form>
      {focus?.parkingLot.length ? <div className="parking-list">{focus.parkingLot.map((item) => <div key={item.id}><span>{item.text}</span><button onClick={() => clearParking.mutate(item.id)} aria-label={`Clear ${item.text}`}>Clear</button></div>)}</div> : <p className="parking-empty">Nothing here yet. Capture distractions here and return to your priority.</p>}
    </section>

    </div>
    <aside className="focus-side-column" aria-label="Your daily balance">
    <WellnessCheckin state={state} dateKey={dateKey} />
    <WakeTracker focus={focus} dateKey={dateKey} />
    <section className="focus-scoreboard">
      <div><p className="eyebrow">LAST 7 DAYS</p><strong>{weekMinutes}</strong><span>needle minutes</span></div>
      <div className="week-bars" aria-label={`${weekMinutes} focus minutes over the last seven days`}>{focus?.lastSevenDays.map((day) => <span key={day.dateKey} style={{ height: `${Math.max(6, Math.min(100, day.minutes / 90 * 100))}%` }} title={`${day.dateKey}: ${day.minutes} minutes`} />)}</div>
    </section>

    <RitualsCard state={state} dateKey={dateKey} />
    </aside>
    <div className="daily-support">
      <details className="support-section"><summary><span>Evening reflection<small>A moment to close out your day</small></span><span aria-hidden="true">+</span></summary><NightlyCheck state={state} dateKey={dateKey} /></details>
      <details className="support-section"><summary><span>Think through a decision<small>Find a next step aligned with your values</small></span><span aria-hidden="true">+</span></summary><DeciderSection dateKey={dateKey} /></details>
    </div>
  </main>;
}

function SetRow({ exerciseName, index, set, unit, weighted, onChange }: { exerciseName: string; index: number; set: DraftSet; unit: "reps" | "seconds"; weighted: boolean; onChange: (next: DraftSet) => void }) {
  return (
    <div className={`set-row ${weighted ? "weighted" : "bodyweight"} ${set.completed ? "done" : ""} ${set.missed ? "missed" : ""}`}>
      <button className="set-check" aria-label={`${set.completed ? "Uncheck" : "Complete"} set ${index + 1} of ${exerciseName}`} onClick={() => onChange({ ...set, completed: !set.completed, missed: set.completed ? set.missed : false })}>
        <CheckMark checked={set.completed} />
        <span>SET {index + 1}</span>
      </button>
      {weighted && <label><span>LB</span><input inputMode="decimal" aria-label={`${exerciseName} set ${index + 1} weight in pounds`} value={set.weight} onChange={(event) => onChange({ ...set, weight: event.target.value })} placeholder="0" /></label>}
      <label><span>{unit === "seconds" ? "SEC" : "REPS"}</span><input inputMode="numeric" aria-label={`${exerciseName} set ${index + 1} ${unit}`} value={set.reps} onChange={(event) => onChange({ ...set, reps: event.target.value })} placeholder="—" /></label>
      <label><span>RPE</span><input inputMode="decimal" aria-label={`${exerciseName} set ${index + 1} RPE`} value={set.rpe} onChange={(event) => onChange({ ...set, rpe: event.target.value })} placeholder="—" /></label>
      <button className="miss-button" aria-pressed={set.missed} aria-label={`${set.missed ? "Clear missed" : "Mark missed"} set ${index + 1} of ${exerciseName}`} onClick={() => onChange({ ...set, missed: !set.missed, completed: set.missed ? set.completed : false })}>MISS</button>
    </div>
  );
}

function AssessmentForm({ state, dateKey, kind, onDone }: { state: AppState; dateKey: string; kind: "session0" | "retest"; onDone?: () => void }) {
  const queryClient = useQueryClient();
  const latest = state.assessment.latest;
  const [hang, setHang] = useState("");
  const [scap, setScap] = useState("");
  const [pushReps, setPushReps] = useState("");
  const [pushSurface, setPushSurface] = useState("");
  const [splitLeft, setSplitLeft] = useState("");
  const [splitRight, setSplitRight] = useState("");
  const [chairSquats, setChairSquats] = useState("");
  const [sitReach, setSitReach] = useState("");
  const [squatHold, setSquatHold] = useState("");
  const [wallTouch, setWallTouch] = useState(false);
  const [savedRungs, setSavedRungs] = useState<AppState["assessment"]["rungs"]>(null);
  const num = (value: string) => value.trim() !== "" && Number.isFinite(Number(value));
  const valid = num(hang) && num(scap) && num(pushReps) && num(splitLeft) && num(splitRight) && num(chairSquats) && num(sitReach) && num(squatHold);
  const save = useMutation({
    mutationFn: () => api.saveAssessment({ kind, hangSeconds: Number(hang), scapPullReps: Number(scap), pushupReps: Number(pushReps), pushupSurface: pushSurface.trim(), splitSquatLeft: Number(splitLeft), splitSquatRight: Number(splitRight), chairSquatReps: Number(chairSquats), sitReachCm: Number(sitReach), squatHoldSeconds: Number(squatHold), wallWristsTouch: wallTouch }),
    onSuccess: async (response) => {
      setSavedRungs(response.rungs);
      await queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] });
      onDone?.();
    },
  });
  const fields: Array<{ label: string; hint: string; value: string; set: (value: string) => void; step?: string }> = [
    { label: "Dead hang time (seconds)", hint: "Bar safety first: static hang test on the door-mounted bar, build to 20s", value: hang, set: setHang },
    { label: "Shoulder-blade pulls (reps)", hint: "From a hang, shoulder blades down, elbows straight", value: scap, set: setScap },
    { label: "Push-ups (reps)", hint: "Floor or hands elevated, until form breaks", value: pushReps, set: setPushReps },
    { label: "Split squats, left leg (reps)", hint: "Bodyweight, hand on wall if needed, until form breaks", value: splitLeft, set: setSplitLeft },
    { label: "Split squats, right leg (reps)", hint: "Bodyweight, hand on wall if needed, until form breaks", value: splitRight, set: setSplitRight },
    { label: "Chair squats in 60 seconds (reps)", hint: "Bodyweight squat to a chair, clean form", value: chairSquats, set: setChairSquats },
    { label: "Sit-and-reach (cm)", hint: "Cm past your toes, or negative if short of them", value: sitReach, set: setSitReach, step: "0.5" },
    { label: "Deep squat hold (seconds)", hint: "Heels down, holding a doorframe if needed", value: squatHold, set: setSquatHold },
  ];
  return (
    <section className="assessment-card" aria-labelledby="assessment-heading">
      <p className="eyebrow">{kind === "session0" ? "ONE TIME · ABOUT 30 MIN" : "RETEST · DUE EVERY 4 WEEKS"}</p>
      <h2 id="assessment-heading">{kind === "session0" ? "Session 0: Assessment" : "Flexibility + strength retest"}</h2>
      <p className="assessment-intro">These numbers pick your starting ladder rungs, so Week 1 is calibrated, not guessed.{latest && kind === "retest" ? ` Last time: ${latest.hangSeconds}s hang, ${latest.pushupReps} push-ups, sit-and-reach ${latest.sitReachCm} cm, squat hold ${latest.squatHoldSeconds}s.` : ""}</p>
      <div className="assessment-grid">
        {fields.map((field) => (
          <label key={field.label}><span>{field.label}</span><input inputMode="decimal" step={field.step ?? "1"} value={field.value} onChange={(event) => field.set(event.target.value)} aria-label={field.label} /><small>{field.hint}</small></label>
        ))}
        <label><span>Push-up surface used</span><input value={pushSurface} onChange={(event) => setPushSurface(event.target.value)} maxLength={60} placeholder="floor, counter, stairs…" aria-label="Push-up surface used" /><small>Recorded with your push-up reps</small></label>
        <div className="wall-test">
          <span>Wall test</span>
          <button type="button" aria-pressed={wallTouch} onClick={() => setWallTouch((value) => !value)}>{wallTouch ? "Wrists touch ✓" : "Wrists don't touch"}</button>
          <small>Back flat, arms overhead: do your wrists touch without your lower back arching?</small>
        </div>
      </div>
      <button className="save-checkin" disabled={!valid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : kind === "session0" ? "Save Session 0" : "Save retest"}</button>
      {save.isError && <p className="inline-error" role="alert">Couldn’t save yet. Your entries are still here.</p>}
      {savedRungs && <div className="rungs-result" role="status">
        <strong>Your starting rungs</strong>
        <p>Chin-up ladder: {savedRungs.chinLabel}</p>
        <p>Push-up ladder: {savedRungs.pushupLabel}</p>
        <p>Split squat: {savedRungs.splitSquatLabel}</p>
      </div>}
    </section>
  );
}

function FlexibilityBlock({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState<30 | 60>(state.flexibilityToday.durationSeconds === 60 ? 60 : 30);
  const mutation = useMutation({
    mutationFn: (input: { completed: boolean; durationSeconds: 30 | 60 }) => api.saveFlexibility({ dateKey, ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] }),
  });
  const done = state.flexibilityToday.completed;
  return (
    <section className="flex-card" aria-labelledby="flex-heading">
      <div className="section-line">
        <div><p className="eyebrow">AFTER TRAINING · 10 MIN</p><h2 id="flex-heading">Flexibility block</h2></div>
        <span className="ritual-total">{done ? "Done" : "Open"}</span>
      </div>
      <div className="flex-list">
        {state.flexibilityBlock.map((item) => <div className="flex-row" key={item.name}><strong>{item.name}</strong><small>{duration === 60 ? item.detail.replace("30s", "60s") : item.detail}</small></div>)}
      </div>
      <div className="flex-actions">
        <div className="duration-toggle" role="group" aria-label="Stretch hold duration">
          <button className={duration === 30 ? "active" : ""} onClick={() => setDuration(30)} aria-pressed={duration === 30}>2 × 30s</button>
          <button className={duration === 60 ? "active" : ""} onClick={() => setDuration(60)} aria-pressed={duration === 60}>2 × 60s</button>
        </div>
        <button className="flex-done" disabled={mutation.isPending} onClick={() => mutation.mutate({ completed: !done, durationSeconds: duration })} aria-pressed={done}>{done ? "Done ✓ · undo" : "Mark block done"}</button>
      </div>
    </section>
  );
}

function EquipmentPanel({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const [bells, setBells] = useState(state.equipment.dumbbellDescription ?? "");
  const [bar, setBar] = useState(state.equipment.barType ?? "");
  const [editing, setEditing] = useState(!state.equipment.dumbbellDescription && !state.equipment.barType);
  const save = useMutation({
    mutationFn: () => api.saveEquipment({ dumbbellDescription: bells.trim(), barType: bar.trim() }),
    onSuccess: async () => { setEditing(false); await queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] }); },
  });
  if (!editing) {
    return <button className="jump-saved" onClick={() => setEditing(true)} aria-label="Edit equipment">Equipment: <b>{state.equipment.dumbbellDescription ?? "dumbbells not set"}</b> · <b>{state.equipment.barType ?? "bar not set"}</b> · tap to change</button>;
  }
  return (
    <section className="jump-panel equipment-panel">
      <div><strong>Your equipment</strong><p>Starting loads and bar safety rules follow this. Heaviest pair load is 20 lb per hand; beyond that the plan uses the 25 lb single, then a loaded backpack.</p></div>
      <div className="equipment-fields">
        <label><span>Dumbbells</span><input value={bells} onChange={(event) => setBells(event.target.value)} maxLength={240} aria-label="Dumbbell description" placeholder="e.g. adjustable pair 10–20 lb + one 25 lb single" /></label>
        <label><span>Pull-up bar</span><input value={bar} onChange={(event) => setBar(event.target.value)} maxLength={80} aria-label="Pull-up bar type" placeholder="door-mounted or fixed" /></label>
        <button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</button>
      </div>
    </section>
  );
}

function TargetsCard({ state }: { state: AppState }) {
  const rungs = state.assessment.rungs;
  return (
    <section className="targets-card" aria-labelledby="targets-heading">
      <p className="eyebrow">WEEK-24 TARGETS</p>
      <h2 id="targets-heading">Where the 24 weeks point</h2>
      <div className="target-list">
        {state.targets.map((target) => (
          <div className={`target-row ${target.met ? "met" : ""}`} key={target.key}>
            <div><strong>{target.label}</strong><small>{target.detail}</small></div>
            <span>{target.key === "sit_reach" || target.key === "squat_hold" ? (target.current > 0 ? `+${target.current}` : `${target.current}`) + ` ${target.unit}` : `${target.current} / ${target.target}+ ${target.unit}`}{target.met ? " ✓" : ""}</span>
          </div>
        ))}
      </div>
      {rungs && <div className="rungs-summary">
        <strong>Your ladder rungs</strong>
        <p>Chin-up: {rungs.chinLabel}</p>
        <p>Push-up: {rungs.pushupLabel}</p>
        <p>Split squat: {rungs.splitSquatLabel}</p>
      </div>}
      {state.upgradeTriggers.length > 0 && <div className="trigger-list">
        <strong>Upgrade triggers hit</strong>
        {state.upgradeTriggers.map((trigger) => <p key={trigger}>{trigger}</p>)}
      </div>}
      <p className="progression-note">{state.progressionOrder}</p>
    </section>
  );
}

function StrengthView({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const sessionType: "session_a" | "session_b" = state.todaySessionType === "session_b" || state.nextSessionType === "session_b" ? "session_b" : "session_a";
  const program = state.program[sessionType];
  const initialDraft = readStoredDraft(sessionType, program, state.upcoming);
  const [draft, setDraft] = useState<DraftExercise[]>(initialDraft.exercises);
  const [requestId, setRequestId] = useState(initialDraft.requestId);
  const [loadedSessionType, setLoadedSessionType] = useState<SessionType>(sessionType);
  const [message, setMessage] = useState("");
  const [jumpInput, setJumpInput] = useState(state.smallestJump == null ? "" : String(state.smallestJump));
  const [jumpEditing, setJumpEditing] = useState(state.smallestJump == null);

  useEffect(() => {
    const stored = readStoredDraft(sessionType, program, state.upcoming);
    setDraft(stored.exercises);
    setRequestId(stored.requestId);
    setLoadedSessionType(sessionType);
  }, [sessionType, state.upcoming?.id]);

  useEffect(() => {
    if (loadedSessionType !== sessionType) return;
    const stored: StoredSessionDraft = { requestId, sessionType, exercises: draft };
    localStorage.setItem(draftStorageKey(sessionType), JSON.stringify(stored));
  }, [draft, loadedSessionType, requestId, sessionType]);

  const saveJump = useMutation({
    mutationFn: (jump: number) => api.saveSmallestJump({ smallestJump: jump }),
    onSuccess: () => {
      setJumpEditing(false);
      queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] });
    },
  });

  const finish = useMutation({
    mutationFn: (exercises: DraftExercise[]) => api.finishSession({
      clientRequestId: requestId,
      sessionType,
      exercises: exercises.map((exercise) => ({
        name: exercise.name,
        pain: exercise.pain,
        sets: exercise.sets.map((set) => ({
          weight: set.missed ? 0 : Number(set.weight),
          reps: set.missed ? 0 : Number(set.reps),
          rpe: set.missed ? 0 : Number(set.rpe),
          completed: set.completed,
          missed: set.missed,
        })),
      })),
    }),
    onSuccess: async () => {
      localStorage.removeItem(draftStorageKey(sessionType));
      setMessage("Session saved. Your next workout is ready.");
      await queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] });
    },
    onError: () => setMessage("Couldn’t save yet. Your workout is still here—check your connection and try again."),
  });

  const updateExercise = (exerciseIndex: number, next: DraftExercise) => setDraft((current) => current.map((item, index) => index === exerciseIndex ? next : item));
  const finishedSets = draft.flatMap((exercise) => exercise.sets).filter((set) => set.completed || set.missed).length;
  const totalSets = draft.flatMap((exercise) => exercise.sets).length;
  const canFinish = draft.every((exercise, exerciseIndex) => exercise.sets.every((set) => {
    if (set.missed) return !set.completed;
    const definition = program[exerciseIndex];
    const weightValid = !definition?.weighted || (set.weight !== "" && Number.isFinite(Number(set.weight)) && Number(set.weight) >= 0);
    return set.completed && weightValid && set.reps !== "" && Number.isInteger(Number(set.reps)) && Number(set.reps) > 0 && set.rpe !== "" && Number.isFinite(Number(set.rpe)) && Number(set.rpe) >= 0 && Number(set.rpe) <= 10;
  }));

  return (
    <main className="page today-page">
      <section className="session-intro">
        <div>
          <p className="eyebrow">STRENGTH · MON / WED / FRI · A/B ALTERNATING</p>
          <h1>{formatSession(sessionType)}</h1>
        </div>
        <div className="set-meter" aria-label={`${finishedSets} of ${totalSets} sets logged`}><b>{finishedSets}</b><span>/{totalSets} SETS</span></div>
      </section>

      <aside className="phase-note">
        <div><span>{state.phaseInfo.isDeload ? "DELOAD WEEK" : "PHASE"}</span><strong>{state.phaseInfo.label}</strong></div>
        <p>{state.phaseInfo.setsNote} · {state.phaseInfo.effortNote}. Strength runs Mon/Wed/Fri (A, B, A, then B, A, B); aerobic Tue/Thu/Sat; Sunday off.</p>
        {state.assessment.rungs && <p>Chin-up: {state.assessment.rungs.chinLabel} · Push-up: {state.assessment.rungs.pushupLabel}</p>}
      </aside>

      {program.some((exercise) => exercise.barExercise) && (
        <aside className="bar-note" role="note">
          <strong>Door-mounted bar safety</strong>
          <p>Check the bar is fully seated before every session and test it with a static hang before any dynamic rep. Strict reps only — no swinging or kipping.</p>
        </aside>
      )}

      {state.upgradeTriggers.length > 0 && (
        <aside className="trigger-note" role="status">
          <strong>Upgrade trigger hit</strong>
          {state.upgradeTriggers.map((trigger) => <p key={trigger}>{trigger}</p>)}
        </aside>
      )}

      <EquipmentPanel state={state} dateKey={dateKey} />

      {(state.smallestJump == null || jumpEditing) ? (
        <section className="jump-panel">
          <div><strong>Smallest plate jump</strong><p>Enter the smallest total load increase your dumbbells allow.</p></div>
          <div className="jump-control"><input aria-label="Smallest dumbbell weight jump in pounds" inputMode="decimal" value={jumpInput} onChange={(event) => setJumpInput(event.target.value)} placeholder="lb" /><button onClick={() => { const jump = Number(jumpInput); if (jump > 0) saveJump.mutate(jump); }}>Save</button></div>
        </section>
      ) : (
        <button className="jump-saved" onClick={() => { setJumpInput(String(state.smallestJump)); setJumpEditing(true); }} aria-label="Edit smallest plate jump">Progression jump: <b>{state.smallestJump} lb</b> · tap to change</button>
      )}

      <div className="exercise-stack">
        {program.map((exercise, exerciseIndex) => {
          const entry = draft[exerciseIndex];
          if (!entry) return null;
          const recommendation = state.upcoming?.recommendations.find((item) => item.name === exercise.name);
          return (
            <article className={`exercise ${entry.pain ? "pain" : ""}`} key={exercise.name}>
              <header>
                <div>
                  <p className="exercise-meta">{exercise.sets} × {exercise.repMin}–{exercise.repMax}{exercise.unilateral ? " / side" : ""} · REST {exercise.rest}</p>
                  <h2>{exercise.name}</h2>
                </div>
                <button className="pain-button" aria-pressed={entry.pain} onClick={() => updateExercise(exerciseIndex, { ...entry, pain: !entry.pain })}>{entry.pain ? "PAIN FLAGGED" : "PAIN?"}</button>
              </header>
              <p className="cue">{exercise.cue}</p>
              {exercise.regressions && <p className="regression"><strong>Easier:</strong> {exercise.regressions}</p>}
              {recommendation && <p className={`recommendation ${recommendation.outcome}`}>{recommendation.notice}</p>}
              {entry.pain && <p className="pain-notice">Progression frozen. Rest this movement, and consider a doctor or physio if pain persists.</p>}
              <div className="sets">
                {entry.sets.map((set, setIndex) => <SetRow key={setIndex} exerciseName={exercise.name} index={setIndex} set={set} unit={exercise.unit} weighted={exercise.weighted} onChange={(nextSet) => updateExercise(exerciseIndex, { ...entry, sets: entry.sets.map((item, index) => index === setIndex ? nextSet : item) })} />)}
              </div>
            </article>
          );
        })}
      </div>

      <FlexibilityBlock state={state} dateKey={dateKey} />

      <section className="eat-card">
        <p className="eyebrow">EATING TO GROW</p>
        <h2>Give the work something to build with.</h2>
        <ul><li><b>+250–350 cal</b> per day over maintenance</li><li><b>110–155g protein</b> per day</li><li><b>Weigh in weekly</b> under similar conditions</li></ul>
      </section>

      <div className="finish-panel">
        <div><strong>{finishedSets}/{totalSets} sets accounted for</strong><p>{canFinish ? "Ready to save." : "Complete each set and enter weight (0 for bodyweight), reps or seconds, and RPE. Missed sets need no numbers."}</p><small>Your entries stay on this device until the session saves.</small></div>
        <button disabled={!canFinish || finish.isPending} onClick={() => finish.mutate(draft)}>{finish.isPending ? "Saving…" : "Finish session"}</button>
        {message && <p className="save-message" role="status" aria-live="polite">{message}</p>}
      </div>

      <CalibrationCard state={state} dateKey={dateKey} />
    </main>
  );
}

function AerobicView({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (completed: boolean) => api.setAerobicDay({ dateKey, completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] }),
  });
  const nextLabel = state.nextSessionType === "session_a" ? "Session A" : "Session B";
  return (
    <main className="page today-page">
      <section className="session-intro">
        <div><p className="eyebrow">AEROBIC · TUE / THU / SAT</p><h1>AEROBIC DAY</h1></div>
        <div className="set-meter"><b>{state.weekNumber}</b><span>WEEK</span></div>
      </section>
      <aside className="phase-note">
        <div><span>{state.phaseInfo.isDeload ? "DELOAD WEEK" : "PHASE"}</span><strong>{state.phaseInfo.label}</strong></div>
        <p>No lifting today. Next strength session is {nextLabel} — strength runs Mon/Wed/Fri, alternating A and B.</p>
      </aside>
      <section className="aerobic-card">
        <h2>Steady aerobic work</h2>
        <p>Keep it conversational: you should be able to talk in full sentences the whole way. Walk, ride, row, swim — your pick. This is the engine work that makes the strength days recoverable.</p>
        <button className="save-checkin" disabled={mutation.isPending} onClick={() => mutation.mutate(!state.aerobicDoneToday)} aria-pressed={state.aerobicDoneToday}>{state.aerobicDoneToday ? "Aerobic done ✓ · undo" : "Mark aerobic done"}</button>
        {mutation.isError && <p className="inline-error" role="alert">Couldn’t save yet. Try again.</p>}
      </section>
      <FlexibilityBlock state={state} dateKey={dateKey} />
      <EquipmentPanel state={state} dateKey={dateKey} />
      <CalibrationCard state={state} dateKey={dateKey} />
    </main>
  );
}

function RestView({ state, dateKey }: { state: AppState; dateKey: string }) {
  const nextLabel = state.nextSessionType === "session_a" ? "Session A" : "Session B";
  return (
    <main className="page today-page">
      <section className="session-intro">
        <div><p className="eyebrow">SUNDAY · OFF</p><h1>REST DAY</h1></div>
        <div className="set-meter"><b>{state.weekNumber}</b><span>WEEK</span></div>
      </section>
      <aside className="phase-note">
        <div><span>NEXT UP</span><strong>{nextLabel} on Monday</strong></div>
        <p>Strength Mon/Wed/Fri, aerobic Tue/Thu/Sat, Sunday off. Daily rituals still count today — sunlight, meditation, visualization, chewing gum, and standing on one foot live on the Focus tab.</p>
      </aside>
      <TargetsCard state={state} />
      <CalibrationCard state={state} dateKey={dateKey} />
    </main>
  );
}

function CalibrationCard({ state, dateKey }: { state: AppState; dateKey: string }) {
  const [open, setOpen] = useState(false);
  if (state.assessment.baseline) return null;
  return (
    <section className="aerobic-card" aria-labelledby="calibration-heading">
      <p className="eyebrow">OPTIONAL · ONE TIME · ABOUT 30 MIN</p>
      <h2 id="calibration-heading">Session 0 calibration</h2>
      <p>Your workouts already run on starter rungs: dead hangs + scap pulls on the chin-up ladder, hands-elevated push-ups, bodyweight split squats. Do Session 0 whenever you want the rungs set from your real numbers (dead hang, scap pulls, push-ups, split squats, chair squats, sit-and-reach, squat hold, wall test) instead. It never blocks training.</p>
      <button className="edit-plan-dark" onClick={() => setOpen((value) => !value)} aria-expanded={open}>{open ? "Close Session 0" : "Start Session 0"}</button>
      {open && <AssessmentForm state={state} dateKey={dateKey} kind="session0" />}
    </section>
  );
}

function TodayView({ state, dateKey }: { state: AppState; dateKey: string }) {
  if (state.todayKind === "aerobic") return <AerobicView state={state} dateKey={dateKey} />;
  if (state.todayKind === "rest") return <RestView state={state} dateKey={dateKey} />;
  return <StrengthView state={state} dateKey={dateKey} />;
}

function formatTakenAt(value: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date.toISOString());
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function HistoryView({ state }: { state: AppState }) {
  const zephyrResults = state.zephyrResults ?? [];
  return (
    <main className="page history-page">
      <section className="page-heading"><p className="eyebrow">YOUR RECORD</p><h1>History</h1><p>Sessions and daily practices, kept separate.</p></section>
      <section className="history-section" aria-labelledby="zephyr-heading">
        <h2 id="zephyr-heading">Zephyr results</h2>
        {zephyrResults.length === 0 ? <p className="empty">No Zephyr results imported yet. They will appear here once imported from Zephyr.</p> : zephyrResults.map((result) => (
          <article className="zephyr-result-row" key={`${result.testId}-${result.takenAt}-${result.id}`}>
            <div className="zephyr-result-head">
              <div>
                <h3>{result.testTitle}</h3>
                <p className="zephyr-category">{result.category}</p>
              </div>
              <div className="zephyr-score"><b>{formatScore(result.score)}</b><span>/ {formatScore(result.maxScore)}</span></div>
            </div>
            <div className="zephyr-band">
              <span className="zephyr-band-label">{result.bandLabel}</span>
              <time>{formatTakenAt(result.takenAt)}</time>
            </div>
            {result.bandSummary && <p className="zephyr-summary">{result.bandSummary}</p>}
          </article>
        ))}
      </section>
      <section className="history-section">
        <h2>Daily check-ins</h2>
        {state.wellness.history.length === 0 ? <p className="empty">Your first check-in will land here.</p> : state.wellness.history.map((day) => (
          <article className="wellness-history-row" key={day.dateKey}>
            <div><time>{formatDate(`${day.dateKey}T12:00:00`)}</time>{day.journal && <p>{day.journal}</p>}</div>
            <div className="wellness-history-metrics"><span><b>{day.mood}</b>Mood</span><span><b>{day.energy}</b>Energy</span><span><b>{day.sleepHours}</b>Sleep</span><span><b>{day.stress}</b>Stress</span></div>
          </article>
        ))}
      </section>
      <section className="history-section">
        <h2>Nightly checks</h2>
        {(!state.nightly?.history?.length) ? <p className="empty">Your first nightly check will land here.</p> : state.nightly.history.map((day) => (
          <article className="nightly-history-row" key={day.dateKey}>
            <time>{formatDate(`${day.dateKey}T12:00:00`)}</time>
            <div className="nightly-history-entries">
              {day.somethingGood && <p><span>Something good I did</span>{day.somethingGood}</p>}
              {day.somethingHard && <p><span>Something hard I faced</span>{day.somethingHard}</p>}
              {day.somethingKind && <p><span>Something kind</span>{day.somethingKind}</p>}
            </div>
          </article>
        ))}
      </section>
      <section className="history-section">
        <h2>Daily rituals</h2>
        {state.rituals.history.length === 0 ? <p className="empty">Check off a ritual today to start your daily record.</p> : state.rituals.history.map((day) => (
          <div className="ritual-history-row" key={day.dateKey}>
            <time>{formatDate(`${day.dateKey}T12:00:00`)}</time>
            <span className={day.sunlight ? "hit" : ""}>SUN</span><span className={day.meditation ? "hit" : ""}>MED</span><span className={day.visualization ? "hit" : ""}>VIS</span><span className={day.chewingGum ? "hit" : ""}>GUM</span><span className={day.oneFootStand ? "hit" : ""}>BAL</span>
          </div>
        ))}
      </section>
      <section className="history-section">
        <h2>Workouts</h2>
        {state.history.length === 0 ? <p className="empty">Your completed sessions will land here.</p> : state.history.map((session) => {
          const setCount = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed).length;
          const painCount = session.exercises.filter((exercise) => exercise.pain).length;
          return <article className="history-session" key={session.id}><div><p className="eyebrow">{formatDate(session.completedAt)}</p><h3>{formatSession(session.sessionType)}</h3></div><div className="history-stat"><b>{setCount}</b><span>SETS</span></div>{painCount > 0 && <span className="pain-chip">{painCount} pain flag{painCount === 1 ? "" : "s"}</span>}</article>;
        })}
      </section>
    </main>
  );
}

function correlation(pairs: Array<[number, number]>): number | null {
  if (pairs.length < 3) return null;
  const meanX = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
  const numerator = pairs.reduce((sum, pair) => sum + (pair[0] - meanX) * (pair[1] - meanY), 0);
  const denomX = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair[0] - meanX) ** 2, 0));
  const denomY = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair[1] - meanY) ** 2, 0));
  return denomX && denomY ? numerator / (denomX * denomY) : null;
}

function MiniTrend({ label, valueLabel, points, maxValue, tone = "green" }: { label: string; valueLabel: string; points: Array<{ dateKey: string; value: number }>; maxValue: number; tone?: "green" | "amber" | "red" }) {
  const width = 220, height = 70, pad = 7;
  const coords = points.map((point, index) => ({ x: points.length === 1 ? width / 2 : pad + (index / (points.length - 1)) * (width - pad * 2), y: height - pad - (point.value / Math.max(maxValue, 1)) * (height - pad * 2), ...point }));
  return <article className={`metric-card ${tone}`}>
    <p>{label}</p><strong>{valueLabel}</strong>
    {points.length > 0 ? <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} trend across ${points.length} logged days`}><polyline points={coords.map((point) => `${point.x},${point.y}`).join(" ")} /><circle cx={coords[coords.length - 1]?.x ?? width / 2} cy={coords[coords.length - 1]?.y ?? height / 2} r="4" /></svg> : <span className="mini-empty">No data</span>}
  </article>;
}

function TrendsView({ state }: { state: AppState }) {
  const wellness = state.wellness.history.slice(0, 14).reverse();
  const workoutSets = new Map<string, number>();
  state.history.forEach((session) => {
    const dateKey = dateKeyFromInstant(session.completedAt);
    const count = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed).length;
    workoutSets.set(dateKey, (workoutSets.get(dateKey) ?? 0) + count);
  });
  const energyPairs: Array<[number, number]> = [];
  const sleepPairs: Array<[number, number]> = [];
  const stressPairs: Array<[number, number]> = [];
  wellness.forEach((day) => {
    const sets = workoutSets.get(day.dateKey);
    if (sets == null) return;
    energyPairs.push([day.energy, sets]); sleepPairs.push([day.sleepHours, sets]); stressPairs.push([day.stress, sets]);
  });
  const energyRelation = correlation(energyPairs);
  const sleepRelation = correlation(sleepPairs);
  const stressRelation = correlation(stressPairs);
  const callouts: string[] = [];
  if (energyRelation != null && Math.abs(energyRelation) >= .25) callouts.push(energyRelation > 0 ? "Higher-energy check-ins have lined up with more completed work sets." : "Higher-energy check-ins have not yet translated into more completed work sets.");
  if (sleepRelation != null && Math.abs(sleepRelation) >= .25) callouts.push(sleepRelation > 0 ? "Longer sleep has lined up with more completed work sets." : "Longer sleep has lined up with fewer completed work sets so far; more logs will show whether that holds.");
  if (stressRelation != null && Math.abs(stressRelation) >= .25) callouts.push(stressRelation < 0 ? "Higher-stress days have lined up with fewer completed work sets." : "Higher-stress days have not reduced completed work sets so far.");
  if (callouts.length === 0) callouts.push(wellness.length < 3 ? `Log ${3 - wellness.length} more daily check-in${wellness.length === 2 ? "" : "s"} to start seeing patterns.` : "No clear wellness-to-training pattern yet. Keep logging and the signal will sharpen.");
  const latest = wellness[wellness.length - 1];
  const maxSets = Math.max(1, ...Array.from(workoutSets.values()));
  return <main className="page trends-page">
    <section className="page-heading"><p className="eyebrow">RECOVERY + TRAINING</p><h1>Trends</h1><p>Your check-ins beside the work you completed. Patterns are associations, not diagnoses.</p></section>
    <section className="metric-grid" aria-label="Wellness trend charts">
      <MiniTrend label="Sleep" valueLabel={latest ? `${latest.sleepHours} hr` : "—"} maxValue={12} points={wellness.map((day) => ({ dateKey: day.dateKey, value: day.sleepHours }))} />
      <MiniTrend label="Energy" valueLabel={latest ? `${latest.energy}/5` : "—"} maxValue={5} points={wellness.map((day) => ({ dateKey: day.dateKey, value: day.energy }))} />
      <MiniTrend label="Stress" valueLabel={latest ? `${latest.stress}/5` : "—"} maxValue={5} tone="red" points={wellness.map((day) => ({ dateKey: day.dateKey, value: day.stress }))} />
      <MiniTrend label="Work sets" valueLabel={workoutSets.size ? `${Array.from(workoutSets.values()).at(-1) ?? 0}` : "—"} maxValue={maxSets} tone="amber" points={wellness.filter((day) => workoutSets.has(day.dateKey)).map((day) => ({ dateKey: day.dateKey, value: workoutSets.get(day.dateKey) ?? 0 }))} />
    </section>
    <section className="insight-section"><p className="eyebrow">WHAT YOUR LOG SHOWS</p><h2>Patterns, in plain English</h2><div className="insight-list">{callouts.map((callout) => <p key={callout}>{callout}</p>)}</div><small>Based on {wellness.length} check-in day{wellness.length === 1 ? "" : "s"} and {energyPairs.length} matched workout day{energyPairs.length === 1 ? "" : "s"}.</small></section>
    <section className="recovery-table"><h2>Recent days</h2>{wellness.length === 0 ? <p className="empty">Save today’s check-in to begin your trend line.</p> : wellness.slice().reverse().map((day) => <div className="recovery-row" key={day.dateKey}><time>{formatDate(`${day.dateKey}T12:00:00`)}</time><span>{day.sleepHours}h sleep</span><span>E {day.energy}</span><span>S {day.stress}</span><b>{workoutSets.has(day.dateKey) ? `${workoutSets.get(day.dateKey)} sets` : "No workout logged"}</b></div>)}</section>
  </main>;
}

function ProgressChart({ points }: { points: Array<{ label: string; value: number }> }) {
  if (points.length === 0) return <div className="chart-empty">Finish this movement in a session to draw its line.</div>;
  const width = 640, height = 250, padX = 44, padY = 28;
  const min = Math.min(...points.map((point) => point.value));
  const max = Math.max(...points.map((point) => point.value));
  const spread = Math.max(max - min, 5);
  const coords = points.map((point, index) => ({ x: points.length === 1 ? width / 2 : padX + (index / (points.length - 1)) * (width - padX * 2), y: height - padY - ((point.value - min) / spread) * (height - padY * 2), ...point }));
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Top weight progression from ${points[0]?.value ?? 0} to ${points[points.length - 1]?.value ?? 0} pounds`}>
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} className="axis" />
        <polyline points={coords.map((point) => `${point.x},${point.y}`).join(" ")} className="trend" />
        {coords.map((point, index) => <g key={`${point.label}-${index}`}><circle cx={point.x} cy={point.y} r="7" /><text x={point.x} y={point.y - 14} textAnchor="middle">{point.value}</text></g>)}
      </svg>
      <div className="chart-dates"><span>{points[0]?.label}</span><span>{points[points.length - 1]?.label}</span></div>
    </div>
  );
}

function ProgressView({ state, dateKey }: { state: AppState; dateKey: string }) {
  const [showRetest, setShowRetest] = useState(false);
  const names = [...state.program.session_a, ...state.program.session_b, ...state.program.full_body, ...state.program.upper, ...state.program.lower].map((exercise) => exercise.name).filter((name, index, all) => all.indexOf(name) === index);
  const [selected, setSelected] = useState(names[0] ?? "");
  const points = useMemo(() => state.history.slice().reverse().flatMap((session) => {
    const exercise = session.exercises.find((item) => item.name === selected);
    if (!exercise) return [];
    const completed = exercise.sets.filter((set) => set.completed);
    if (completed.length === 0) return [];
    return [{ label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(session.completedAt)), value: Math.max(...completed.map((set) => set.weight)) }];
  }), [state.history, selected]);
  const latest = points[points.length - 1]?.value;
  const first = points[0]?.value;
  return (
    <main className="page progress-page">
      <section className="page-heading"><p className="eyebrow">TOP WEIGHT OVER TIME</p><h1>Progress</h1><p>One honest line for every movement.</p></section>
      <label className="select-label">Exercise<select value={selected} onChange={(event) => setSelected(event.target.value)}>{names.map((name) => <option key={name}>{name}</option>)}</select></label>
      <section className="progress-figure"><div className="progress-number"><span>LATEST TOP WEIGHT</span><strong>{latest == null ? "—" : `${latest} lb`}</strong>{latest != null && first != null && <small>{latest - first >= 0 ? "+" : ""}{latest - first} lb from first log</small>}</div><ProgressChart points={points} /></section>
      <section className="rule-card"><h2>How progression works</h2><p>{state.progressionOrder}</p><div className="rule-row"><span>RPE 9+ or missed reps</span><b>HOLD</b></div><div className="rule-row"><span>Pain flagged</span><b>FREEZE</b></div></section>
      <TargetsCard state={state} />
      {state.assessment.baseline && <section className="retest-panel">
        <div><strong>Flexibility retest</strong><p>{state.assessment.retestDue ? "Due now — 4 weeks since the last one. Same measures as Session 0; progress shows against your baseline." : "Retest the Session 0 measures every 4 weeks to track flexibility against your baseline."}</p></div>
        <button className="edit-plan-dark" onClick={() => setShowRetest((value) => !value)} aria-expanded={showRetest}>{showRetest ? "Close retest" : state.assessment.retestDue ? "Retest now (due)" : "Retest early"}</button>
        {showRetest && <AssessmentForm state={state} dateKey={dateKey} kind="retest" onDone={() => setShowRetest(false)} />}
      </section>}
    </main>
  );
}

function TrainView({ state, dateKey }: { state: AppState; dateKey: string }) {
  const [view, setView] = useState<"workout" | "progress">("workout");
  return <>
    <div className="train-switch" role="group" aria-label="Training view">
      <button className={view === "workout" ? "active" : ""} onClick={() => setView("workout")}>Workout</button>
      <button className={view === "progress" ? "active" : ""} onClick={() => setView("progress")}>Progress</button>
    </div>
    {view === "workout" ? <TodayView state={state} dateKey={dateKey} /> : <ProgressView state={state} dateKey={dateKey} />}
  </>;
}

export function App() {
  const [tab, setTab] = useState<Tab>("focus");
  const [dateKey, setDateKey] = useState(localDateKey);
  useEffect(() => {
    const updateDay = () => setDateKey(localDateKey());
    const interval = window.setInterval(updateDay, 30_000);
    window.addEventListener("focus", updateDay);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", updateDay); };
  }, []);
  const stateQuery = useQuery({ queryKey: ["app-state", dateKey], queryFn: () => api.getAppState({ dateKey }) });
  if (stateQuery.isPending) return <div className="loading"><div className="loading-bar" /><p>Loading today…</p></div>;
  if (stateQuery.error || !stateQuery.data) return <div className="error-state" role="alert"><h1>Let’s reconnect.</h1><p>Your day couldn’t load. Check your connection and try again.</p><button onClick={() => stateQuery.refetch()}>Try again</button></div>;
  const state = stateQuery.data;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="app-topbar"><div className="app-brand"><span className="brand-mark" aria-hidden="true">↗</span><span className="brand-copy">Daylight<small>Your personal rhythm</small></span></div><time className="app-date" dateTime={dateKey}>{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${dateKey}T12:00:00`))}</time></header>
      <div className="app-workspace" id="main-content" tabIndex={-1}>
      {tab === "focus" && <FocusView state={state} dateKey={dateKey} />}
      {tab === "train" && <TrainView state={state} dateKey={dateKey} />}
      {tab === "history" && <HistoryView state={state} />}
      {tab === "trends" && <TrendsView state={state} />}
      {tab === "higher" && <HigherSelfView dateKey={dateKey} />}
      </div>
      <AppNavigation tab={tab} onChange={setTab} />
    </div>
  );
}
