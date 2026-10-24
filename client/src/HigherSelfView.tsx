import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";

export type HsState = ApiResponse<typeof api, "getHigherSelfState">;
export type Decision = HsState["decisions"][number];

export function weekKeyFor(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() - d.getDay());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function prettyDay(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function useHsState(dateKey: string) {
  const weekKey = weekKeyFor(dateKey);
  return useQuery({ queryKey: ["hs-state", dateKey, weekKey], queryFn: () => api.getHigherSelfState({ day: dateKey, weekKey }) });
}

const CRISIS_TEXT = "If you are thinking about harming yourself, call or text 988 right now to reach the Suicide and Crisis Lifeline, free, 24/7, from anywhere in the US. If you might act on it, call 911. Everything else waits.";

// ---------------------------------------------------------------------------
// Decider (in the Focus tab)
// ---------------------------------------------------------------------------

export function DeciderSection({ dateKey }: { dateKey: string }) {
  const queryClient = useQueryClient();
  const hsQuery = useHsState(dateKey);
  const state = hsQuery.data;
  const [dilemma, setDilemma] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [forcedPick, setForcedPick] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hs-state"] });

  const createMut = useMutation({
    mutationFn: () => api.createDecision({ day: dateKey, dilemma: dilemma.trim(), options: options.map((o) => o.trim()).filter(Boolean), forcedPick: forcedPick.trim() ? forcedPick.trim() : undefined }),
    onSuccess: (data) => { setActiveId(data.decision.id); setDilemma(""); setOptions(["", ""]); setForcedPick(""); void invalidate(); },
  });
  const reopenMut = useMutation({ mutationFn: (id: number) => api.reopenDecision({ id }), onSuccess: () => void invalidate() });
  const deleteMut = useMutation({ mutationFn: (id: number) => api.deleteDecision({ id }), onSuccess: () => { setActiveId(null); void invalidate(); } });

  const active = state?.decisions.find((d) => d.id === activeId) ?? null;
  const filledOptions = options.map((o) => o.trim()).filter(Boolean);
  const dueRevisits = (state?.decisions ?? []).filter((d) => d.status === "locked" && d.revisitDate != null && d.revisitDate <= dateKey);
  const openLocked = (state?.decisions ?? []).filter((d) => d.status !== "reviewed");
  const reviewed = (state?.decisions ?? []).filter((d) => d.status === "reviewed");

  return (
    <section className="hs-card" aria-labelledby="decider-heading">
      <div className="section-line">
        <div><p className="eyebrow">DECIDER · YOUR HIGHER SELF PICKS</p><h2 id="decider-heading">Decider</h2></div>
        <span className="ritual-total">{state ? state.decisions.length : 0}</span>
      </div>

      {dueRevisits.length > 0 && (
        <div className="hs-due" role="status">
          <strong>Revisit due: {dueRevisits.length} decision{dueRevisits.length > 1 ? "s" : ""}</strong>
          {dueRevisits.map((d) => (
            <button key={d.id} type="button" className="hs-row" onClick={() => setActiveId(d.id)}>
              <span>{d.pick ?? d.dilemma}</span><small>Decided: {d.dilemma}</small>
            </button>
          ))}
        </div>
      )}

      {active ? (
        <DecisionDetail
          key={`${active.id}-${active.status}`}
          decision={active}
          dateKey={dateKey}
          onBack={() => setActiveId(null)}
          onReopen={() => reopenMut.mutate(active.id)}
          onDelete={() => deleteMut.mutate(active.id)}
        />
      ) : (
        <>
          <div className="hs-form">
            <label><span>The dilemma</span>
              <textarea value={dilemma} onChange={(e) => setDilemma(e.target.value)} rows={2} maxLength={400} placeholder="What is the call?" aria-label="The dilemma" />
            </label>
            <span className="hs-label">The options (2 to 6)</span>
            {options.map((o, i) => (
              <div className="hs-option-row" key={i}>
                <input aria-label={`Option ${i + 1}`} value={o} maxLength={200} onChange={(e) => { const next = [...options]; next[i] = e.target.value; setOptions(next); }} placeholder={i === 0 ? "Option A" : i === 1 ? "Option B" : `Option ${i + 1}`} />
                {options.length > 2 && <button type="button" aria-label={`Remove option ${i + 1}`} onClick={() => setOptions(options.filter((_, j) => j !== i))}>✕</button>}
              </div>
            ))}
            {options.length < 6 && <button type="button" className="hs-link" onClick={() => setOptions([...options, ""])}>Add an option</button>}
            <label><span>Forced pick (optional)</span>
              <select aria-label="Forced pick (optional)" value={forcedPick} onChange={(e) => setForcedPick(e.target.value)}>
                <option value="">Let my Higher Self choose</option>
                {filledOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            {createMut.isError && <p className="inline-error" role="alert">Your Higher Self could not weigh that yet. Your words are still here.</p>}
            <button type="button" className="save-checkin" disabled={dilemma.trim().length < 3 || filledOptions.length < 2 || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? "Your Higher Self is weighing it…" : "Ask my Higher Self to pick"}
            </button>
          </div>

          <div className="hs-list-block">
            <h3>Open &amp; locked</h3>
            {hsQuery.isPending ? <p className="hs-empty">Loading decisions…</p>
              : openLocked.length === 0 ? <p className="hs-empty">No decisions yet. The first one you lock starts your proof score.</p>
              : openLocked.map((d) => (
                <button key={d.id} type="button" className="hs-row" onClick={() => setActiveId(d.id)}>
                  <span>{d.dilemma}</span>
                  <small>{d.status === "locked" ? `Locked: ${d.pick ?? ""}${d.revisitDate ? ` · Revisit ${prettyDay(d.revisitDate)}` : ""}` : `Verdict in: ${d.pick ?? "waiting"}${d.reopenCount > 0 ? ` · Reopened ${d.reopenCount}x` : ""}`}</small>
                </button>
              ))}
            {reviewed.length > 0 && <>
              <h3>Reviewed history</h3>
              {reviewed.map((d) => (
                <button key={d.id} type="button" className="hs-row" onClick={() => setActiveId(d.id)}>
                  <span>{d.dilemma}</span>
                  <small>Reviewed. {d.followedThrough ? "Followed through." : "Not followed through."}</small>
                </button>
              ))}
            </>}
          </div>
        </>
      )}
    </section>
  );
}

function DecisionDetail({ decision, dateKey, onBack, onReopen, onDelete }: { decision: Decision; dateKey: string; onBack: () => void; onReopen: () => void; onDelete: () => void }) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<"verdict" | "lock" | "review">(decision.status === "locked" ? "review" : "verdict");
  const [chosen, setChosen] = useState(decision.pick ?? decision.options[0] ?? "");
  const [commitment, setCommitment] = useState(decision.commitment ?? "");
  const [ifThen, setIfThen] = useState(decision.ifThen ?? "");
  const [revisitDate, setRevisitDate] = useState(decision.revisitDate ?? addDays(dateKey, 7));
  const [outcome, setOutcome] = useState(decision.outcome ?? "");
  const [followed, setFollowed] = useState<boolean>(decision.followedThrough ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hs-state"] });

  const lockMut = useMutation({
    mutationFn: () => api.lockDecision({ id: decision.id, chosen, commitment: commitment.trim(), ifThen: ifThen.trim(), revisitDate }),
    onSuccess: () => { void invalidate(); onBack(); },
  });
  const reviewMut = useMutation({
    mutationFn: () => api.reviewDecision({ id: decision.id, outcome: outcome.trim(), followedThrough: followed }),
    onSuccess: () => { void invalidate(); onBack(); },
  });

  return (
    <div className="hs-detail">
      <button type="button" className="hs-link" onClick={onBack}>‹ All decisions</button>
      <h3>{decision.dilemma}</h3>
      <p className="hs-dim">{prettyDay(decision.dateKey)} · {decision.status}</p>
      <ul className="hs-options-list">
        {decision.options.map((o) => <li key={o}>· {o}{decision.pick === o ? <b> ← the pick</b> : null}</li>)}
      </ul>

      {decision.pick && stage === "verdict" && decision.status === "open" && (
        <div className="hs-verdict">
          <p className="eyebrow">THE VERDICT</p>
          <strong>{decision.pick}</strong>
          {decision.reasoning && <p>{decision.reasoning}</p>}
          {decision.patternNote && <p><b>Pattern check:</b> {decision.patternNote}</p>}
          {decision.firstStep && <p><b>First step:</b> {decision.firstStep}</p>}
          <button type="button" className="save-checkin" onClick={() => setStage("lock")}>Lock this decision</button>
          <button type="button" className="hs-secondary" onClick={onReopen}>Reopen it{decision.reopenCount > 0 ? ` (reopened ${decision.reopenCount}x)` : ""}</button>
        </div>
      )}

      {stage === "lock" && decision.status === "open" && (
        <div className="hs-form">
          <span className="hs-label">Final pick</span>
          {decision.options.map((o) => (
            <button key={o} type="button" aria-pressed={chosen === o} className={`hs-pick ${chosen === o ? "selected" : ""}`} onClick={() => setChosen(o)}>{o}{decision.pick === o ? " (Higher Self pick)" : ""}</button>
          ))}
          <label><span>Commitment</span><textarea value={commitment} onChange={(e) => setCommitment(e.target.value)} rows={2} maxLength={400} placeholder="I am doing this. Starting when, exactly?" aria-label="Commitment" /></label>
          <label><span>If-then plan</span><textarea value={ifThen} onChange={(e) => setIfThen(e.target.value)} rows={2} maxLength={400} placeholder="If it is 9am, then I open the call list before anything else." aria-label="If-then plan" /></label>
          <label><span>Revisit on</span><input type="date" value={revisitDate} onChange={(e) => setRevisitDate(e.target.value)} aria-label="Revisit on" /></label>
          {lockMut.isError && <p className="inline-error" role="alert">Could not lock yet. Your entries are still here.</p>}
          <button type="button" className="save-checkin" disabled={!chosen || commitment.trim().length < 3 || ifThen.trim().length < 3 || !revisitDate || lockMut.isPending} onClick={() => lockMut.mutate()}>{lockMut.isPending ? "Locking…" : "Lock it"}</button>
          <button type="button" className="hs-link" onClick={() => setStage("verdict")}>Back to the verdict</button>
        </div>
      )}

      {decision.status === "locked" && stage === "review" && (
        <div className="hs-form">
          <p><b>Pick:</b> {decision.pick}</p>
          <p><b>Commitment:</b> {decision.commitment}</p>
          <p><b>If-then:</b> {decision.ifThen}</p>
          <p><b>Revisit:</b> {decision.revisitDate ? prettyDay(decision.revisitDate) : "not set"}{decision.revisitDate && decision.revisitDate <= dateKey ? " (due now)" : ""}</p>
          <label><span>What actually happened?</span><textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} maxLength={500} placeholder="Log the outcome honestly." aria-label="What actually happened?" /></label>
          <div className="hs-follow-row">
            <button type="button" aria-pressed={followed} className={followed ? "selected" : ""} onClick={() => setFollowed(true)}>I followed through</button>
            <button type="button" aria-pressed={!followed} className={!followed ? "selected no" : ""} onClick={() => setFollowed(false)}>I did not</button>
          </div>
          {reviewMut.isError && <p className="inline-error" role="alert">Could not save the outcome yet.</p>}
          <button type="button" className="save-checkin" disabled={outcome.trim().length < 3 || reviewMut.isPending} onClick={() => reviewMut.mutate()}>{reviewMut.isPending ? "Saving…" : "Save the outcome"}</button>
          <button type="button" className="hs-secondary" onClick={onReopen}>Reopen it{decision.reopenCount > 0 ? ` (reopened ${decision.reopenCount}x)` : ""}</button>
        </div>
      )}

      {decision.status === "reviewed" && (
        <div className="hs-verdict">
          <p><b>Outcome:</b> {decision.outcome}</p>
          <p><b>{decision.followedThrough ? "Followed through. That is proof." : "Not followed through. Logged honestly, which is the re-entry."}</b></p>
          <button type="button" className="hs-secondary" onClick={onReopen}>Reopen it{decision.reopenCount > 0 ? ` (reopened ${decision.reopenCount}x)` : ""}</button>
        </div>
      )}

      {confirmDelete ? (
        <div className="hs-follow-row">
          <button type="button" className="danger" onClick={onDelete}>Delete for real</button>
          <button type="button" onClick={() => setConfirmDelete(false)}>Keep it</button>
        </div>
      ) : (
        <button type="button" className="hs-link danger-link" onClick={() => setConfirmDelete(true)}>Delete this decision</button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Higher Self tab
// ---------------------------------------------------------------------------

type HsTool = "chat" | "identity" | "facts" | "reframe" | "proof" | "letter";

export function HigherSelfView({ dateKey }: { dateKey: string }) {
  const queryClient = useQueryClient();
  const weekKey = weekKeyFor(dateKey);
  const hsQuery = useHsState(dateKey);
  const state = hsQuery.data;
  const [tool, setTool] = useState<HsTool>("chat");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hs-state"] });

  // Morning message
  const morningQuery = useQuery({ queryKey: ["hs-morning", dateKey], queryFn: () => api.morningMessage({ day: dateKey, force: false }) });
  const morningMut = useMutation({ mutationFn: () => api.morningMessage({ day: dateKey, force: true }), onSuccess: (data) => queryClient.setQueryData(["hs-morning", dateKey], data) });
  const morning = morningMut.data ?? morningQuery.data ?? null;

  // Chat
  const [draft, setDraft] = useState("");
  const chatMut = useMutation({
    mutationFn: (message: string) => api.askHigherSelf({ day: dateKey, message }),
    onSuccess: () => { setDraft(""); void invalidate(); },
  });

  // Identity
  const profile = state?.profile ?? null;
  const [pattern, setPattern] = useState("");
  const [identity, setIdentity] = useState("");
  const [values, setValues] = useState("");
  const [nonNeg, setNonNeg] = useState("");
  const [never, setNever] = useState("");
  const [identityLoaded, setIdentityLoaded] = useState(false);
  useEffect(() => {
    if (!state || identityLoaded) return;
    setPattern(profile?.pattern ?? "");
    setIdentity(profile?.identityStatement ?? "");
    setValues(profile?.valuesList ?? "");
    setNonNeg(profile?.nonNegotiables ?? "");
    setNever(profile?.neverDoes ?? "");
    setIdentityLoaded(true);
  }, [state, identityLoaded, profile]);
  const identityMut = useMutation({
    mutationFn: () => api.saveProfile({ pattern: pattern.trim(), scores: profile?.scores ?? "", answers: "", identityStatement: identity.trim(), valuesList: values.trim(), nonNegotiables: nonNeg.trim(), neverDoes: never.trim() }),
    onSuccess: () => void invalidate(),
  });

  // Facts
  const [newFact, setNewFact] = useState("");
  const [editingFactId, setEditingFactId] = useState<number | null>(null);
  const [editingFactText, setEditingFactText] = useState("");
  const addFactMut = useMutation({ mutationFn: () => api.addFact({ fact: newFact.trim() }), onSuccess: () => { setNewFact(""); void invalidate(); } });
  const updateFactMut = useMutation({ mutationFn: () => api.updateFact({ id: editingFactId ?? 0, fact: editingFactText.trim() }), onSuccess: () => { setEditingFactId(null); void invalidate(); } });
  const deleteFactMut = useMutation({ mutationFn: (id: number) => api.deleteFact({ id }), onSuccess: () => void invalidate() });

  // Reframe
  const [thought, setThought] = useState("");
  const reframeMut = useMutation({ mutationFn: () => api.reframeThought({ day: dateKey, thought: thought.trim() }), onSuccess: () => { setThought(""); void invalidate(); } });

  // Proof
  const [proofText, setProofText] = useState("");
  const [proofKind, setProofKind] = useState("manual");
  const addProofMut = useMutation({ mutationFn: () => api.addProofEntry({ kind: proofKind, text: proofText.trim() }), onSuccess: () => { setProofText(""); void invalidate(); } });
  const showProofMut = useMutation({ mutationFn: () => api.showProof({ day: dateKey }) });

  // Sunday letter
  const letterMut = useMutation({ mutationFn: (force: boolean) => api.sundayLetter({ day: dateKey, weekKey, force }), onSuccess: () => void invalidate() });
  const letterBody = letterMut.data?.body ?? state?.letter?.body ?? null;
  const isSunday = new Date(`${dateKey}T12:00:00`).getDay() === 0;

  const tools: Array<{ key: HsTool; label: string }> = [
    { key: "chat", label: "Chat" },
    { key: "identity", label: "Identity" },
    { key: "facts", label: "Facts" },
    { key: "reframe", label: "Reframe" },
    { key: "proof", label: "Proof" },
    { key: "letter", label: "Letter" },
  ];

  return (
    <main className="page hs-page">
      <section className="page-heading">
        <p className="eyebrow">THE VERSION OF YOU WHO ALREADY EXECUTES</p>
        <h1>Higher Self</h1>
        <p>Not a coach. The man who already did it, talking to the man who is drifting.</p>
      </section>

      <section className="hs-card" aria-labelledby="morning-heading">
        <div className="section-line"><div><p className="eyebrow">THIS MORNING, FROM YOUR HIGHER SELF</p><h2 id="morning-heading">{morning ? morning.title : "Morning message"}</h2></div></div>
        {morningQuery.isPending && !morning ? <p className="hs-empty">He is writing this morning's message…</p>
          : morning ? <>
            <p className="hs-body">{morning.body}</p>
            <p className="hs-body"><b>First move:</b> {morning.action}</p>
          </>
          : <p className="hs-empty">No morning message yet.</p>}
        {morningMut.isError && <p className="inline-error" role="alert">Could not write a fresh message yet.</p>}
        <button type="button" className="hs-secondary" disabled={morningMut.isPending} onClick={() => morningMut.mutate()}>{morningMut.isPending ? "Writing…" : "Rewrite today's message"}</button>
      </section>

      {profile?.identityStatement && (
        <section className="hs-card hs-identity-banner" aria-label="Your identity statement">
          <p className="eyebrow">WHO I AM BECOMING</p>
          <p className="hs-identity-text">{profile.identityStatement}</p>
        </section>
      )}

      <div className="hs-tools" role="tablist" aria-label="Higher Self tools">
        {tools.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tool === t.key} className={tool === t.key ? "active" : ""} onClick={() => setTool(t.key)}>{t.label}</button>
        ))}
      </div>

      {tool === "chat" && (
        <section className="hs-card" aria-labelledby="hs-chat-heading">
          <h2 id="hs-chat-heading" className="hs-sr">Ask your Higher Self</h2>
          <div className="chat-thread" aria-live="polite" aria-label="Conversation with your Higher Self">
            {(!state || state.chat.length === 0) && <div className="be-intro"><strong>say it straight.</strong><p>what is actually going on today? he answers from your identity, your facts, your Big 3, and your record.</p></div>}
            {(state?.chat ?? []).map((m) => (
              <article className={`chat-bubble ${m.role === "user" ? "user" : "assistant"}`} key={m.id}>
                <span>{m.role === "user" ? "You" : "Higher Self"}</span><p>{m.content}</p>
              </article>
            ))}
            {chatMut.isPending && <article className="chat-bubble assistant pending"><span>Higher Self</span><p>thinking…</p></article>}
          </div>
          {chatMut.isError && <p className="inline-error" role="alert">Your Higher Self could not answer right now. Your message is still here.</p>}
          <div className="chat-compose">
            <label htmlFor="hs-message">Message your Higher Self</label>
            <textarea id="hs-message" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="say it straight…" rows={3} maxLength={2000} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const c = draft.trim(); if (c && !chatMut.isPending) chatMut.mutate(c); } }} />
            <button type="button" onClick={() => { const c = draft.trim(); if (c && !chatMut.isPending) chatMut.mutate(c); }} disabled={!draft.trim() || chatMut.isPending}>{chatMut.isPending ? "Sending…" : "Send"}</button>
          </div>
        </section>
      )}

      {tool === "identity" && (
        <section className="hs-card" aria-labelledby="identity-heading">
          <div className="section-line"><div><p className="eyebrow">IDENTITY · WHO YOU ARE BECOMING</p><h2 id="identity-heading">Identity</h2></div></div>
          <div className="hs-form">
            <label><span>Who my Higher Self is, in my words</span><textarea value={identity} onChange={(e) => setIdentity(e.target.value)} rows={3} maxLength={600} placeholder="The man I am becoming, written plainly." aria-label="Identity statement" /></label>
            <label><span>My pattern (optional)</span><input value={pattern} onChange={(e) => setPattern(e.target.value)} maxLength={120} placeholder="e.g. Overthinker" aria-label="My pattern" /></label>
            <label><span>My values, one per line</span><textarea value={values} onChange={(e) => setValues(e.target.value)} rows={3} maxLength={600} aria-label="My values" /></label>
            <label><span>My non-negotiables</span><textarea value={nonNeg} onChange={(e) => setNonNeg(e.target.value)} rows={2} maxLength={600} aria-label="My non-negotiables" /></label>
            <label><span>My Higher Self never…</span><textarea value={never} onChange={(e) => setNever(e.target.value)} rows={2} maxLength={600} aria-label="My Higher Self never" /></label>
            {identityMut.isError && <p className="inline-error" role="alert">Could not save yet. Your words are still here.</p>}
            <button type="button" className="save-checkin" disabled={identityMut.isPending} onClick={() => identityMut.mutate()}>{identityMut.isPending ? "Saving…" : identityMut.isSuccess ? "Saved ✓" : "Save identity"}</button>
          </div>
        </section>
      )}

      {tool === "facts" && (
        <section className="hs-card" aria-labelledby="facts-heading">
          <div className="section-line"><div><p className="eyebrow">WHAT YOUR HIGHER SELF KNOWS</p><h2 id="facts-heading">Facts about me</h2></div><span className="ritual-total">{state?.facts.length ?? 0}</span></div>
          <p className="hs-dim">Facts you save here ground every answer, verdict, and letter. Nothing is pre-filled. Add only what is true.</p>
          <form className="parking-entry" onSubmit={(e) => { e.preventDefault(); if (newFact.trim()) addFactMut.mutate(); }}>
            <input value={newFact} onChange={(e) => setNewFact(e.target.value)} maxLength={280} placeholder="Add a fact he should never forget" aria-label="New fact" />
            <button type="submit" disabled={!newFact.trim() || addFactMut.isPending}>Add</button>
          </form>
          {(!state || state.facts.length === 0) ? <p className="hs-empty">No facts yet. The first one you add starts his memory.</p>
            : <div className="hs-fact-list">{state.facts.map((f) => (
              <div className="hs-fact-row" key={f.id}>
                {editingFactId === f.id ? <>
                  <input value={editingFactText} onChange={(e) => setEditingFactText(e.target.value)} maxLength={280} aria-label="Edit fact" />
                  <button type="button" onClick={() => updateFactMut.mutate()} disabled={!editingFactText.trim() || updateFactMut.isPending}>Save</button>
                  <button type="button" onClick={() => setEditingFactId(null)}>Cancel</button>
                </> : <>
                  <span>{f.fact}</span>
                  <button type="button" aria-label={`Edit fact: ${f.fact}`} onClick={() => { setEditingFactId(f.id); setEditingFactText(f.fact); }}>Edit</button>
                  <button type="button" aria-label={`Delete fact: ${f.fact}`} onClick={() => deleteFactMut.mutate(f.id)}>Delete</button>
                </>}
              </div>
            ))}</div>}
        </section>
      )}

      {tool === "reframe" && (
        <section className="hs-card" aria-labelledby="reframe-heading">
          <div className="section-line"><div><p className="eyebrow">REFRAME · LOWER SELF vs HIGHER SELF</p><h2 id="reframe-heading">Reframe a thought</h2></div></div>
          <div className="hs-form">
            <label><span>What did your lower self just say?</span><textarea value={thought} onChange={(e) => setThought(e.target.value)} rows={2} maxLength={500} placeholder="Say it the way it sounded in your head." aria-label="Thought to reframe" /></label>
            {reframeMut.isError && <p className="inline-error" role="alert">Could not reframe that yet. Your thought is still here.</p>}
            <button type="button" className="save-checkin" disabled={thought.trim().length < 3 || reframeMut.isPending} onClick={() => reframeMut.mutate()}>{reframeMut.isPending ? "Your Higher Self is answering…" : "Hear my Higher Self"}</button>
          </div>
          {(state?.reframes ?? []).length > 0 && <div className="hs-reframe-list">
            {state!.reframes.map((r) => (
              <div className="hs-reframe-pair" key={r.id}>
                <div className="hs-reframe-thought"><span>Lower self</span><p>{r.thought}</p></div>
                <div className="hs-reframe-answer"><span>Higher Self</span><p>{r.answer}</p></div>
              </div>
            ))}
          </div>}
        </section>
      )}

      {tool === "proof" && (
        <section className="hs-card" aria-labelledby="proof-heading">
          <div className="section-line"><div><p className="eyebrow">PROOF LOG · EVIDENCE, NOT PROMISES</p><h2 id="proof-heading">Proof</h2></div><span className="ritual-total">{state?.proof.length ?? 0}</span></div>
          <div className="hs-form">
            <label><span>Kind</span>
              <select value={proofKind} onChange={(e) => setProofKind(e.target.value)} aria-label="Proof kind">
                <option value="manual">Win</option>
                <option value="frog">Frog</option>
                <option value="workout">Workout</option>
                <option value="decision">Decision</option>
                <option value="big3">Big 3</option>
                <option value="checkin">Check-in</option>
              </select>
            </label>
            <label><span>What happened?</span><textarea value={proofText} onChange={(e) => setProofText(e.target.value)} rows={2} maxLength={300} placeholder="One real win, stated as evidence." aria-label="Proof entry" /></label>
            <button type="button" className="save-checkin" disabled={proofText.trim().length < 3 || addProofMut.isPending} onClick={() => addProofMut.mutate()}>{addProofMut.isPending ? "Saving…" : "Add proof"}</button>
          </div>
          <button type="button" className="hs-secondary" disabled={showProofMut.isPending} onClick={() => showProofMut.mutate()}>{showProofMut.isPending ? "Reading your record…" : "Show me proof"}</button>
          {showProofMut.data && <p className="hs-body hs-proof-readback">{showProofMut.data.text}</p>}
          {(!state || state.proof.length === 0) ? <p className="hs-empty">No proof logged yet. Eat the frog, finish a workout, or lock a decision and log it here.</p>
            : <div className="hs-proof-list">{state.proof.map((p) => (
              <div className="hs-proof-row" key={p.id}><span className="hs-proof-kind">{p.kind}</span><span>{p.text}</span><time>{new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></div>
            ))}</div>}
        </section>
      )}

      {tool === "letter" && (
        <section className="hs-card" aria-labelledby="letter-heading">
          <div className="section-line"><div><p className="eyebrow">THE SUNDAY LETTER</p><h2 id="letter-heading">Sunday letter</h2></div></div>
          {!isSunday && !letterBody && <p className="hs-dim">The letter is written on Sundays, from the week's record: decisions kept, proof added, who was driving. Come back Sunday, or generate this week's early below.</p>}
          {letterBody ? <p className="hs-body hs-letter-body">{letterBody}</p> : <p className="hs-empty">No letter for this week yet.</p>}
          {letterMut.isError && <p className="inline-error" role="alert">The letter did not write yet. Try again.</p>}
          <button type="button" className="save-checkin" disabled={letterMut.isPending} onClick={() => letterMut.mutate(Boolean(letterBody))}>{letterMut.isPending ? "Writing…" : letterBody ? "Rewrite this week's letter" : "Generate this week's letter"}</button>
        </section>
      )}

      <p className="hs-crisis">{CRISIS_TEXT}</p>
    </main>
  );
}
