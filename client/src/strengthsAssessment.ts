// Reflective sorter inspired by the themes in StrengthsFinder 2.0:
// the 34 themes, their domains, taglines and essences in themes.ts.
// This is an original reflective exercise written for this app. It does NOT
// use Gallup's method, Gallup's questions, or Gallup's scoring, and its
// results are a preview for reflection — not Gallup-validated
// CliftonStrengths results. All statements are original paraphrases; no
// Gallup assessment text is reproduced.
//
// Hybrid sorter design (3 stages):
//  Stage 1 — Broad round: 34 paired statements. Each of the 34 themes appears
//    exactly twice, so every theme gets an equal number of scored matchups.
//    Four of the pairs are silently repeated later in the round (sides
//    swapped, unscored) as consistency probes. Only the Stage 1 top 10
//    advance — the later stages exist to separate those contenders with far
//    more evidence, not to rescue themes the broad round ranked low.
//  Stage 2 — Head to head: the top 10 contenders from Stage 1 face each other
//    in a round-robin of extra pairs built from additional original
//    statements, so the leaders are separated by direct comparison instead
//    of two lucky matchups.
//  Stage 3 — Behavior checks: each contender is rated on how often it shows
//    up in real life, how natural/effortless it feels, and how much energy
//    it gives — because a theme you admire but never live is not a strength.

export interface AssessmentOption {
  theme: string;
  text: string;
}

