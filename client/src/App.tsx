import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";
import { DeciderSection, HigherSelfView } from "./HigherSelfView";
import { JournalView } from "./JournalView";
import pushUpImage from "./assets/push-up.jpg";
import chairDipImage from "./assets/chair-dip.jpg";
import pikePushUpImage from "./assets/pike-push-up.jpg";
import squatImage from "./assets/bodyweight-squat.jpg";
import reverseLungeImage from "./assets/reverse-lunge.jpg";
import gluteBridgeImage from "./assets/glute-bridge.jpg";
import plankImage from "./assets/plank.png";
import birdDogImage from "./assets/bird-dog.jpg";
import bulgarianSplitSquatImage from "./assets/bulgarian-split-squat.jpg";
import deadHangImage from "./assets/dead-hang.jpg";
import scapPullImage from "./assets/scap-pull.jpg";
import chinUpImage from "./assets/chin-up.jpg";
import assistedChinUpImage from "./assets/assisted-chin-up.jpg";
import floorPressImage from "./assets/dumbbell-floor-press.jpg";
import singleLegRdlImage from "./assets/single-leg-rdl.jpg";
import lateralRaiseImage from "./assets/dumbbell-lateral-raise.jpg";
import deadBugImage from "./assets/dead-bug.jpg";
import hangingKneeRaiseImage from "./assets/hanging-knee-raise.png";
import gobletSquatImage from "./assets/goblet-squat.jpg";
import overheadPressImage from "./assets/dumbbell-overhead-press.webp";
import oneArmRowImage from "./assets/one-arm-row.jpg";
import hipThrustImage from "./assets/dumbbell-hip-thrust.jpg";
import tricepsExtensionImage from "./assets/overhead-triceps-extension.jpg";
import dumbbellCurlImage from "./assets/dumbbell-curl.jpg";
import calfRaiseImage from "./assets/single-leg-calf-raise.jpg";
import inclinePushUpImage from "./assets/incline-push-up.jpg";
import declinePushUpImage from "./assets/decline-push-up.jpg";
import hammerCurlImage from "./assets/hammer-curl.jpg";
import dumbbellRdlImage from "./assets/dumbbell-rdl.webp";
import standingCalfRaiseImage from "./assets/standing-calf-raise.jpg";
import aerobicWalkImage from "./assets/aerobic-walk.webp";

type AppState = ApiResponse<typeof api, "getAppState">;
type FocusState = ApiResponse<typeof api, "getFocusState">;
type SessionType = "full_body" | "upper" | "lower" | "session_a" | "session_b" | "aerobic";
type Exercise = AppState["program"]["session_a"][number];
type DraftSet = { weight: string; reps: string; rpe: string; completed: boolean; missed: boolean };
type DraftExercise = { name: string; pain: boolean; sets: DraftSet[] };
type StoredSessionDraft = { requestId: string; sessionType: SessionType; exercises: DraftExercise[] };
type Tab = "focus" | "train" | "history" | "trends" | "higher";
type RitualKey = "sunlight" | "meditation" | "visualization" | "chewingGum" | "oneFootStand";

const ritualMeta: Array<{ key: RitualKey; title: string; detail: string }> = [
  { key: "sunlight", title: "Morning sunlight", detail: "5–10 min outdoors · no sunglasses" },
  { key: "meditation", title: "Meditation", detail: "10 min seated · breath focus" },
  { key: "visualization", title: "Visualization", detail: "5 min · next workout + strength goals" },
  { key: "chewingGum", title: "Chewing gum", detail: "Morning routine · chew gum after you get up" },
  { key: "oneFootStand", title: "Stand on one foot", detail: "Balance · 30s per side · near a wall for support" },
];

