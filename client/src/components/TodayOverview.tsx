export function TodayOverview({ minutes, ritualsDone, ritualsTotal, energy }: { minutes: number; ritualsDone: number; ritualsTotal: number; energy: number | null }) {
  return <section className="today-overview" aria-label="Today at a glance">
    <div className="overview-metric"><span>Focused time</span><strong>{minutes}<small> min</small></strong><small>Space for meaningful work</small></div>
    <div className="overview-metric"><span>Daily rituals</span><strong>{ritualsDone}<small> / {ritualsTotal}</small></strong><small>{ritualsDone === ritualsTotal ? "A little care goes a long way" : "Build your rhythm, one step at a time"}</small></div>
    <div className="overview-metric"><span>Your energy</span><strong>{energy ?? "—"}{energy !== null && <small> / 5</small>}</strong><small>{energy == null ? "A quick check-in helps you plan" : energy <= 2 ? "Make room for recovery" : "Find a pace that works for you"}</small></div>
  </section>;
}