export interface AssessmentQuestion {
  id: number;
  a: AssessmentOption;
  b: AssessmentOption;
}

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  { id: 1, a: { theme: "Achiever", text: "I measure a good day by what I got done — I need a finish line and I work hard to cross it." }, b: { theme: "Adaptability", text: "I do my best work in the moment — I would rather respond to what is happening now than follow a fixed plan." } },
  { id: 2, a: { theme: "Achiever", text: "I have a relentless daily drive — I reset every morning ready to accomplish more." }, b: { theme: "Arranger", text: "I juggle many moving parts at once and reconfigure on the fly when plans break." } },
  { id: 3, a: { theme: "Arranger", text: "When things get complicated, I love rearranging people, tasks, and resources until it all clicks." }, b: { theme: "Connectedness", text: "I sense how people and events are linked — what we do here ripples further than we can see." } },
  { id: 4, a: { theme: "Belief", text: "My principles do not shift with trends — family, integrity, and service guide how I live and work." }, b: { theme: "Consistency", text: "I spot imbalance quickly — I want processes that are even-handed and predictable for everyone." } },
  { id: 5, a: { theme: "Belief", text: "I only feel right about work that lines up with my core values — purpose matters more than profit or praise." }, b: { theme: "Developer", text: "Nothing satisfies me like watching someone grow — I notice small progress in people and want to nurture more of it." } },
  { id: 6, a: { theme: "Consistency", text: "Fairness matters deeply to me — clear rules, applied the same way to everyone, build trust." }, b: { theme: "Empathy", text: "I can feel what others are feeling, often before they say it — people's emotions are information I naturally pick up." } },
  { id: 7, a: { theme: "Deliberative", text: "I anticipate what could go wrong and reduce the risk before moving forward." }, b: { theme: "Discipline", text: "Disorder feels like lost control — my checklists and precise plans keep everything in its place." } },
  { id: 8, a: { theme: "Deliberative", text: "I am careful for a reason — I spot risks early and think hard before I choose a path." }, b: { theme: "Harmony", text: "I steer people toward common ground — I would rather find a practical agreement than win an argument." } },
  { id: 9, a: { theme: "Discipline", text: "I break goals into ordered steps, timelines, and routines — order helps me execute without waste." }, b: { theme: "Includer", text: "I notice who is on the outside of a group and instinctively make room for them to belong." } },
  { id: 10, a: { theme: "Focus", text: "I stay on track for months at a time, correcting course fast when I drift from a priority." }, b: { theme: "Responsibility", text: "I take psychological ownership of my commitments — I feel uncomfortable until they are honored." } },
  { id: 11, a: { theme: "Focus", text: "Once I set a goal, I filter everything through it — if it does not move me toward the target, it waits." }, b: { theme: "Individualization", text: "I study what makes each person unique and tailor how I work with them — one size fits no one." } },
  { id: 12, a: { theme: "Responsibility", text: "If I said I would do it, I will — my word is a bond and I own it when I fall short." }, b: { theme: "Positivity", text: "I bring energy and encouragement to a room — I am quick to praise what is good and keep spirits up." } },
  { id: 13, a: { theme: "Restorative", text: "Analyzing symptoms to find the underlying fault and bringing things back to life is deeply satisfying." }, b: { theme: "Activator", text: "I turn thoughts into action — my energy pulls others off the sidelines and gets things started." } },
  { id: 14, a: { theme: "Restorative", text: "I get energized by fixing what is broken — a failing process or struggling project pulls me in." }, b: { theme: "Relator", text: "I invest in a few deep, trusted relationships rather than spreading myself across a wide crowd." } },
  { id: 15, a: { theme: "Activator", text: "I would rather start now and learn by doing — waiting for a perfect plan drains my energy." }, b: { theme: "Analytical", text: "I need proof — I search for causes, weigh the data, and challenge claims that do not hold up." } },
  { id: 16, a: { theme: "Command", text: "Confrontation does not intimidate me — avoiding the truth feels riskier than facing it directly." }, b: { theme: "Communication", text: "Whether speaking or writing, I hold attention and make dry information feel alive." } },
  { id: 17, a: { theme: "Command", text: "In a stalemate or crisis, I step forward, say what is true, and make the call." }, b: { theme: "Context", text: "I understand the present by studying how we got here — history and precedent guide my decisions." } },
  { id: 18, a: { theme: "Communication", text: "I find the words that make ideas stick — stories, vivid language, and a message people remember." }, b: { theme: "Futuristic", text: "I am pulled by a vivid picture of what could be — imagining a better future energizes my work today." } },
  { id: 19, a: { theme: "Competition", text: "I constantly measure myself against others' performance — comparison clarifies my effort." }, b: { theme: "Maximizer", text: "I am drawn to strength in people and work, and I invest in refining it rather than fixing what is merely adequate." } },
  { id: 20, a: { theme: "Competition", text: "I play to win — a rival and a scoreboard make me work harder and sharper." }, b: { theme: "Ideation", text: "Ideas themselves fascinate me — I love finding the hidden connection between two unrelated things." } },
  { id: 21, a: { theme: "Maximizer", text: "Good is not enough — I would rather polish something strong into something exceptional." }, b: { theme: "Input", text: "I collect ideas, articles, facts, and resources — you never know which stored piece will be crucial later." } },
  { id: 22, a: { theme: "Self-Assurance", text: "I have an internal compass I follow — my instincts and decisions feel certain from the inside." }, b: { theme: "Significance", text: "Impact drives me more than comfort — I aim for a legacy, not just a living." } },
  { id: 23, a: { theme: "Self-Assurance", text: "I trust my own judgment deeply — I can decide and stand by it even when others waver." }, b: { theme: "Intellection", text: "I need time alone to think — ideas need exercise in my mind, and I return sharper after reflection." } },
  { id: 24, a: { theme: "Significance", text: "I want my work to matter and be recognized for its impact — I am building something that counts." }, b: { theme: "Learner", text: "I love the journey from novice to competent — learning something new energizes me more than already knowing it." } },
  { id: 25, a: { theme: "Woo", text: "Social rooms give me energy — meeting new people and finding common ground is play for me." }, b: { theme: "Adaptability", text: "I discover my future one present choice at a time — when the day veers, I veer with it without distress." } },
  { id: 26, a: { theme: "Woo", text: "Strangers energize me — I break the ice fast and win people over within minutes of meeting." }, b: { theme: "Strategic", text: "I quickly spot the best route to a goal and discard the paths that would waste effort." } },
  { id: 27, a: { theme: "Connectedness", text: "Few things feel like coincidence to me — I feel a responsibility to others and to the whole." }, b: { theme: "Developer", text: "I see potential in others that they may not see yet — no improvement is too small to celebrate." } },
  { id: 28, a: { theme: "Empathy", text: "I hear the unvoiced question and the feeling under the words — people feel understood around me." }, b: { theme: "Harmony", text: "Conflict feels like wasted energy — I look for where people already agree and build from there." } },
  { id: 29, a: { theme: "Includer", text: "Exclusion feels wrong at a gut level — I widen circles so no one is left looking in." }, b: { theme: "Individualization", text: "Generalizations miss the point for me — I notice how each person thinks, learns, and is motivated." } },
  { id: 30, a: { theme: "Positivity", text: "Enthusiasm is contagious and I bring it — life and work feel better lived as a celebration." }, b: { theme: "Relator", text: "I am drawn to people I already know and trust, and I make those bonds deeper and more honest." } },
  { id: 31, a: { theme: "Analytical", text: "I think rigorously about cause and effect — assertion without evidence does not move me." }, b: { theme: "Context", text: "Before asking where to go, I ask how we got here — blueprints and backstory matter." } },
  { id: 32, a: { theme: "Futuristic", text: "When I describe what could be, people feel the urge to build it — my visions pull work forward." }, b: { theme: "Ideation", text: "Reframing a problem until a fresh angle appears is play for me — I love a novel perspective." } },
  { id: 33, a: { theme: "Input", text: "My mind is an archive I keep feeding — I am inquisitive and I save what might be useful someday." }, b: { theme: "Intellection", text: "I enjoy solitary reflection — mulling, journaling, and debating myself — for its own sake." } },
  { id: 34, a: { theme: "Learner", text: "The subject matters less than the learning itself — courses, skills, and new experiences stretch me in a good way." }, b: { theme: "Strategic", text: "Confronted with a goal, I pattern-spot relevant paths, discard dead ends, and stretch toward the best way through." } },
];