const exerciseImages: Partial<Record<string, { src: string; alt: string; source: string }>> = {
  "Push-Up": { src: pushUpImage, alt: "Athlete demonstrating a push-up with a straight body line", source: "https://solnutrition.com/blogs/gut-health-metabolism/skinny-me-full-body-beginner-workout" },
  "Chair Dip": { src: chairDipImage, alt: "Athlete demonstrating a chair dip", source: "https://www.fitnessai.co/exercise/chair-dip" },
  "Pike Push-Up": { src: pikePushUpImage, alt: "Athlete demonstrating the pike push-up position", source: "https://boxlifemagazine.com/pike-push-up-progression/" },
  "Bodyweight Squat": { src: squatImage, alt: "Athlete demonstrating a bodyweight squat", source: "https://www.endomondo.com/exercise/bodyweight-squat" },
  "Reverse Lunge": { src: reverseLungeImage, alt: "Athlete demonstrating a reverse lunge", source: "https://www.hevyapp.com/exercises/reverse-lunge/" },
  "Glute Bridge": { src: gluteBridgeImage, alt: "Athlete demonstrating a glute bridge", source: "https://bootylabinc.com/glute-bridge/" },
  "Plank": { src: plankImage, alt: "Athlete demonstrating a forearm plank", source: "https://www.hingehealth.com/resources/articles/plank/" },
  "Bird Dog": { src: birdDogImage, alt: "Athlete demonstrating the bird dog exercise", source: "https://www.tomsguide.com/how-to/bird-dog-exercise-what-is-it-and-how-does-it-help-build-core-strength" },
  "Rear-Foot-Elevated Split Squat": { src: bulgarianSplitSquatImage, alt: "Athlete demonstrating a rear-foot-elevated split squat holding dumbbells, start and lowered positions", source: "https://www.angrylionfitness.com/the-10-best-quadricep-exercises/" },
  "Bulgarian Split Squat": { src: bulgarianSplitSquatImage, alt: "Athlete demonstrating a Bulgarian split squat holding dumbbells, start and lowered positions", source: "https://www.angrylionfitness.com/the-10-best-quadricep-exercises/" },
  "Dead Hang": { src: deadHangImage, alt: "Athlete performing a dead hang from a pull-up bar with straight arms", source: "https://www.tomecontroldesusalud.com/2024-04-05-l-dead-hang/" },
  "Scap Pull": { src: scapPullImage, alt: "Anatomical illustration of a scapular pull-up on a bar, showing the shoulder blades pulling down", source: "https://www.inspireusafoundation.org/scapular-pull-ups/" },
  "Chin-Up": { src: chinUpImage, alt: "Athlete performing a chin-up with an underhand grip", source: "https://viral-chatter.com/80-of-adults-will-face-back-pain-try-these-18-workouts-for-a-stronger-healthier-back/" },
  "Chin-Up Negatives": { src: chinUpImage, alt: "Athlete at the top of a chin-up with an underhand grip, the start of the slow lowering phase", source: "https://viral-chatter.com/80-of-adults-will-face-back-pain-try-these-18-workouts-for-a-stronger-healthier-back/" },
  "Assisted Chin-Up": { src: assistedChinUpImage, alt: "Athlete performing a foot-assisted pull-up on a low bar, feet on the ground providing leg help", source: "http://dieringe.com/exercises/assisted-pull-ups" },
  "Dumbbell Floor Press": { src: floorPressImage, alt: "Athlete demonstrating a dumbbell floor press lying on the floor, press and lowered positions", source: "https://www.mensfitness.com/training/the-best-chest-workouts-for-men-20150514" },
  "DB Floor Press": { src: floorPressImage, alt: "Athlete demonstrating a dumbbell floor press lying on the floor, press and lowered positions", source: "https://www.mensfitness.com/training/the-best-chest-workouts-for-men-20150514" },
  "Single-Leg Romanian Deadlift": { src: singleLegRdlImage, alt: "Athlete demonstrating a single-leg Romanian deadlift with dumbbells, standing and hinged positions", source: "https://www.pinterest.fr/mikeudem/" },
  "Dumbbell Lateral Raise": { src: lateralRaiseImage, alt: "Illustration of a dumbbell lateral raise, arms at the sides and raised to shoulder height", source: "https://kinxlearning.com/pages/lateral-dumbbell-arm-raise" },
  "DB Lateral Raise": { src: lateralRaiseImage, alt: "Illustration of a dumbbell lateral raise, arms at the sides and raised to shoulder height", source: "https://kinxlearning.com/pages/lateral-dumbbell-arm-raise" },
  "Dead Bug": { src: deadBugImage, alt: "Athlete demonstrating the dead bug exercise on a mat, opposite arm and leg extended", source: "https://www.decathloncoach.com/fr/home/coaching/sport-program/a8364aaee015b6c230d2" },
  "Hanging Knee Raise": { src: hangingKneeRaiseImage, alt: "Athlete performing a hanging knee raise from a pull-up bar with knees tucked up", source: "https://hortonbarbell.com/hanging-knee-raise/" },
  "Goblet Squat": { src: gobletSquatImage, alt: "Athlete demonstrating a goblet squat holding a dumbbell at the chest at full depth", source: "https://stage.eatthis.com/best-exercises-over-60/" },
  "Dumbbell Overhead Press": { src: overheadPressImage, alt: "Athlete demonstrating a dumbbell overhead press, dumbbells at shoulder height and pressed overhead", source: "https://traineatrepeat.com/exercises/dumbbell-overhead-press" },
  "Standing DB Overhead Press": { src: overheadPressImage, alt: "Athlete demonstrating a standing dumbbell overhead press", source: "https://traineatrepeat.com/exercises/dumbbell-overhead-press" },
  "One-Arm Dumbbell Row": { src: oneArmRowImage, alt: "Illustration of a one-arm dumbbell row with the other arm braced for support", source: "https://workoutguru.fit/exercises/dumbbell-one-arm-row-rack-support-video-exercise-guide-tips-123612/" },
  "Single-Arm DB Row": { src: oneArmRowImage, alt: "Illustration of a single-arm dumbbell row with the other arm braced for support", source: "https://workoutguru.fit/exercises/dumbbell-one-arm-row-rack-support-video-exercise-guide-tips-123612/" },
  "Dumbbell Hip Thrust": { src: hipThrustImage, alt: "Athlete demonstrating a dumbbell hip thrust with upper back on a bench and a dumbbell on the hips", source: "https://gymingdaily.com/18-resistance-training-exercises-for-full-body-tone/" },
  "Overhead Triceps Extension": { src: tricepsExtensionImage, alt: "Illustration of a seated overhead dumbbell triceps extension", source: "https://workoutguru.fit/exercises/dumbbell-seated-single-arm-overhead-triceps-extension-left-video-exercise-guide-tips-615912/" },
  "Overhead DB Triceps Extension": { src: tricepsExtensionImage, alt: "Illustration of a seated overhead dumbbell triceps extension", source: "https://workoutguru.fit/exercises/dumbbell-seated-single-arm-overhead-triceps-extension-left-video-exercise-guide-tips-615912/" },
  "Dumbbell Curl": { src: dumbbellCurlImage, alt: "Illustration of a standing dumbbell curl with the biceps highlighted", source: "https://strengthlevel.com/exercises/dumbbell-curl" },
  "Single-Leg Calf Raise": { src: calfRaiseImage, alt: "Illustration of a single-leg calf raise on a step with wall support, calf highlighted", source: "https://workoutguru.fit/exercises/single-leg-calf-raise-off-step-video-exercise-guide-tips-505212/" },
  "Push-Up (Hands Elevated)": { src: inclinePushUpImage, alt: "Athlete demonstrating an incline push-up with hands elevated on a raised surface", source: "https://fitnessvolt.com/category/training/body-mechanics/page/5/" },
  "Push-Up (Feet Elevated)": { src: declinePushUpImage, alt: "Illustration of a decline push-up with feet elevated on a bench", source: "https://www.sfd.pl/post-p4117425.html" },
  "DB Hammer Curl": { src: hammerCurlImage, alt: "Athlete demonstrating a dumbbell hammer curl with a neutral grip, dumbbells at shoulder height", source: "https://do6eyjibs3jse.cloudfront.net/articles/hammer-curl-guide" },
  "Dumbbell Hammer Curl": { src: hammerCurlImage, alt: "Athlete demonstrating a dumbbell hammer curl with a neutral grip, dumbbells at shoulder height", source: "https://do6eyjibs3jse.cloudfront.net/articles/hammer-curl-guide" },
  "DB Romanian Deadlift": { src: dumbbellRdlImage, alt: "Athlete demonstrating a dumbbell Romanian deadlift, hinged at the hips with a flat back and dumbbells at knee height", source: "https://www.eatthis.com/news-this-10-minute-total-body-workout-will-transform-your-body-fast/" },
  "Dumbbell Romanian Deadlift": { src: dumbbellRdlImage, alt: "Athlete demonstrating a dumbbell Romanian deadlift, hinged at the hips with a flat back and dumbbells at knee height", source: "https://www.eatthis.com/news-this-10-minute-total-body-workout-will-transform-your-body-fast/" },
  "Standing DB Calf Raise": { src: standingCalfRaiseImage, alt: "Illustration of a standing dumbbell calf raise on a step, start position and raised on the toes, calves highlighted", source: "https://picmasa.com/explore/barbell-calf-raises" },
  "Standing Calf Raise": { src: standingCalfRaiseImage, alt: "Illustration of a standing dumbbell calf raise on a step, start position and raised on the toes, calves highlighted", source: "https://picmasa.com/explore/barbell-calf-raises" },
};

