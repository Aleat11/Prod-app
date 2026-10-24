# Workout Log & Daily Alignment — UX, Rest Timer & Live Voice Plan

Streamline the daily workflow across **Today**, **Training**, **Journal**, and **Higher Self** by eliminating duplicate habit controls, adding an automatic between-set rest timer with collapsible exercise guides, splitting the Journal into **Write Studio** vs. **History Logbook**, and adding **Live Voice Mode** (live speech dictation + spoken voice replies) to **Journal** and **Higher Self**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Priorities from Your Feedback:**
> - **Confirmed Decision 1 — Live Voice Option for Journaling & Higher Self**:
>   - **Voice Dictation ("Speak to Write")**: Live microphone button on Journal entries, *Go Deeper*, *Ask Your Journal*, *Higher Self Chat*, and *Reframe* that streams your spoken words directly into the text field in real time.
>   - **Live Voice Conversation Mode ("Talk It Out")**: An optional **Voice Mode** toggle in *Higher Self Chat* and *Journal Go Deeper* where speaking automatically submits your turn and your Higher Self (or chosen Journal Lens) speaks the reply back to you aloud, plus one-tap **Listen** buttons on the *Morning Message*, *Sunday Letter*, *4 Minds*, and *Weekly Recap*.
> - **Confirmed Decision 2 — Streamlined Today Tab (`Focus · Morning · Evening`)**: Reorganize Today into three clear daily phases and remove the duplicate ritual chips from *Quick Capture* so your 5 daily rituals live in one unified checklist.
> - **Confirmed Decision 3 — Training Rest Timer & Collapsible Exercise Guides**: Auto-start a floating rest countdown bar whenever a set is checked off, and make the 190px exercise photos/tips collapsible so mid-workout scrolling stays minimal.
> - **Confirmed Decision 4 — Split Journal into `Write Studio` vs. `History Logbook`**: Separate active writing/reflection from historical records (`All · Journal · Check-ins · Nightly · Rituals · Workouts`).

> [!NOTE]
> **What is "Strengths"?**
> Your codebase also includes a complete **CliftonStrengths (StrengthsFinder 2.0)** module (`StrengthsView.tsx`) that lets you discover or lock in your Top 5 talent themes, browse all 34 themes with audio narration, and set weekly *Aim It* commitments. We will add a clean **`Higher Self | Strengths`** switch at the top of the **Higher Self** tab so it is available whenever you want it.

---

## 1. Overview & Core Concept

- **What It Does**: Evolves your daily alignment, training, and reflection app into a cleaner, lower-friction companion with hands-free **Live Voice** journaling and Higher Self conversations, automatic between-set workout pacing, and decluttered navigation.
- **Target Audience / Persona**: A 43-year-old, 6'0" lean athlete and builder who values fast capture (by voice or text), joint-safe progressive overload, and direct accountability without UI clutter.
- **Key Value**: Lets you talk through journal entries and Higher Self check-ins out loud when you don't feel like typing, cuts vertical scroll depth by ~45% on Today and Training, and paces your rest intervals automatically between sets.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Live Voice Mode in Journal & Higher Self (`Speak · Listen · Talk It Out`)**:
   - **Global Speech & Voice Provider**: Wraps the app so voice dictation (Speech-to-Text) and audio readback (Text-to-Speech with adjustable `0.85×–1.3×` speed and floating mini-player) work seamlessly across both **Journal** and **Higher Self**.
   - **In Journal (`WriteCard`, `Go Deeper`, `Ask Your Journal`)**:
     - Tap **`🎙 Speak`** next to the journal prompt to dictate your daily entry hands-free with live interim transcript preview; tap again to pause or finish.
     - Toggle **`Live Voice Reply`** in *Go Deeper* so when you finish speaking a reflection, it sends automatically and the active lens (*Companion, Psychologist, CBT Coach, Stoic*) reads its response aloud.
     - One-tap **`🔊 Listen`** buttons on *Weekly Recap* and *Invite the Minds* cards.
   - **In Higher Self (`Chat`, `Morning Message`, `Reframe`, `Sunday Letter`)**:
     - Toggle **`Live Voice Mode`** in *Higher Self Chat*: tap the pulsing mic button to say what is going on straight; when you stop speaking, it sends to your Higher Self and automatically speaks his reply aloud.
     - **`🎙 Speak`** button on *Reframe* ("What did your lower self just say?") and **`🔊 Listen`** buttons on the *Morning Message*, *Reframe* answers, *Proof* readback, and *Sunday Letter*.