// value: -2 strongly B, -1 mostly B, 0 neutral / both equally, 1 mostly A, 2 strongly A
export type AnswerValue = -2 | -1 | 0 | 1 | 2;

export interface ScoredTheme {
  theme: string;
  score: number;
  strong: number; // count of strong picks, used as tie-breaker
}

export function scoreAssessment(answers: Record<number, AnswerValue>): ScoredTheme[] {
  const map = new Map<string, { score: number; strong: number }>();
  const ensure = (t: string) => {
    if (!map.has(t)) map.set(t, { score: 0, strong: 0 });
    return map.get(t)!;
  };
  // Seed every theme that appears so ranking covers all 34
  for (const q of ASSESSMENT_QUESTIONS) { ensure(q.a.theme); ensure(q.b.theme); }
  for (const q of ASSESSMENT_QUESTIONS) {
    const v = answers[q.id];
    if (v === undefined) continue;
    if (v > 0) { const s = ensure(q.a.theme); s.score += v; if (v === 2) s.strong += 1; }
    else if (v < 0) { const s = ensure(q.b.theme); s.score += Math.abs(v); if (v === -2) s.strong += 1; }
    else { ensure(q.a.theme).score += 0.5; ensure(q.b.theme).score += 0.5; }
  }
  return [...map.entries()]
    .map(([theme, v]) => ({ theme, score: v.score, strong: v.strong }))
    .sort((x, y) => y.score - x.score || y.strong - x.strong || x.theme.localeCompare(y.theme));
}

// ---------- Hybrid sorter: stages 2 & 3 ----------

