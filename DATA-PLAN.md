# Data Plan

## User-owned data
- Workout sessions, set performance, pain flags, settings, and daily rituals are entered by the user and stored in the artifact database.
- Daily morning rituals (expanded 2026-10-10 at the user's request): `ritual_days` now tracks five habits — sunlight, meditation, visualization, chewing gum (`chewing_gum`), and standing on one foot (`one_foot_stand`, 30s per side balance) — each with its own daily check-off and streak, added by migration 0013. No history is seeded for the new habits; they start unchecked.
- The bodyweight primer and dumbbell program are fixed program definitions; they do not create workout history until the user logs a session.
- Hybrid dumbbell + pull-up bar program (added 2026-10-08, the user's "choose the middle" call): Session 0 / retest assessment results (hang time, scap pulls, push-ups + surface, split squats per leg, chair squats, sit-and-reach, squat hold, wall test) are user-entered and stored in `assessments`; they set the chin-up and push-up ladder rungs. Session 0 is optional calibration (fixed 2026-10-09 after the user reported the app "doesn't have workouts"): the A/B workouts follow the Mon/Wed/Fri strength, Tue/Thu/Sat aerobic, Sunday rest schedule whether or not an assessment exists, running on starter rungs (chin-up stage 1, hands-elevated push-ups, bodyweight split squats) until Session 0 is saved. Daily flexibility-block completion and hold duration are stored in `flexibility_days`. Aerobic-day completion is stored as an `aerobic` session row.
- Equipment is user-confirmed and editable in the app: a pair of adjustable dumbbells, 10 to about 20 lb each (spin-lock with plates), one single 25 lb dumbbell, and a door-mounted pull-up bar. Seeded in `settings` (dumbbell_description, bar_type) by migration 0010 and editable via the equipment panel; Week 1 starting loads in the program definitions use only these implements.
- Wake-time tracking (added 2026-10-09, the "full fix" for the Focus tab): the user's wake time and an optional target wake time are stored per day on `daily_focus` (`wake_time`, `wake_target`, migration 0011), entered via the Focus-tab wake card (time inputs or an "I'm up now" button) or natural-language quick capture ("woke 5:40"). The card shows the last 7 days and a streak of days at or before target. No wake data is seeded.
- Big 3 lock + midday tripwire (cleaned up 2026-10-09, the "full fix"): locking a Big 3 stores the frog, its reason, and tasks 2–3 on `daily_focus`; all three outcomes plus the reason are required in both the client and the server before a plan can lock. Re-locking a *different* frog the same day resets that frog's started/completed state (and any focus timer still pointing at the old frog) so a fresh task never inherits the old one's progress; editing with unchanged values preserves state, and the editor can be cancelled back to the locked plan. From 1 PM, if the locked frog is named but not started or completed, the Focus tab shows a tripwire banner that names the frog, reports any side tasks already parked that day, and offers a one-tap start.
- Time to needle (added 2026-10-09, the "full fix"): `getFocusState` derives each day's delay from that day's logged wake time to `frogStartedAt` (converted to America/Los_Angeles time of day) — no new storage. The wake card shows today's delay and the last 7 days; a day counts only when both a wake time and a frog start exist and the start is not before the wake time.

- Nightly check (added 2026-10-15 at the user's request): an evening section on the Focus (check-in) tab with three short text fields saved per date in `nightly_checks` (migration 0014) — "Something good I did" (`something_good`), "Something hard I faced" (`something_hard`), and "Something kind" (`something_kind`). Editable the same night via upsert on `date_key`, and past nightly checks appear in History alongside daily check-ins. No data is seeded.

## Higher Self + Decider (ported 2026-10-15 from the higher-self app)
- The former "Be" coach chat is now framed entirely as the user's **Higher Self** — the version of him who already executes. The Higher Self tab replaces the old chat tab and the Strengths tab. All content is user-owned and stored server-side in the artifact database; production starts empty — no facts, identity, proof, chat, reframes, letters, or decisions are seeded (unlike the source app, which seeded 18 facts for itself; those were deliberately NOT copied).
- Tables (migration 0016): `decisions` (Decider: dilemma, options JSON, Higher Self pick/reasoning/pattern note/first step, commitment, if-then, revisit date, outcome, followed-through flag, status open/locked/reviewed, reopen count, `date_key` per decision), `hs_profile` (singleton: pattern, identity statement, values, non-negotiables, never-does), `hs_facts` (persistent facts about the user that power the twin; add/update/delete), `hs_proof` (proof-log entries: kind + text; also written automatically when a decision is locked or followed through), `hs_chat_messages` (Ask Higher Self conversation, persisted server-side; replaces the old localStorage chat history), `hs_reframes` (lower-self thought + Higher Self reframe pairs), `hs_letters` (Sunday letter, one per Sunday-anchored `week_key`), `hs_app_meta` (per-day cache for the morning message).
- Actions mirror the source app's semantics: `getHigherSelfState`, `askHigherSelf` (crisis messages short-circuit to a fixed 988 response and never reach the model; durable facts stated in chat can be auto-saved to `hs_facts`), `createDecision` / `lockDecision` / `reviewDecision` / `reopenDecision` / `deleteDecision`, `addFact` / `updateFact` / `deleteFact`, `saveIdentity` / `saveProfile`, `addProofEntry` / `showProof`, `reframeThought`, `morningMessage` (cached per day), `sundayLetter` (cached per week). The legacy `chatWithCoach` action remains but is reframed as Higher Self; the UI uses `askHigherSelf`. Model inference runs only via `ctx.inference` inside these actions, grounded in the user's own focus, wellness, nightly-check, workout, and Higher Self data — nothing external is fetched.
- The Decider lives in the Focus tab below Rituals: create a decision (dilemma + 2–6 options + optional forced pick), get the Higher Self verdict, lock it with a commitment/if-then/revisit date, review it later with an outcome and followed-through flag, reopen or delete. Open/locked decisions list above reviewed history.

## Strengths section (UI removed 2026-10-15 at the user's request; data retained)
- The Strengths tab, top-five sorter, official results, reflections, and commitments views were removed from the app experience on 2026-10-15. The underlying stored data is untouched: `strengths_profiles`, `strengths_reflections`, `strengths_commitments`, and `strengths_sorter_results` keep all existing rows, and their server actions remain in place. Only the user-facing section and entry points were removed.
- For the record: the section was integrated 2026-10-10 from the strengths finder app. The 34 themes, 4 domains, theme descriptions, and sorter statements shipped with the client (`strengthsThemes.ts`, `strengthsAssessment.ts`) as original paraphrases inspired by *StrengthsFinder 2.0*. The in-app sorter was labeled throughout as a reflective preview, not Gallup-validated; official Gallup results entered by the user were the gold path. No Gallup assessment text was reproduced and no external source was fetched.

## Build-time exercise demonstration images
Images are downloaded into `client/src/assets/` and shipped with the artifact. Each visible demo links to its source page.

- Push-Up: https://solnutrition.com/blogs/gut-health-metabolism/skinny-me-full-body-beginner-workout
- Chair Dip: https://www.fitnessai.co/exercise/chair-dip
- Pike Push-Up: https://boxlifemagazine.com/pike-push-up-progression/
- Bodyweight Squat: https://www.endomondo.com/exercise/bodyweight-squat
- Reverse Lunge: https://www.hevyapp.com/exercises/reverse-lunge/
- Glute Bridge: https://bootylabinc.com/glute-bridge/
- Plank: https://www.hingehealth.com/resources/articles/plank/
- Bird Dog: https://www.tomsguide.com/how-to/bird-dog-exercise-what-is-it-and-how-does-it-help-build-core-strength

Session A / B demo images (added 2026-10-09, the "full fix"; every A/B movement now has a demo, verified visually against the movement before shipping):

- Rear-Foot-Elevated Split Squat / Bulgarian Split Squat: https://www.angrylionfitness.com/the-10-best-quadricep-exercises/
- Dead Hang: https://www.tomecontroldesusalud.com/2024-04-05-l-dead-hang/
- Scap Pull: https://www.inspireusafoundation.org/scapular-pull-ups/
- Chin-Up / Chin-Up Negatives: https://viral-chatter.com/80-of-adults-will-face-back-pain-try-these-18-workouts-for-a-stronger-healthier-back/
- Assisted Chin-Up (foot-assisted, the program's prescribed leg-help method): http://dieringe.com/exercises/assisted-pull-ups
- Dumbbell Floor Press: https://www.mensfitness.com/training/the-best-chest-workouts-for-men-20150514
- Single-Leg Romanian Deadlift: https://www.pinterest.fr/mikeudem/
- Dumbbell Lateral Raise: https://kinxlearning.com/pages/lateral-dumbbell-arm-raise
- Dead Bug: https://www.decathloncoach.com/fr/home/coaching/sport-program/a8364aaee015b6c230d2
- Hanging Knee Raise: https://hortonbarbell.com/hanging-knee-raise/
- Goblet Squat: https://stage.eatthis.com/best-exercises-over-60/
- Dumbbell Overhead Press: https://traineatrepeat.com/exercises/dumbbell-overhead-press
- One-Arm Dumbbell Row: https://workoutguru.fit/exercises/dumbbell-one-arm-row-rack-support-video-exercise-guide-tips-123612/
- Dumbbell Hip Thrust: https://gymingdaily.com/18-resistance-training-exercises-for-full-body-tone/
- Overhead Triceps Extension: https://workoutguru.fit/exercises/dumbbell-seated-single-arm-overhead-triceps-extension-left-video-exercise-guide-tips-615912/
- Dumbbell Curl: https://strengthlevel.com/exercises/dumbbell-curl
- Single-Leg Calf Raise: https://workoutguru.fit/exercises/single-leg-calf-raise-off-step-video-exercise-guide-tips-505212/
- Push-Up (Hands Elevated): https://fitnessvolt.com/category/training/body-mechanics/page/5/
- Push-Up (Feet Elevated): https://www.sfd.pl/post-p4117425.html