2. **Today Tab (`Focus · Morning · Evening` Flow)**:
   - **At a Glance Header**: Date, needle minutes, and 3 compact summary metrics (*Focused min, Rituals x/5, Energy x/5*) plus any active proactive nudge.
   - **Phase 1 — Focus & Execution**: *The Frog / Big 3* hero card, active *90-Minute Focus Timer*, *Natural-Language Quick Capture* (focused purely on text/voice input and starting the frog, without duplicate ritual chips), and *Parking Lot* ("Save for later").
   - **Phase 2 — Morning Foundation**: *Wake Tracker* (with 7-day wake & time-to-needle dots) and the single canonical *Daily Rituals* checklist (*Sunlight, Meditation, Visualization, Chewing gum, One-foot stand*) with streak counters.
   - **Phase 3 — Evening & Alignment**: Expandable accordions for *Evening Check-in* (Wellness sliders + Nightly Good/Hard/Kind check), *Decision Maker (Decider)*, and the *7-Day Focus Scoreboard*.
3. **Training Tab (`Workout | Progress`)**:
   - **Automatic Rest Timer**: Checking off any set (`SET 1`, `SET 2`, etc.) parses that exercise's target rest window (e.g., `REST 90s` → `1:30`, `REST 2 min` → `2:00`) and launches a sticky floating **Rest Timer Bar** above the bottom nav with `-15s`, `+15s`, `Pause/Resume`, and `Skip` controls.
   - **Collapsible Exercise Guides**: Each exercise header displays its name, target sets/reps, a `Form & tips` toggle for the 190px demonstration photo and build-specific cues, and a `Done ✓` badge when all sets for that movement are completed.
4. **Journal Tab (`Write Studio | History Logbook`)**:
   - **Write Studio View**: Houses *Step 1: Write (with Live Voice)*, *Steps 2+3: Go Deeper & Invite the Minds*, *Plutchik Emotion Patterns*, *Ask Your Journal*, and *Weekly Recap*.
   - **History Logbook View**: Houses a unified filter bar (`All · Journal · Check-ins · Nightly · Rituals · Workouts`) so you can inspect any specific log stream cleanly.

### Visual Identity & Theme
- **Aesthetic Direction**: Daylight Linen & OLED Forest — utilitarian editorial clarity with high-contrast outdoor legibility and tactile mobile ergonomics.
- **Color Palette & Mood**:
  - Light mode: Warm linen paper canvas (`#f7f7f5`), crisp card surfaces (`#fdfdfc`), deep forest ink (`#0f1a15`), emerald action accents (`#10b981` / `#047857`), and deep forest hero cards (`#061a14` to `#0b110f`).
  - Dark mode: True-black OLED canvas (`#000000`), elevated slate-forest surfaces (`#0b0c0e` / `#121417`), and luminous emerald highlights (`#34d399`).