// Extra original statements used for Stage 2 head-to-head pairs (contenders only).
export const EXTRA_STATEMENTS: Record<string, string> = {
  "Achiever": "Give me a target and a deadline — I come alive when there is something concrete to finish today.",
  "Adaptability": "When the plan falls apart, I shrug and find the new path in real time — change does not rattle me.",
  "Arranger": "I think in configurations — who should do what, in what order, with what resources — and I keep reshuffling until it sings.",
  "Belief": "If a job conflicts with what I stand for, no paycheck makes it feel right to me.",
  "Consistency": "I keep a mental ledger of who got what — uneven treatment bothers me until it is corrected.",
  "Developer": "I keep small notes on people's progress — seeing someone get 10% better genuinely makes my week.",
  "Deliberative": "Before I commit, I run the failure scenarios — what breaks, who gets hurt, what it costs.",
  "Discipline": "My calendar, lists, and routines are not bureaucracy — they are how I protect my focus.",
  "Empathy": "I walk into a room and immediately register its emotional weather — who is tense, who is relieved, who is faking fine.",
  "Focus": "Distractions are easy for me to refuse — I keep asking 'does this move the goal?' until the noise falls away.",
  "Harmony": "I translate between people who disagree — I find the sentence both sides can nod at.",
  "Includer": "The person standing alone at the edge of the event is the first person I go talk to.",
  "Individualization": "I remember what each person is good at and what they hate — and I use it when I ask things of them.",
  "Positivity": "I am the one who names what went right in the debrief — out loud, specifically, and first.",
  "Relator": "A long, honest conversation with one close friend beats a party with fifty acquaintances, every time.",
  "Responsibility": "If my name is on it, I lose sleep over it until it is done right — that pressure is self-imposed.",
  "Restorative": "Show me the broken thing — the leaking process, the stalled project — and watch me light up.",
  "Activator": "I am the person who says 'let's just try it this afternoon' while everyone else is still scheduling the meeting about it.",
  "Analytical": "I do not trust a conclusion until I have seen the numbers or the logic hold up under poking.",
  "Command": "When a decision has to be made and nobody will make it, I make it — and I can live with being unpopular for it.",
  "Communication": "Give me the boring update and ten minutes — I will turn it into a story people retell in the hallway.",
  "Competition": "Second place stings me more than losing outright — I study whoever beat me until I understand how.",
  "Context": "I ask 'what happened last time we tried this?' before I agree to anything new.",
  "Futuristic": "I keep a running movie in my head of how this could look in three years — and it pulls me through the dull parts.",
  "Ideation": "My favorite moment is the click when two unrelated ideas suddenly explain each other.",
  "Input": "I save the article, the screenshot, the quote — my archive is a tool, not clutter.",
  "Intellection": "My best thinking happens alone and unhurried — thinking is not my prep work, it is the work.",
  "Learner": "I sign up for the course before I know exactly why — the stretch from clueless to capable is the reward.",
  "Maximizer": "I would rather take our best performer's work from great to stunning than rescue the weakest link.",
  "Self-Assurance": "When everyone in the room doubts the call, I can still hear my own judgment clearly — and I follow it.",
  "Significance": "I ask of every project: will this matter in five years, and will anyone know it happened?",
  "Strategic": "I see the decision tree — if we do X, then Y opens and Z closes — several moves before most people see the first branch.",
  "Woo": "By the end of a first conversation, I usually know what we have in common and have a plan to meet again.",
  "Connectedness": "I choose the option that is better for the whole web of people affected, even when it is not best for me alone.",
};

// Stage 1 question ids repeated later in the round (sides swapped) as consistency probes.
export const REPEAT_IDS: number[] = [4, 13, 22, 31];

export interface PlayQuestion {
  key: string;
  aText: string;
  bText: string;
  aTheme: string;
  bTheme: string;
  repeatOf?: number; // stage-1 question id this repeats (sides swapped)
}