// Form tips written for his build: 6'0", 153 lb (a lean frame with long
// levers), 43 years old. Long-lever angles, tendon-friendly tempos, and
// recovery notes — never heavier-for-its-own-sake advice.
const exerciseTips: Partial<Record<string, string[]>> = {
  "Push-Up": ["At 6'0\" your levers are long: keep hands a touch wider than shoulders and brace your glutes so your hips never sag.", "At 43, warm the wrists and shoulders for a minute first — cold tendons are where tweaks come from."],
  "Push-Up (Hands Elevated)": ["Long torso, long levers: the higher the surface, the more upright you are — pick the height where the last two reps are hard but clean.", "Keep one straight line head to heels; don't let your hips drop as you tire."],
  "Push-Up (Feet Elevated)": ["This loads the upper chest and shoulders harder — keep the 3-second lowering honest and stop before your shoulders roll forward.", "If your wrists complain, use dumbbell handles on the floor as push-up grips."],
  "Chair Dip": ["Keep the range small and pain-free — deep dips stress the front of the shoulder, and at 43 shoulders bill you later for range you forced.", "Shoulders down away from your ears the whole set; if you feel a pinch in front, stop the set."],
  "Pike Push-Up": ["Walk your feet in until your hips are high; press through the whole palm, not just the heel of the hand.", "This is your overhead-press builder while loads are light — own the lowering."],
  "Bodyweight Squat": ["At 6'0\", sit back and down between your heels and let your knees track over your toes; a slightly wider stance usually fits long femurs better.", "Heels down. If they lift, hold a doorframe and work the deep squat hold in the flexibility block."],
  "Reverse Lunge": ["Take a long step back — long legs need the room — and keep most of your weight on the front foot.", "Hold a chair until balance is automatic; balance work doubles as ankle insurance at 43."],
  "Glute Bridge": ["Posterior tilt first (ribs down), then squeeze. A lean frame builds glutes by tension, not by rushing reps.", "Pause a full second at the top of every rep."],
  "Plank": ["Quality over the clock: the set ends when your hips sag, not when the timer says so.", "Breathe behind the brace — short exhales keep the brace without spiking tension."],
  "Bird Dog": ["Move slow enough that a cup of water on your lower back wouldn't spill.", "Reach long, not high — length is the point for a tall frame."],
  "Rear-Foot-Elevated Split Squat": ["Your money leg exercise. Set the chair behind you, take a long enough stance that your front shin stays near vertical, and own the 3-second lowering.", "Long femurs tip the torso forward — a slight forward lean is fine if your back stays flat and the front heel stays down.", "At 43, knees like gradual loading: master bodyweight reps before chasing the backpack."],
  "Bulgarian Split Squat": ["Your money leg exercise. Set the chair behind you, take a long enough stance that your front shin stays near vertical, and own the 3-second lowering.", "Long femurs tip the torso forward — a slight forward lean is fine if your back stays flat and the front heel stays down."],
  "Dead Hang": ["Grip, shoulders down away from your ears, ribs tucked. Build the hang before any dynamic work on the door bar.", "At 153 lb on a 6-foot frame, your grip-to-bodyweight ratio is in your favor — this ladder should move."],
  "Scap Pull": ["Think shoulder blades into your back pockets. No elbow bend — if your elbows bend, it's an arm exercise, not a scap pull.", "This is the shoulder-health rep that keeps chin-up volume safe at 43."],
  "Chin-Up": ["Strict and full range: dead hang to chin over. Half reps don't count on this ladder.", "Stop the set when the lowering gets sloppy — tendons at 43 prefer one clean set to three junk ones."],
  "Chin-Up Negatives": ["Five full seconds down, every rep. Jump or step back to the top instead of climbing tired.", "Negatives are heavy tendon work — if elbows feel hot the next day, hold this stage another week."],
  "Assisted Chin-Up": ["Use the minimum leg help that lets you finish the rep tall. Less help each week is the progression.", "Keep the free leg bent and still so the help stays honest."],
  "Dumbbell Floor Press": ["The floor is your depth gauge — upper arms touch, pause, press. That pause is joint-friendly pressing for 43-year-old shoulders.", "Long arms mean a long press path: keep wrists stacked over elbows and don't flare past about 45 degrees."],
  "DB Floor Press": ["The floor is your depth gauge — upper arms touch, pause, press. That pause is joint-friendly pressing for 43-year-old shoulders.", "Long arms mean a long press path: keep wrists stacked over elbows and don't flare past about 45 degrees."],
  "Single-Leg Romanian Deadlift": ["Hinge, don't squat: hips travel back, the standing knee stays soft, the dumbbell slides down your thigh.", "Keep a fingertip on the wall until balance is boring — at 43, ankle and hip stability is the real training effect here."],
  "DB Romanian Deadlift": ["Hinge, don't squat: hips travel back, knees stay soft, dumbbells slide down your thighs until your hamstrings load.", "Long back, long levers: brace hard before every rep and stop the set when your lower back starts doing the lifting."],
  "Dumbbell Romanian Deadlift": ["Hinge, don't squat: hips travel back, knees stay soft, dumbbells slide down your thighs until your hamstrings load.", "Long back, long levers: brace hard before every rep and stop the set when your lower back starts doing the lifting."],
  "Dumbbell Lateral Raise": ["Raise to shoulder height with a slight bend and a turned-out thumb side — friendlier on 43-year-old shoulders than pouring-the-jug form.", "If you have to swing it up, it's too heavy. Your adjustable minimum is 10 lb, so slow the tempo instead of adding load."],
  "DB Lateral Raise": ["Raise to shoulder height with a slight bend and a turned-out thumb side — friendlier on 43-year-old shoulders than pouring-the-jug form.", "If you have to swing it up, it's too heavy. Your adjustable minimum is 10 lb, so slow the tempo instead of adding load."],
  "Dead Bug": ["Exhale fully before each rep — ribs down is what makes this a core exercise instead of a back exercise.", "Slow reps beat more reps. If your lower back arches, shorten the reach."],
  "Hanging Knee Raise": ["No swinging: if you swing, reset from a dead stop. Control is the whole exercise.", "Curl your pelvis up at the top instead of just lifting your knees."],
  "Goblet Squat": ["Hold the 25 close to your chest and let your elbows track inside your knees at the bottom — it wedges your long frame into a good position.", "The 3-second lowering is the growth signal at this load; don't rush the easy part."],
  "Dumbbell Overhead Press": ["Squeeze your glutes and tuck your ribs before you press — long levers plus an arched back is how lower backs get sore.", "Press in a slight arc and finish with biceps by your ears, not out in front."],
  "Standing DB Overhead Press": ["Squeeze your glutes and tuck your ribs before you press — long levers plus an arched back is how lower backs get sore.", "Press in a slight arc and finish with biceps by your ears, not out in front."],
  "One-Arm Dumbbell Row": ["Set your back flat like a table, then row to your hip pocket, not your chest.", "Full stretch at the bottom, hard squeeze at the top — at 153 lb, back thickness comes from range and control, not ego loads."],
  "Single-Arm DB Row": ["Set your back flat like a table, then row to your hip pocket, not your chest.", "Full stretch at the bottom, hard squeeze at the top — at 153 lb, back thickness comes from range and control, not ego loads."],
  "Dumbbell Hip Thrust": ["Chin tucked, ribs down, and thrust by squeezing your glutes — not by arching your lower back.", "Pause at the top until you feel the glutes, not your hamstrings, doing the work."],
  "Overhead Triceps Extension": ["Keep elbows pointing forward and close together; flared elbows turn this into a shoulder complaint.", "Lower slowly behind your head — elbow tendons at 43 like tempo more than load."],
  "Overhead DB Triceps Extension": ["Keep elbows pointing forward and close together; flared elbows turn this into a shoulder complaint.", "Lower slowly behind your head — elbow tendons at 43 like tempo more than load."],
  "Dumbbell Curl": ["Pin your elbows at your ribs and curl without your shoulders rolling forward.", "You're building arms on a lean frame: full range and a 2-second squeeze beat swinging a heavier bell."],
  "DB Hammer Curl": ["Neutral grip, thumbs up the whole way — this hits the forearm and the outer arm that regular curls miss.", "Elbows pinned, no torso swing. At 43 your elbows will thank you for strict reps."],
  "Dumbbell Hammer Curl": ["Neutral grip, thumbs up the whole way — this hits the forearm and the outer arm that regular curls miss.", "Elbows pinned, no torso swing. At 43 your elbows will thank you for strict reps."],
  "Single-Leg Calf Raise": ["Full stretch at the bottom, full pause at the top — calves grow on range, not bounce.", "One set done slowly beats three rushed; Achilles tendons at 43 want the pause, not the bounce."],
  "Standing DB Calf Raise": ["Full stretch at the bottom, full pause at the top — calves grow on range, not bounce.", "Hold a wall for balance so the calf, not your balance, is the limit."],
  "Standing Calf Raise": ["Full stretch at the bottom, full pause at the top — calves grow on range, not bounce.", "Hold a wall for balance so the calf, not your balance, is the limit."],
};

