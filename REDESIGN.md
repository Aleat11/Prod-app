# Daylight — interface redesign

Daylight is a working visual name for the redesigned interface. Existing action names, data storage, workout logic, and hosting integration are unchanged.

## What changed

- A priority-first Today workspace with live focus, ritual, and energy summaries.
- Desktop sidebar and mobile bottom navigation: Today, Training, Journal, Insights, Higher Self.
- Separate focus and daily-balance columns, with expandable evening reflection and decision support.
- Warm surfaces, teal accents, readable typography, consistent cards, and light/dark themes.
- Accessible current-page navigation, keyboard focus, skip link, reduced-motion support, and touch targets.
- Automatic date refresh when the day changes or the window regains focus.
- Removed imports of exercise photos absent from the repository. Existing written form cues and regressions remain; no replacement images are implied.

## Validation

Checked in an isolated local harness using a compatible SDK stand-in, real repository action handlers, and temporary SQLite data. TypeScript passed. Browser checks passed for saving priorities, wellness and rituals, timer start/pause/save, deferred tasks, all five destinations, evening reflection, and no horizontal overflow at 360–1440px. No browser errors occurred in those flows.

The original Hatch SDK is referenced through a local file path unavailable outside its hosting environment. The official hosted build, live database, AI services, and production deployment were not tested or changed. Use the original platform’s publishing workflow after reviewing this branch. The test stand-in is not part of this change.