// Stage 1 play list: the 34 broad pairs, with 4 repeats woven in after question 20 and at the end.
export function buildStage1(): PlayQuestion[] {
  const base: PlayQuestion[] = ASSESSMENT_QUESTIONS.map(q => ({ key: `s1-${q.id}`, aText: q.a.text, bText: q.b.text, aTheme: q.a.theme, bTheme: q.b.theme }));
  const repeats: PlayQuestion[] = REPEAT_IDS.map(id => {
    const q = ASSESSMENT_QUESTIONS.find(x => x.id === id)!;
    return { key: `s1r-${id}`, aText: q.b.text, bText: q.a.text, aTheme: q.b.theme, bTheme: q.a.theme, repeatOf: id };
  });
  const out = [...base];
  // Insert repeats at spread positions (after Q20, Q26, Q32, and at the end)
  out.splice(20, 0, repeats[0]!);
  out.splice(27, 0, repeats[1]!);
  out.splice(34, 0, repeats[2]!);
  out.push(repeats[3]!);
  return out;
}

// Stage 2: full round-robin among the top 10 contenders (45 pairs), using the
// extra statements plus each theme's stage-1 statements, rotated for variety.
export function buildStage2(contenders: string[]): PlayQuestion[] {
  const usage = new Map<string, number>();
  const stmtFor = (theme: string): string => {
    const pool = [EXTRA_STATEMENTS[theme] ?? "", ...ASSESSMENT_QUESTIONS.filter(q => q.a.theme === theme).map(q => q.a.text), ...ASSESSMENT_QUESTIONS.filter(q => q.b.theme === theme).map(q => q.b.text)].filter(Boolean);
    const n = usage.get(theme) ?? 0;
    usage.set(theme, n + 1);
    return pool[n % pool.length]!;
  };
  const pairs: PlayQuestion[] = [];
  for (let i = 0; i < contenders.length; i++) {
    for (let j = i + 1; j < contenders.length; j++) {
      const t1 = contenders[i]!; const t2 = contenders[j]!;
      const flip = (i + j) % 2 === 1;
      pairs.push({
        key: `s2-${i}-${j}`,
        aText: flip ? stmtFor(t2) : stmtFor(t1),
        bText: flip ? stmtFor(t1) : stmtFor(t2),
        aTheme: flip ? t2 : t1,
        bTheme: flip ? t1 : t2,
      });
    }
  }
  return pairs;
}

// Score one play list into a theme -> points map (same scale as stage 1: strong 2, mostly 1, neutral 0.5 each).
export function scorePairs(pairs: PlayQuestion[], answers: Record<string, AnswerValue>): Map<string, { score: number; strong: number }> {
  const map = new Map<string, { score: number; strong: number }>();
  const ensure = (t: string) => { if (!map.has(t)) map.set(t, { score: 0, strong: 0 }); return map.get(t)!; };
  for (const p of pairs) {
    ensure(p.aTheme); ensure(p.bTheme);
    const v = answers[p.key];
    if (v === undefined) continue;
    if (v > 0) { const s = ensure(p.aTheme); s.score += v; if (v === 2) s.strong += 1; }
    else if (v < 0) { const s = ensure(p.bTheme); s.score += Math.abs(v); if (v === -2) s.strong += 1; }
    else { ensure(p.aTheme).score += 0.5; ensure(p.bTheme).score += 0.5; }
  }
  return map;
}