const flexibilityTips: Record<string, string> = {
  "Half-kneeling hip flexor stretch + quad pull": "Tuck your tailbone and squeeze the down-side glute before you shift forward. At 6'0\" with long legs, your hip flexors shorten fast from sitting — this is the stretch that buys back your split squat and your stride.",
  "Lying hamstring stretch": "Keep the down leg flat and pull gently — a strap or towel around the foot is fine. Breathe out and let the leg come a little closer each round instead of forcing it.",
  "Calf stretch against wall (straight knee)": "Heel glued down, toes straight ahead. Straight knee hits the upper calf — the one your calf raises and split squats load.",
  "Doorway chest stretch": "Elbow at shoulder height, then turn away slowly. After floor press and push-up volume, this keeps 43-year-old shoulders opening instead of rounding forward.",
  "Deep squat hold": "Heels down, chest up, elbows prying your knees out. Hold the doorframe as long as you need — this hold is your squat depth insurance.",
  "Dead hang": "Same bar rules as training: check the bar is seated, static hang first. Let your shoulders creep up to your ears, then pull them back down — that reset is shoulder health.",
};

const aerobicTips: string[] = [
  "Talk test the whole way: full sentences, no gasping. At 153 lb and 6'0\", your engine work is about recovery capacity, not burning calories you need for building.",
  "Low-impact first — walk, incline walk, bike, row. At 43, joints collect the bill for pounding long after the workout ends.",
  "Refuel after: aerobic days are not diet days. Hit your protein and your surplus so these sessions make strength days better, not smaller.",
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

function FocusView({ state, dateKey, onGoJournal }: { state: AppState; dateKey: string; onGoJournal: () => void }) {
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
  const [eveningOpen, setEveningOpen] = useState(false);
  const [deciderOpen, setDeciderOpen] = useState(false);

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
    setEveningOpen(true);
    window.setTimeout(() => {
      const card = document.getElementById("wellness-checkin");
      const toggle = card?.querySelector<HTMLButtonElement>(".wellness-header");
      if (toggle?.getAttribute("aria-expanded") === "false") toggle.click();
      card?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };
  const recoveryPrompt = state.wellness.today && (state.wellness.today.energy <= 2 || state.wellness.today.sleepHours < 6)
    ? `Energy is ${state.wellness.today.energy}/5 after ${state.wellness.today.sleepHours} hours of sleep. Check in before you force the pace.`
    : null;
  const nowHHMM = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const journalReminderDue = state.journal.prefs.reminderEnabled && !state.journal.today && nowHHMM >= state.journal.prefs.reminderTime;

  const ritualsDoneCount = ritualMeta.filter((ritual) => state.rituals.today[ritual.key]).length;
  const energyToday = state.wellness.today?.energy;

  return <main className="page focus-page">
    <div className="today-topbar">
      <span className="date-badge">{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${dateKey}T12:00:00`))}</span>
      <span className="needle-pill"><b>{focus?.todayNeedleMinutes ?? 0}</b><span>needle min</span></span>
    </div>
    <section className="focus-masthead">
      <p className="eyebrow">Today · move the needle</p>
      <h1 className="hero-line">{focus?.plan.frogCompleted ? "Done, not busy." : "Do the hard thing first."}</h1>
      <p className="hero-sub">One meaningful priority. A little movement. Time for yourself.</p>
    </section>

    <div className="stat-row" aria-label="Today at a glance">
      <div className="stat-card"><span>Focused</span><div className="stat-value"><b>{focus?.todayNeedleMinutes ?? 0}</b><small>min</small></div><small>Needle minutes today</small></div>
      <div className="stat-card"><span>Daily rituals</span><div className="stat-value"><b>{ritualsDoneCount}</b><small>/ {ritualMeta.length}</small></div><small>{ritualsDoneCount === ritualMeta.length ? "All of them, done" : "Step by step"}</small></div>
      <div className="stat-card"><span>Energy</span><div className="stat-value">{energyToday != null ? <><b className="good">{energyToday}</b><small>/ 5</small></> : <b>—</b>}</div><small>{energyToday != null ? "From your check-in" : "Check in below"}</small></div>
    </div>

    {!state.wellness.today && <aside className="proactive-check" aria-label="Proactive check-in"><div><strong>Don’t run today on yesterday’s data.</strong><span>Thirty seconds: sleep, energy, stress, soreness.</span></div><button onClick={jumpToCheckin}>Check in now</button></aside>}
    {recoveryPrompt && <aside className="proactive-check recovery" aria-label="Recovery check-in"><div><strong>Recovery is the constraint today.</strong><span>{recoveryPrompt}</span></div><button onClick={jumpToCheckin}>Review</button></aside>}
    {journalReminderDue && <aside className="proactive-check journal-nudge" aria-label="Journal reminder"><div><strong>Journal reminder · {formatTime12h(state.journal.prefs.reminderTime)}</strong><span>Today's prompt is waiting: “{state.journal.promptToday}” Five minutes, plain words.</span></div><button onClick={onGoJournal}>Write it</button></aside>}
    {middayTripwire && focus && <div className="tripwire" role="status"><div><strong>Midday check: “{focus.plan.frog}” hasn’t started.</strong><span>{focus.parkingLot.length > 0 ? `${focus.parkingLot.length} side task${focus.parkingLot.length === 1 ? "" : "s"} already parked (${focus.parkingLot.slice(0, 2).map((item) => item.text).join(", ")}${focus.parkingLot.length > 2 ? "…" : ""}) and the frog still hasn’t moved. Start it before another side task wins.` : "The frog you locked this morning is still untouched. Start it before another side task wins."}</span></div><button onClick={() => startFrog.mutate()} disabled={startFrog.isPending} aria-label={`Start ${focus.plan.frog}`}>Start now</button></div>}

    <section className={`frog-card ${focus?.plan.frogCompleted ? "complete" : ""}`} aria-labelledby="frog-heading">
      <div className="frog-label"><span>01</span><div><p className="eyebrow">THE FROG · NO SIDE TASKS FIRST</p><h2 id="frog-heading">{editingPlan ? (focus?.plan.frog ? "Edit today’s Big 3" : "Name what you’re avoiding") : (focus?.plan.frog || "Name what you’re avoiding")}</h2></div>{!editingPlan && focus?.plan.frog && <span className="lock-chip">{focus.plan.frogCompleted ? "Done" : focus.plan.frogStartedAt ? "Started" : "Locked"}</span>}</div>
      {focus?.plan.frogReason && !editingPlan && <p className="needle-reason">Moves the needle because: <b>{focus.plan.frogReason}</b></p>}
      {editingPlan && <div className="big-three-form">
        <label><span>1 · The task you’re avoiding</span><input value={frog} onChange={(event) => setFrog(event.target.value)} maxLength={180} placeholder="Call the first 20 roofers" /></label>
        <label><span>Why this moves the goal</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={240} placeholder="Direct path to the next client" /></label>
        <label><span>2 · Next outcome</span><input value={taskTwo} onChange={(event) => setTaskTwo(event.target.value)} maxLength={180} placeholder="One concrete outcome" /></label>
        <label><span>3 · Last outcome</span><input value={taskThree} onChange={(event) => setTaskThree(event.target.value)} maxLength={180} placeholder="One concrete outcome" /></label>
        <div className="big-three-actions">
          <button className="save-plan" disabled={!frog.trim() || !reason.trim() || !taskTwo.trim() || !taskThree.trim() || savePlan.isPending} onClick={() => savePlan.mutate()}>{savePlan.isPending ? "Saving…" : focus?.plan.frog ? "Save Big 3" : "Lock today’s Big 3"}</button>
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

    <WakeTracker focus={focus} dateKey={dateKey} />

    <RitualsCard state={state} dateKey={dateKey} />

    <section className="parking-card" aria-labelledby="parking-heading">
      <div className="section-line"><div><p className="eyebrow">Clear your mind, keep focus</p><h2 id="parking-heading">Save for later</h2></div><span className="parking-count">{focus?.parkingLot.length ?? 0}</span></div>
      <form className="parking-entry" onSubmit={(event) => { event.preventDefault(); const text = parkingDraft.trim(); if (text) addParking.mutate(text); }}>
        <input value={parkingDraft} onChange={(event) => setParkingDraft(event.target.value)} maxLength={180} placeholder="Park the urge here" aria-label="Side task to park" />
        <button disabled={!parkingDraft.trim() || addParking.isPending}>Park it</button>
      </form>
      {focus?.parkingLot.length ? <div className="parking-list">{focus.parkingLot.map((item) => <div key={item.id}><span>{item.text}</span><button onClick={() => clearParking.mutate(item.id)} aria-label={`Clear ${item.text}`}>Clear</button></div>)}</div> : <p className="parking-empty">When a side task shows up, save it here and stay on the needle.</p>}
    </section>

    <section className="focus-scoreboard">
      <div><p className="eyebrow">LAST 7 DAYS</p><strong>{weekMinutes}</strong><span>needle minutes</span></div>
      <div className="week-bars" aria-label={`${weekMinutes} focus minutes over the last seven days`}>{focus?.lastSevenDays.map((day) => <span key={day.dateKey} style={{ height: `${Math.max(6, Math.min(100, day.minutes / 90 * 100))}%` }} title={`${day.dateKey}: ${day.minutes} minutes`} />)}</div>
    </section>

    <button type="button" className="accordion-row" aria-expanded={eveningOpen} onClick={() => setEveningOpen((value) => !value)}>
      <span><h3>Evening check-in</h3><p>{state.wellness.today || state.nightly?.today ? "Saved — tap to review or update" : "How today went, in thirty seconds"}</p></span>
      <span className={`acc-state ${state.wellness.today || state.nightly?.today ? "done" : ""}`} aria-hidden="true">{state.wellness.today || state.nightly?.today ? "✓" : eveningOpen ? "−" : "+"}</span>
    </button>
    {eveningOpen && <div className="accordion-panel">
      <WellnessCheckin state={state} dateKey={dateKey} />
      <NightlyCheck state={state} dateKey={dateKey} />
    </div>}

    <button type="button" className="accordion-row" aria-expanded={deciderOpen} onClick={() => setDeciderOpen((value) => !value)}>
      <span><h3>Think through a decision</h3><p>Your Higher Self picks, from your values</p></span>
      <span className="acc-state" aria-hidden="true">{deciderOpen ? "−" : "+"}</span>
    </button>
    {deciderOpen && <div className="accordion-panel">
      <DeciderSection dateKey={dateKey} />
    </div>}
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
        {state.flexibilityBlock.map((item) => <div className="flex-row" key={item.name}><strong>{item.name}</strong><small>{duration === 60 ? item.detail.replace("30s", "60s") : item.detail}</small>{flexibilityTips[item.name] && <small className="flex-tip">{flexibilityTips[item.name]}</small>}</div>)}
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
          const image = exerciseImages[exercise.name];
          return (
            <article className={`exercise ${entry.pain ? "pain" : ""}`} key={exercise.name}>
              <header>
                <div>
                  <p className="exercise-meta">{exercise.sets} × {exercise.repMin}–{exercise.repMax}{exercise.unilateral ? " / side" : ""} · REST {exercise.rest}</p>
                  <h2>{exercise.name}</h2>
                </div>
                <button className="pain-button" aria-pressed={entry.pain} onClick={() => updateExercise(exerciseIndex, { ...entry, pain: !entry.pain })}>{entry.pain ? "PAIN FLAGGED" : "PAIN?"}</button>
              </header>
              {image && <a className="exercise-image" href={image.source} target="_blank" rel="noreferrer" aria-label={`Open source for ${exercise.name} demonstration photo`}><img src={image.src} alt={image.alt} /><span>FORM DEMO</span></a>}
              <p className="cue">{exercise.cue}</p>
              {exerciseTips[exercise.name] && <div className="exercise-tips"><span>Tips for your build · 6'0" · 153 lb · 43</span><ul>{exerciseTips[exercise.name]!.map((tip) => <li key={tip}>{tip}</li>)}</ul></div>}
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
        <p className="eyebrow">EATING TO GROW · YOUR BUILD: 6'0" · 153 LB · AGE 43</p>
        <h2>Give the work something to build with.</h2>
        <p className="build-note">At 6'0" and 153 lb you are lean for your height — the limiter is fuel and recovery, not effort. Long levers and 43-year-old tendons both argue for the same plan: a small surplus, protein every day, tempos you control, and deload weeks you actually take.</p>
        <ul><li><b>+250–350 cal</b> per day over maintenance</li><li><b>110–155g protein</b> per day (about 0.7–1.0g per pound at 153 lb)</li><li><b>Weigh in weekly</b> under similar conditions — target a slow climb, roughly 0.5 lb a week</li><li><b>Sleep is the supplement:</b> under 6 hours, expect the next session to feel a week older</li></ul>
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
        <a className="exercise-image aerobic-image" href="https://ghc.health/" target="_blank" rel="noreferrer" aria-label="Open source for steady aerobic work photo"><img src={aerobicWalkImage} alt="Man doing steady aerobic exercise outdoors on a tree-lined path" /><span>STEADY PACE</span></a>
        <p>Keep it conversational: you should be able to talk in full sentences the whole way. Walk, ride, row, swim — your pick. This is the engine work that makes the strength days recoverable.</p>
        <div className="exercise-tips"><span>Tips for your build · 6'0" · 153 lb · 43</span><ul>{aerobicTips.map((tip) => <li key={tip}>{tip}</li>)}</ul></div>
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

function HistoryView({ state, dateKey }: { state: AppState; dateKey: string }) {
  return (
    <main className="page history-page">
      <section className="page-heading"><p className="eyebrow">Your record</p><h1>Journal</h1><p>Write it down, go deeper, let the Minds read it back. Then read what the days add up to.</p></section>
      <JournalView state={state} dateKey={dateKey} />
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
    <section className="page-heading"><p className="eyebrow">Recovery + training</p><h1>Insights</h1><p>Your check-ins beside the work you completed. Patterns are associations, not diagnoses.</p></section>
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
  const dateKey = localDateKey();
  const stateQuery = useQuery({ queryKey: ["app-state", dateKey], queryFn: () => api.getAppState({ dateKey }) });
  if (stateQuery.isPending) return <div className="loading"><div className="loading-bar" /><p>Loading today…</p></div>;
  if (stateQuery.error || !stateQuery.data) return <div className="error-state"><h1>Couldn’t load the log</h1><p>{String(stateQuery.error)}</p><button onClick={() => stateQuery.refetch()}>Try again</button></div>;
  const state = stateQuery.data;
  return (
    <div className="app-shell">
      {tab === "focus" && <FocusView state={state} dateKey={dateKey} onGoJournal={() => setTab("history")} />}
      {tab === "train" && <TrainView state={state} dateKey={dateKey} />}
      {tab === "history" && <HistoryView state={state} dateKey={dateKey} />}
      {tab === "trends" && <TrendsView state={state} />}
      {tab === "higher" && <HigherSelfView dateKey={dateKey} />}
      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={tab === "focus" ? "active" : ""} aria-current={tab === "focus" ? "page" : undefined} onClick={() => setTab("focus")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>Today</button>
        <button className={tab === "train" ? "active" : ""} aria-current={tab === "train" ? "page" : undefined} onClick={() => setTab("train")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.5 6.5v11" /><path d="M3.5 9v6" /><path d="M17.5 6.5v11" /><path d="M20.5 9v6" /><line x1="6.5" y1="12" x2="17.5" y2="12" /></svg>Training</button>
        <button className={tab === "history" ? "active" : ""} aria-current={tab === "history" ? "page" : undefined} onClick={() => setTab("history")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>Journal</button>
        <button className={tab === "trends" ? "active" : ""} aria-current={tab === "trends" ? "page" : undefined} onClick={() => setTab("trends")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>Insights</button>
        <button className={tab === "higher" ? "active" : ""} aria-current={tab === "higher" ? "page" : undefined} onClick={() => setTab("higher")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a5 5 0 0 1 5 5c0 4-5 10-5 10S7 11 7 7a5 5 0 0 1 5-5z" /><circle cx="12" cy="7" r="1.5" /></svg>Higher Self</button>
      </nav>
    </div>
  );
}
