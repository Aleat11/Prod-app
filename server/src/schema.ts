import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionType: text("session_type", { enum: ["full_body", "upper", "lower", "session_a", "session_b", "aerobic"] }).notNull(),
  logJson: text("log_json").notNull(),
  clientRequestId: text("client_request_id").unique(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }).notNull(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  smallestJump: real("smallest_jump"),
  gatewayMasterKey: text("gateway_master_key"),
  gatewayModel: text("gateway_model"),
  dumbbellDescription: text("dumbbell_description"),
  barType: text("bar_type"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const upcomingSessions = sqliteTable("upcoming_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionType: text("session_type", { enum: ["full_body", "upper", "lower", "session_a", "session_b", "aerobic"] }).notNull(),
  planJson: text("plan_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  consumed: integer("consumed", { mode: "boolean" }).notNull().default(false),
});

export const ritualDays = sqliteTable("ritual_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dateKey: text("date_key").notNull().unique(),
  sunlight: integer("sunlight", { mode: "boolean" }).notNull().default(false),
  meditation: integer("meditation", { mode: "boolean" }).notNull().default(false),
  visualization: integer("visualization", { mode: "boolean" }).notNull().default(false),
  chewingGum: integer("chewing_gum", { mode: "boolean" }).notNull().default(false),
  oneFootStand: integer("one_foot_stand", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const wellnessCheckins = sqliteTable("wellness_checkins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dateKey: text("date_key").notNull().unique(),
  mood: integer("mood").notNull(),
  energy: integer("energy").notNull(),
  sleepHours: real("sleep_hours").notNull(),
  sleepQuality: integer("sleep_quality").notNull(),
  stress: integer("stress").notNull(),
  soreness: integer("soreness").notNull(),
  journal: text("journal").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const nightlyChecks = sqliteTable("nightly_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dateKey: text("date_key").notNull().unique(),
  somethingGood: text("something_good").notNull().default(""),
  somethingHard: text("something_hard").notNull().default(""),
  somethingKind: text("something_kind").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const dailyFocus = sqliteTable("daily_focus", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dateKey: text("date_key").notNull().unique(),
  frog: text("frog").notNull().default(""),
  frogReason: text("frog_reason").notNull().default(""),
  taskTwo: text("task_two").notNull().default(""),
  taskThree: text("task_three").notNull().default(""),
  frogStartedAt: integer("frog_started_at", { mode: "timestamp_ms" }),
  frogCompleted: integer("frog_completed", { mode: "boolean" }).notNull().default(false),
  wakeTime: text("wake_time"),
  wakeTarget: text("wake_target"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const parkingLotItems = sqliteTable("parking_lot_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dateKey: text("date_key").notNull(),
  text: text("text").notNull(),
  cleared: integer("cleared", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const focusBlocks = sqliteTable("focus_blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dateKey: text("date_key").notNull(),
  task: text("task").notNull(),
  plannedMinutes: integer("planned_minutes").notNull(),
  actualMinutes: integer("actual_minutes").notNull(),
  focusRating: integer("focus_rating").notNull(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }).notNull(),
});

export const assessments = sqliteTable("assessments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["session0", "retest"] }).notNull().default("session0"),
  hangSeconds: real("hang_seconds").notNull(),
  scapPullReps: integer("scap_pull_reps").notNull(),
  pushupReps: integer("pushup_reps").notNull(),
  pushupSurface: text("pushup_surface").notNull().default(""),
  splitSquatLeft: integer("split_squat_left").notNull(),
  splitSquatRight: integer("split_squat_right").notNull(),
  chairSquatReps: integer("chair_squat_reps").notNull(),
  sitReachCm: real("sit_reach_cm").notNull(),
  squatHoldSeconds: real("squat_hold_seconds").notNull(),
  wallWristsTouch: integer("wall_wrists_touch", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const strengthsProfiles = sqliteTable("strengths_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topThemesJson: text("top_themes_json").notNull().default("[]"),
  // Where the current Top 5 came from: "official" (user-entered Gallup results, locked),
  // "sorter" (the in-app reflective sorter), or "manual" (picked by hand in the Atlas).
  source: text("source").notNull().default("manual"),
  // Optional full 34 ranking, only stored for official Gallup results.
  fullRankingJson: text("full_ranking_json").notNull().default("[]"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const strengthsReflections = sqliteTable("strengths_reflections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  themeName: text("theme_name").notNull(),
  body: text("body").notNull(),
  kind: text("kind").notNull().default("moment"), // moment | win | learning
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const strengthsCommitments = sqliteTable("strengths_commitments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  themeName: text("theme_name").notNull(),
  text: text("text").notNull(),
  done: integer("done").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const strengthsSorterResults = sqliteTable("strengths_sorter_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topThemesJson: text("top_themes_json").notNull().default("[]"),
  scoresJson: text("scores_json").notNull().default("{}"),
  answersJson: text("answers_json").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const zephyrResults = sqliteTable("zephyr_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  testId: text("test_id").notNull(),
  testTitle: text("test_title").notNull(),
  category: text("category").notNull(),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull(),
  bandLabel: text("band_label").notNull(),
  bandSummary: text("band_summary").notNull(),
  takenAt: text("taken_at").notNull(),
}, (table) => [
  uniqueIndex("zephyr_results_test_taken_unique").on(table.testId, table.takenAt),
]);

export const flexibilityDays = sqliteTable("flexibility_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dateKey: text("date_key").notNull().unique(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  durationSeconds: integer("duration_seconds").notNull().default(30),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const decisions = sqliteTable("decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dateKey: text("date_key").notNull(),
  dilemma: text("dilemma").notNull(),
  options: text("options").notNull(),
  pick: text("pick"),
  reasoning: text("reasoning"),
  patternNote: text("pattern_note"),
  firstStep: text("first_step"),
  commitment: text("commitment"),
  ifThen: text("if_then"),
  revisitDate: text("revisit_date"),
  outcome: text("outcome"),
  followedThrough: integer("followed_through"),
  status: text("status", { enum: ["open", "locked", "reviewed"] }).notNull().default("open"),
  reopenCount: integer("reopen_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Higher Self concept (ported from the higher-self app, adapted) ---
// Production starts empty: no facts, identity, proof, chat, reframes or
// letters are seeded. Table names are hs_-prefixed so they never collide
// with this app's existing settings/profile-shaped tables.
export const hsAppMeta = sqliteTable("hs_app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const hsProfile = sqliteTable("hs_profile", {
  id: integer("id").primaryKey(),
  pattern: text("pattern").notNull().default(""),
  scores: text("scores").notNull().default(""),
  answers: text("answers").notNull().default(""),
  identityStatement: text("identity_statement").notNull().default(""),
  valuesList: text("values_list").notNull().default(""),
  nonNegotiables: text("non_negotiables").notNull().default(""),
  neverDoes: text("never_does").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const hsFacts = sqliteTable("hs_facts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fact: text("fact").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const hsProof = sqliteTable("hs_proof", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const hsChatMessages = sqliteTable("hs_chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const hsReframes = sqliteTable("hs_reframes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  thought: text("thought").notNull(),
  answer: text("answer").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const hsLetters = sqliteTable("hs_letters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekKey: text("week_key").notNull().unique(),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
