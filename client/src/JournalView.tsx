import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";

type AppState = ApiResponse<typeof api, "getAppState">;
type JournalEntry = AppState["journal"]["history"][number];
type PresetKey = "companion" | "psychologist" | "cbt" | "stoic";
type DeeperMode = "conversational" | "questions";

const PRESETS: Array<{ key: PresetKey; name: string; blurb: string }> = [
  { key: "companion", name: "Companion", blurb: "Reflects back and asks the next right question" },
  { key: "psychologist", name: "Psychologist", blurb: "Patterns and the feelings under the feelings" },
  { key: "cbt", name: "CBT Coach", blurb: "Tests the thought against the evidence" },
  { key: "stoic", name: "Stoic", blurb: "What is yours to control, and what is not" },
];

const MINDS: Array<{ key: string; name: string; description: string }> = [
  { key: "perspectives", name: "Alternative Perspectives", description: "The same entry, seen from angles you did not take." },
  { key: "traps", name: "Thinking Traps", description: "Cognitive distortions hiding in the writing." },
  { key: "stoic", name: "Stoic Principles", description: "What the Stoics would point at here." },
  { key: "memories", name: "Past Memories", description: "Echoes from your own earlier entries." },
];

const EMOTION_LABELS: Record<string, string> = {
  joy: "Joy", trust: "Trust", fear: "Fear", surprise: "Surprise",
  sadness: "Sadness", disgust: "Disgust", anger: "Anger", anticipation: "Anticipation",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatTime12h(value: string): string {
  const [h = 0, m = 0] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function EmotionChips({ entry }: { entry: JournalEntry }) {
  if (entry.emotions.length === 0) return null;
  return (
    <div className="emotion-chips" aria-label="Emotions read in this entry">
      {entry.emotions.map((emotion) => (
        <span className="emotion-chip" key={emotion.name}>
          {EMOTION_LABELS[emotion.name] ?? emotion.name}
          <span className="emotion-dots" aria-label={`intensity ${emotion.intensity} of 3`}>{"●".repeat(emotion.intensity)}{"○".repeat(3 - emotion.intensity)}</span>
        </span>
      ))}
    </div>
  );
}

function WriteCard({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const saved = state.journal.today;
  const [frameworkKey, setFrameworkKey] = useState(saved?.framework ?? "daily");
  const [body, setBody] = useState(saved?.body ?? "");
  const [editing, setEditing] = useState(!saved);
  const [reminderEnabled, setReminderEnabled] = useState(state.journal.prefs.reminderEnabled);
  const [reminderTime, setReminderTime] = useState(state.journal.prefs.reminderTime);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    if (!saved) return;
    setBody(saved.body);
    setFrameworkKey(saved.framework || "daily");
    setEditing(false);
  }, [saved?.updatedAt]);

  useEffect(() => {
    setReminderEnabled(state.journal.prefs.reminderEnabled);
    setReminderTime(state.journal.prefs.reminderTime);
  }, [state.journal.prefs.reminderEnabled, state.journal.prefs.reminderTime]);

  const framework = state.journal.frameworks.find((item) => item.key === frameworkKey) ?? state.journal.frameworks[0]!;
  const promptForSave = framework.key === "daily" ? state.journal.promptToday : framework.key === "free" ? "" : framework.name;
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] }),
      queryClient.invalidateQueries({ queryKey: ["journal-reflection", dateKey] }),
    ]);
  };

  const save = useMutation({
    mutationFn: () => api.saveJournalEntry({ dateKey, prompt: promptForSave, body: body.trim(), framework: framework.key }),
    onSuccess: async () => { await refresh(); setEditing(false); },
  });
  const analyze = useMutation({
    mutationFn: () => api.analyzeJournalEntry({ dateKey }),
    onSuccess: refresh,
  });
  const savePrefs = useMutation({
    mutationFn: () => api.saveJournalPrefs({ reminderEnabled, reminderTime }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] }); setPrefsOpen(false); },
  });
  const prefsChanged = reminderEnabled !== state.journal.prefs.reminderEnabled || reminderTime !== state.journal.prefs.reminderTime;

  return (
    <section className="journal-card" aria-labelledby="journal-heading">
      <div className="section-line">
        <div>
          <p className="eyebrow">STEP 1 · WRITE</p>
          <h2 id="journal-heading">Today's journal</h2>
        </div>
        <span className="ritual-total">{state.journal.streak}<small> day streak</small></span>
      </div>

      <div className="framework-chips" role="group" aria-label="Journaling framework">
        {state.journal.frameworks.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`framework-chip ${framework.key === item.key ? "active" : ""}`}
            aria-pressed={framework.key === item.key}
            disabled={!!saved && !editing}
            onClick={() => setFrameworkKey(item.key)}
          >{item.name}</button>
        ))}
      </div>
      <p className="framework-tagline">{framework.tagline} — {framework.guide}</p>
      {framework.key === "daily" && <p className="journal-prompt">{state.journal.promptToday}</p>}
      {framework.questions.length > 0 && (
        <ol className="framework-questions">
          {framework.questions.map((question) => <li key={question}>{question}</li>)}
        </ol>
      )}

      {saved && !editing ? (
        <div className="journal-saved">
          <p>{saved.body}</p>
          <EmotionChips entry={saved} />
          {saved.themes.length > 0 && <p className="journal-themes">Themes: {saved.themes.join(" · ")}</p>}
          {saved.insight && <p className="journal-insight">{saved.insight}</p>}
          <div className="journal-saved-actions">
            <button className="wake-edit" onClick={() => setEditing(true)}>Edit today's entry</button>
            <button className="wake-edit" disabled={analyze.isPending} onClick={() => analyze.mutate()}>{analyze.isPending ? "Reading…" : saved.emotions.length > 0 ? "Re-read the emotions" : "Read the emotions in this entry"}</button>
          </div>
          {analyze.isError && <p className="inline-error" role="alert">The emotion read didn't land. Your entry is saved — try again.</p>}
        </div>
      ) : (
        <div className="journal-form">
          <label className="journal-field"><span>Your entry{wordCount > 0 ? ` · ${wordCount} words` : ""}</span><textarea rows={7} maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write it plain. Nobody grades this — future you reads it." aria-label="Today's journal entry" /></label>
          <button className="save-checkin" disabled={!body.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : saved ? "Update entry" : "Save entry"}</button>
          {save.isError && <p className="inline-error" role="alert">Couldn't save yet. Your words are still here.</p>}
          {saved && <button className="wake-edit" onClick={() => { setBody(saved.body); setEditing(false); }}>Cancel edit</button>}
        </div>
      )}

      <div className="journal-reminder">
        <div>
          <strong>Journal reminder</strong>
          <p>{state.journal.prefs.reminderEnabled ? `On · ${formatTime12h(state.journal.prefs.reminderTime)} every day. If the day's entry is missing, Today shows the nudge.` : "Off. Turn it on and Today will nudge you when the day's entry is still missing."}</p>
        </div>
        <button className="wake-edit" onClick={() => setPrefsOpen((value) => !value)} aria-expanded={prefsOpen}>{prefsOpen ? "Close" : "Set reminder"}</button>
      </div>
      {prefsOpen && <div className="journal-prefs">
        <button type="button" className={`reminder-toggle ${reminderEnabled ? "on" : ""}`} aria-pressed={reminderEnabled} onClick={() => setReminderEnabled((value) => !value)}>{reminderEnabled ? "Reminder on" : "Reminder off"}</button>
        <label><span>Remind me at</span><input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} aria-label="Journal reminder time" /></label>
        <button className="save-checkin" disabled={!prefsChanged || !reminderTime || savePrefs.isPending} onClick={() => savePrefs.mutate()}>{savePrefs.isPending ? "Saving…" : "Save reminder"}</button>
        {savePrefs.isError && <p className="inline-error" role="alert">Couldn't save the reminder yet. Try again.</p>}
      </div>}
    </section>
  );
}

