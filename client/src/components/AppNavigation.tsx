import type { Tab } from "../App";

const destinations: { id: Tab; label: string; icon: string; description: string }[] = [
  { id: "focus", label: "Today", icon: "today", description: "Focus and daily balance" },
  { id: "train", label: "Training", icon: "train", description: "Your workout and progress" },
  { id: "history", label: "Journal", icon: "journal", description: "Your activity history" },
  { id: "trends", label: "Insights", icon: "insights", description: "Patterns over time" },
  { id: "higher", label: "Higher Self", icon: "growth", description: "Values and personal growth" },
];

function NavigationIcon({ name }: { name: string }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "today" && <><rect x="3" y="4" width="18" height="17" rx="4" /><path d="M8 2v4m8-4v4M3 10h18m-13 5 3 3 5-5" /></>}
    {name === "train" && <><path d="m6 5 13 13M4 7l3-3M2 5l3-3m12 18 3-3m-1 5 3-3M4 10l6-6m4 16 6-6" /></>}
    {name === "journal" && <><path d="M5 3h12a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Zm-2 15a3 3 0 0 1 3-3h13M8 7h7m-7 4h5" /></>}
    {name === "insights" && <><path d="M4 3v17h17M8 15l4-5 4 2 5-7" /><path d="M17 5h4v4" /></>}
    {name === "growth" && <><path d="M12 21v-9m0 4C4 17 3 10 4 6c6-1 10 3 8 10Zm0-4c-1-6 3-10 9-9 1 6-3 10-9 9Z" /></>}
  </svg>;
}

export function AppNavigation({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return <nav className="bottom-nav" aria-label="Primary navigation">
    {destinations.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} title={item.description} onClick={() => { onChange(item.id); window.scrollTo({ top: 0, behavior: "instant" }); }}><NavigationIcon name={item.icon} /><span>{item.label}</span></button>)}
    <div className="nav-footer"><span aria-hidden="true">✦</span> Small steps.<br />Meaningful change.</div>
  </nav>;
}