- **Voice UI Styling**:
  - Active recording button uses a high-contrast emerald/crimson recording state with live interim transcript preview and a subtle waveform/status label (`Listening… tap to finish` or `Auto-send on pause`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Voice Capabilities (Live Dictation + Auto-Spoken Conversational Mode)**
  - *Chosen Approach*: Combine browser-native real-time speech recognition (`SpeechRecognition` / `webkitSpeechRecognition`) with the app's sentence-chunked speech synthesis (`SpeechProvider` + `SpeechBar`) so voice works with zero latency, zero extra API cost, and full compatibility with the existing server-side `ctx.inference.complete` persona prompts.
  - *Why*: Preserves the exact grounded context of your *Higher Self* (identity, facts, Big 3, workout history) and *Journal Lenses* while adding instant voice input and spoken replies.
  - *Graceful Fallback*: If a browser does not support `SpeechRecognition`, the UI clearly notes that live mic dictation requires Safari, Chrome, or Edge while keeping all `🔊 Listen` audio readback buttons active.
- **Decision 2: Single Canonical Rituals Checklist vs. Duplicate Capture Chips**
  - *Chosen Approach*: Remove the 5 ritual toggle chips from `QuickCapture` and keep `QuickCapture` focused on natural-language entry, while `RitualsCard` remains the single one-tap checklist with streak counts.
- **Decision 3: Client-Side Automatic Rest Timer in Training**
  - *Chosen Approach*: Parse each exercise's `rest` string when a set transitions from incomplete to completed, starting a persistent countdown timer with `+15s / -15s / Skip` adjustments.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     SpeechProvider + LiveVoiceHook                       │
│     (Speech-to-Text Dictation · Auto-Voice Reply · Floating SpeechBar)   │
├──────────────────────────────────────────────────────────────────────────┤
│                         App Shell & Bottom Nav                           │
│        [ Today ]   [ Training ]   [ Journal ]   [ Insights ]   [ Higher ]│
└────────────┬─────────────┬─────────────┬──────────────┬────────────┬─────┘
             │             │             │              │            │
             ▼             ▼             ▼              ▼            ▼
     ┌──────────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐
     │  FocusView   │ │TrainView │ │HistoryView│ │ TrendsView │ │HigherHub │
     ├──────────────┤ ├──────────┤ ├───────────┤ ├────────────┤ ├──────────┤
     │• Focus Block │ │[Workout] │ │[Studio]   │ │• Sleep/Set │ │[Higher]  │
     │  - Frog/Big3 │ │• Session │ │• WriteCard│ │  MiniTrends│ │• Morning │
     │  - 90m Timer │ │  Header  │ │  + 🎙Mic  │ │• Plain-Eng │ │  + 🔊TTS │
     │  - QuickCap  │ │• Exercise│ │• GoDeeper │ │  Patterns  │ │• 6 Tools │
     │  - ParkingLot│ │  Cards   │ │  + 🎙/🔊  │ │• 14d Table │ │  + Live  │
     │• Morning     │ │  (Toggle │ │  & 4 Minds│ └────────────┘ │  Voice   │
     │  - WakeTrack │ │   Form)  │ │• Plutchik │                │  Chat    │
     │  - Rituals   │ │• Floating│ │• AskJourn │                ├──────────┤
     │• Evening     │ │  RestBar │ │  + 🎙Mic  │                │[Strength]│
     │  - Wellness  │ ├──────────┤ │• WeekRecap│                │• Top 5   │
     │  - Nightly   │ │[Progress]│ ├───────────┤                │• 3-Stage │
     │  - Decider   │ │• TopLoad │ │[Logbook]  │                │  Sorter  │
     └──────────────┘ └──────────┘ │• Filters  │                │• 34 Atlas│
                                   └───────────┘                └──────────┘
```

### Data Model & State
- **Voice & Speech State (`strengthsSpeech.tsx` extended for app-wide use)**:
  - `SpeechProvider` lifted to `App` root so `SpeakButton`, `SpeechBar`, and programmatic `sp.speak(...)` work in `JournalView`, `HigherSelfView`, and `StrengthsView`.
  - `useVoiceInput({ onTranscript, onFinalSubmit })` hook wrapping `SpeechRecognition` / `webkitSpeechRecognition` with `listening`, `interimText`, `supported`, `error`, `start()`, and `stop()` controls.
  - `voiceReplyEnabled: boolean` toggle in `HigherSelfView` (Chat & Reframe) and `JournalView` (Go Deeper & Ask Journal): when enabled, `onSuccess` from the AI mutation automatically calls `sp.speak(...)` with the assistant's reply.
- **Workout & Layout State**:
  - `RestTimerState`: `{ exerciseName: string; targetSeconds: number; startedAt: number | null; elapsedSeconds: number }` in `StrengthView`.
  - `expandedGuides: Record<string, boolean>` for collapsible exercise form photos and build tips.
  - `journalMode: "studio" | "logbook"` & `logFilter: "all" | "journal" | "checkins" | "nightly" | "rituals" | "workouts"` in `HistoryView`.
  - `higherMode: "higher" | "strengths"` in the Higher Self tab.