// Consistency: a repeat answer is consistent when it favors the same theme as the
// original at a similar strength (the repeat has sides swapped, so signs flip).
export function consistencyReport(stage1Answers: Record<string, AnswerValue>): { checked: number; consistent: number; flippedThemes: string[] } {
  let checked = 0; let consistent = 0; const flippedThemes: string[] = [];
  const themeOf = (q: AssessmentQuestion, v: AnswerValue) => (v > 0 ? q.a.theme : v < 0 ? q.b.theme : null);
  for (const id of REPEAT_IDS) {
    const orig = stage1Answers[`s1-${id}`];
    const rep = stage1Answers[`s1r-${id}`];
    if (orig === undefined || rep === undefined) continue;
    checked++;
    const q = ASSESSMENT_QUESTIONS.find(x => x.id === id)!;
    const t1 = themeOf(q, orig);
    // repeat sides are swapped: a positive repeat value favors the original b theme
    const t2 = rep > 0 ? q.b.theme : rep < 0 ? q.a.theme : null;
    let isConsistent = false;
    if (t1 === null && t2 === null) {
      isConsistent = true; // neutral both times
    } else if (t1 !== null && t2 !== null) {
      // both answers picked a side: consistent only for the same theme at a similar strength
      isConsistent = t1 === t2 && Math.abs(Math.abs(orig) - Math.abs(rep)) <= 1;
      if (!isConsistent && t1 !== t2) flippedThemes.push(t2);
    } else {
      // exactly one answer was neutral: a soft lean (Mostly) is tolerated,
      // but Neutral vs Strongly is a real contradiction
      const decisive = t1 === null ? rep : orig;
      isConsistent = Math.abs(decisive) <= 1;
      if (!isConsistent) flippedThemes.push((t1 ?? t2)!);
    }
    if (isConsistent) consistent++;
  }
  return { checked, consistent, flippedThemes };
}

// Stage 3 behavior checks: per contender, three 1–5 ratings.
export interface BehaviorRatings { frequency: number; ease: number; energy: number }

export const BEHAVIOR_DIMS: { key: keyof BehaviorRatings; label: string; low: string; high: string; prompt: (theme: string) => string }[] = [
  { key: "frequency", label: "How often", low: "Rarely", high: "Almost daily", prompt: (t) => `In the last month, how often did ${t} actually show up in your real days — not how often you wish it did?` },
  { key: "ease", label: "How natural", low: "I have to force it", high: "Effortless", prompt: (t) => `When ${t} shows up, how natural does it feel — like breathing, or like performing?` },
  { key: "energy", label: "Energy effect", low: "Drains me", high: "Energizes me", prompt: (t) => `After a stretch of using ${t}, do you feel drained or charged up?` },
];

// Final hybrid ranking across all 34 themes.
// Weights: Stage 1 (max ~4/theme) + Stage 2 head-to-head (contenders only, up to 9 matchups)
// + Stage 3 behavior bonus: average rating above neutral (3) adds up to +2, below subtracts up to −2.
export interface HybridScore extends ScoredTheme { stage1: number; stage2: number; behaviorBonus: number }

export function hybridRanking(
  stage1Pairs: PlayQuestion[], stage1Answers: Record<string, AnswerValue>,
  stage2Pairs: PlayQuestion[], stage2Answers: Record<string, AnswerValue>,
  behavior: Record<string, BehaviorRatings>,
): HybridScore[] {
  const s1 = scorePairs(stage1Pairs.filter(p => !p.repeatOf), stage1Answers);
  const s2 = scorePairs(stage2Pairs, stage2Answers);
  const all = new Set<string>();
  for (const q of ASSESSMENT_QUESTIONS) { all.add(q.a.theme); all.add(q.b.theme); }
  const rows: HybridScore[] = [...all].map(theme => {
    const a = s1.get(theme) ?? { score: 0, strong: 0 };
    const b = s2.get(theme) ?? { score: 0, strong: 0 };
    const beh = behavior[theme];
    const bonus = beh ? ((beh.frequency + beh.ease + beh.energy) / 3 - 3) : 0;
    return {
      theme,
      stage1: a.score,
      stage2: b.score,
      behaviorBonus: Math.round(bonus * 10) / 10,
      score: Math.round((a.score + b.score + bonus) * 10) / 10,
      strong: a.strong + b.strong,
    };
  });
  return rows.sort((x, y) => y.score - x.score || y.strong - x.strong || x.theme.localeCompare(y.theme));
}