function ReflectPanel({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const saved = state.journal.today;
  const reflectionQuery = useQuery({ queryKey: ["journal-reflection", dateKey], queryFn: () => api.getJournalReflection({ dateKey }) });
  const [preset, setPreset] = useState<PresetKey>("companion");
  const [mode, setMode] = useState<DeeperMode>("conversational");
  const [draft, setDraft] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["app-state", dateKey] }),
      queryClient.invalidateQueries({ queryKey: ["journal-reflection", dateKey] }),
    ]);
  };

  const deeper = useMutation({
    mutationFn: (message: string) => api.journalGoDeeper({ dateKey, preset, mode, message }),
    onSuccess: refresh,
    onSettled: () => setPendingText(null),
  });
  const minds = useMutation({
    mutationFn: () => api.inviteJournalMinds({ dateKey }),
    onSuccess: refresh,
  });

  const submitDeeper = (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || deeper.isPending) return;
    setPendingText(message);
    setDraft("");
    deeper.mutate(message);
  };

  const deeperMessages = reflectionQuery.data?.deeper ?? [];
  const mindComments = reflectionQuery.data?.minds ?? [];
  const activePreset = PRESETS.find((item) => item.key === preset) ?? PRESETS[0]!;

  return (
    <section className="journal-card" aria-labelledby="reflect-heading">
      <div className="section-line">
        <div>
          <p className="eyebrow">STEPS 2 + 3 · REFLECT</p>
          <h2 id="reflect-heading">Go deeper</h2>
        </div>
      </div>
      {!saved ? (
        <p className="empty">Save today's entry first — then reflect on it here: talk it through with a lens, or invite the Minds to comment on what you wrote.</p>
      ) : (
        <>
          <div className="framework-chips" role="group" aria-label="Reflection lens">
            {PRESETS.map((item) => (
              <button type="button" key={item.key} className={`framework-chip ${preset === item.key ? "active" : ""}`} aria-pressed={preset === item.key} onClick={() => setPreset(item.key)}>{item.name}</button>
            ))}
          </div>
          <p className="framework-tagline">{activePreset.blurb}.</p>
          <div className="deeper-mode" role="group" aria-label="Reflection mode">
            <button type="button" className={mode === "conversational" ? "active" : ""} aria-pressed={mode === "conversational"} onClick={() => setMode("conversational")}>Conversational</button>
            <button type="button" className={mode === "questions" ? "active" : ""} aria-pressed={mode === "questions"} onClick={() => setMode("questions")}>Questions only</button>
          </div>

          <div className="chat-thread" aria-live="polite" aria-label="Go Deeper conversation about today's entry">
            {deeperMessages.length === 0 && !pendingText && <p className="empty">No reflection yet. Say what the entry brings up, or ask what you might be missing — the {activePreset.name} lens answers from what you wrote.</p>}
            {deeperMessages.map((message) => (
              <article className={`chat-bubble ${message.role === "user" ? "user" : "assistant"}`} key={message.id}>
                <span>{message.role === "user" ? "You" : (PRESETS.find((item) => item.key === message.preset)?.name ?? "Companion")}</span>
                <p>{message.content}</p>
              </article>
            ))}
            {pendingText && <article className="chat-bubble user"><span>You</span><p>{pendingText}</p></article>}
            {deeper.isPending && <article className="chat-bubble assistant pending"><span>{activePreset.name}</span><p>reflecting…</p></article>}
          </div>
          <form className="chat-compose" onSubmit={submitDeeper}>
            <label htmlFor="deeper-input">Go deeper on today's entry</label>
            <textarea id="deeper-input" rows={2} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What part of this entry deserves a second look?" />
            <button type="submit" disabled={!draft.trim() || deeper.isPending}>{deeper.isPending ? "Reflecting…" : "Reflect"}</button>
            {deeper.isError && <p className="inline-error" role="alert">The reflection didn't land. Your entry is saved — try again.</p>}
          </form>

          <div className="minds-head">
            <div>
              <h3>Invite the Minds</h3>
              <p>Four Minds read today's entry and leave their comments on it.</p>
            </div>
            <button className="wake-edit" disabled={minds.isPending} onClick={() => minds.mutate()}>{minds.isPending ? "Reading…" : mindComments.length > 0 ? "Re-invite the Minds" : "Invite the Minds"}</button>
          </div>
          {minds.isError && <p className="inline-error" role="alert">The Minds didn't answer this time. Your entry is saved — try again.</p>}
          {minds.data?.crisis && <p className="inline-error" role="alert">One of your entries mentions possible self-harm, so the Minds step back. If that is live for you right now: call or text 988 (Suicide and Crisis Lifeline, free, 24/7), or 911 if you might act on it.</p>}
          <div className="mind-grid">
            {MINDS.map((mind) => {
              const comment = mindComments.find((item) => item.mind === mind.key);
              return (
                <article className="mind-card" key={mind.key}>
                  <h4>{mind.name}</h4>
                  <p className="mind-desc">{mind.description}</p>
                  {comment ? <p className="mind-comment">{comment.content}</p> : <p className="mind-waiting">Not invited yet.</p>}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function EmotionPatterns({ state }: { state: AppState }) {
  const analyzed = useMemo(() => state.journal.history.filter((entry) => entry.emotions.length > 0).slice(0, 30), [state.journal.history]);
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    analyzed.forEach((entry) => entry.emotions.forEach((emotion) => map.set(emotion.name, (map.get(emotion.name) ?? 0) + emotion.intensity)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [analyzed]);
  const topThemes = useMemo(() => {
    const map = new Map<string, number>();
    analyzed.forEach((entry) => entry.themes.forEach((theme) => map.set(theme, (map.get(theme) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [analyzed]);
  if (analyzed.length === 0) return null;
  const max = Math.max(1, ...totals.map(([, value]) => value));
  return (
    <section className="journal-card" aria-labelledby="patterns-heading">
      <p className="eyebrow">EMOTION PATTERNS · PLUTCHIK</p>
      <h2 id="patterns-heading">What your writing keeps feeling</h2>
      <p className="framework-tagline">Across your last {analyzed.length} analyzed entr{analyzed.length === 1 ? "y" : "ies"}, weighted by intensity.</p>
      <div className="emotion-bars">
        {totals.map(([name, value]) => (
          <div className="emotion-bar-row" key={name}>
            <span>{EMOTION_LABELS[name] ?? name}</span>
            <div className="emotion-bar-track"><div className="emotion-bar-fill" style={{ width: `${Math.round((value / max) * 100)}%` }} /></div>
            <b>{value}</b>
          </div>
        ))}
      </div>
      {topThemes.length > 0 && <p className="journal-themes">Recurring themes: {topThemes.map(([theme, count]) => `${theme} (${count})`).join(" · ")}</p>}
    </section>
  );
}

function AskJournal({ state, dateKey }: { state: AppState; dateKey: string }) {
  const queryClient = useQueryClient();
  const reflectionQuery = useQuery({ queryKey: ["journal-reflection", dateKey], queryFn: () => api.getJournalReflection({ dateKey }) });
  const [draft, setDraft] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const ask = useMutation({
    mutationFn: (message: string) => api.askJournal({ message }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["journal-reflection", dateKey] }); },
    onSettled: () => setPendingText(null),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || ask.isPending) return;
    setPendingText(message);
    setDraft("");
    ask.mutate(message);
  };
  const messages = reflectionQuery.data?.askMessages ?? [];
  return (
    <section className="journal-card" aria-labelledby="ask-heading">
      <p className="eyebrow">ASK YOUR JOURNAL</p>
      <h2 id="ask-heading">Patterns across everything you've written</h2>
      <p className="framework-tagline">Ask things like “When do I feel most anxious?” or “What keeps repeating?” Answers come from your own entries — dates cited, nothing invented.</p>
      <div className="chat-thread" aria-live="polite" aria-label="Ask Your Journal conversation">
        {messages.length === 0 && !pendingText && <p className="empty">{state.journal.totalEntries === 0 ? "Nothing to search yet — your journal starts with today's entry above." : "No questions yet. Your journal is ready when you are."}</p>}
        {messages.map((message) => (
          <article className={`chat-bubble ${message.role === "user" ? "user" : "assistant"}`} key={message.id}>
            <span>{message.role === "user" ? "You" : "Your Journal"}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {pendingText && <article className="chat-bubble user"><span>You</span><p>{pendingText}</p></article>}
        {ask.isPending && <article className="chat-bubble assistant pending"><span>Your Journal</span><p>searching your entries…</p></article>}
      </div>
      <form className="chat-compose" onSubmit={submit}>
        <label htmlFor="ask-input">Ask your journal</label>
        <textarea id="ask-input" rows={2} maxLength={1000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What do my entries say about…?" />
        <button type="submit" disabled={!draft.trim() || ask.isPending}>{ask.isPending ? "Searching…" : "Ask"}</button>
        {ask.isError && <p className="inline-error" role="alert">That question didn't land. Try again.</p>}
      </form>
    </section>
  );
}

function WeekRecap({ state, dateKey }: { state: AppState; dateKey: string }) {
  const [recap, setRecap] = useState<string | null>(state.journal.weekRecap);
  const [meta, setMeta] = useState<{ entryCount: number; streak: number } | null>(null);
  useEffect(() => { setRecap(state.journal.weekRecap); }, [state.journal.weekRecap]);
  const build = useMutation({
    mutationFn: (force: boolean) => api.journalWeeklyRecap({ dateKey, force }),
    onSuccess: (data) => { setRecap(data.summary); setMeta({ entryCount: data.entryCount, streak: data.streak }); },
  });
  return (
    <section className="journal-card" aria-labelledby="recap-heading">
      <p className="eyebrow">YOUR WEEK, WRAPPED</p>
      <h2 id="recap-heading">Weekly recap</h2>
      {recap ? <p className="recap-body">{recap}</p> : <p className="empty">A short read on this week's entries: what the week was about, the mindset running through it, and one suggestion for next week.</p>}
      {meta && <p className="journal-themes">Built from {meta.entryCount} entr{meta.entryCount === 1 ? "y" : "ies"} this week · {meta.streak}-day streak.</p>}
      <button className="save-checkin" disabled={build.isPending} onClick={() => build.mutate(!!recap)}>{build.isPending ? "Writing your recap…" : recap ? "Refresh recap" : "Build this week's recap"}</button>
      {build.isError && <p className="inline-error" role="alert">The recap didn't land. Try again.</p>}
    </section>
  );
}

function JournalFeed({ state }: { state: AppState }) {
  type FeedItem = { key: string; dateKey: string; order: number; kind: string; title: string; text: string; entry?: JournalEntry };
  const items: FeedItem[] = [];
  state.journal.history.forEach((entry) => {
    const framework = state.journal.frameworks.find((item) => item.key === entry.framework);
    const title = framework && entry.framework !== "daily" && entry.framework !== "free" ? framework.name : entry.prompt || "Free write";
    items.push({ key: `journal-${entry.dateKey}`, dateKey: entry.dateKey, order: 0, kind: "Journal", title, text: entry.body, entry });
  });
  (state.nightly?.history ?? []).forEach((day) => {
    const parts = [day.somethingGood && `Good: ${day.somethingGood}`, day.somethingHard && `Hard: ${day.somethingHard}`, day.somethingKind && `Kind: ${day.somethingKind}`].filter(Boolean).join(" · ");
    if (parts) items.push({ key: `nightly-${day.dateKey}`, dateKey: day.dateKey, order: 1, kind: "Nightly check", title: "Good · hard · kind", text: parts });
  });
  state.wellness.history.forEach((day) => {
    if (day.journal) items.push({ key: `wellness-${day.dateKey}`, dateKey: day.dateKey, order: 2, kind: "Check-in note", title: "One-line note", text: day.journal });
  });
  items.sort((a, b) => b.dateKey.localeCompare(a.dateKey) || a.order - b.order);
  return (
    <section className="history-section" aria-labelledby="feed-heading">
      <h2 id="feed-heading">Everything you've written</h2>
      {items.length === 0 ? <p className="empty">Your journal entries, nightly checks, and check-in notes gather here as you write them.</p> : items.slice(0, 40).map((item) => (
        <article className="feed-row" key={item.key}>
          <div className="feed-head"><span className="feed-kind">{item.kind}</span><time>{formatDate(`${item.dateKey}T12:00:00`)}</time></div>
          <p className="feed-title">{item.title}</p>
          <p className="feed-text">{item.text}</p>
          {item.entry && <EmotionChips entry={item.entry} />}
          {item.entry?.insight && <p className="feed-insight">{item.entry.insight}</p>}
        </article>
      ))}
    </section>
  );
}

export function JournalView({ state, dateKey }: { state: AppState; dateKey: string }) {
  return (
    <>
      <WriteCard state={state} dateKey={dateKey} />
      <ReflectPanel state={state} dateKey={dateKey} />
      <EmotionPatterns state={state} />
      <AskJournal state={state} dateKey={dateKey} />
      <WeekRecap state={state} dateKey={dateKey} />
      <JournalFeed state={state} />
    </>
  );
}
