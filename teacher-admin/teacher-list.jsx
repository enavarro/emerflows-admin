// Submissions list + sidebar + shared UI
const { useState, useMemo, useEffect, useRef } = React;

// ——— Shared icons ———
const Icon = {
  search: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  bell: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  filter: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M7 12h10M10 18h4"/></svg>,
  chev: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 18 6-6-6-6"/></svg>,
  play: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5v14l11-7z"/></svg>,
  pause: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>,
  mic: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>,
  chat: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z"/></svg>,
  flag: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 21V4h12l-2 4 2 4H4"/></svg>,
  check: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m5 12 5 5L20 7"/></svg>,
  clock: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  arrow: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  download: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v14M6 13l6 6 6-6M4 21h16"/></svg>,
  sparkle: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>,
  warn: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>,
  trend: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>,
};

// ——— Utilities ———
function fmtDuration(sec) {
  const m = Math.floor(sec / 60); const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function relTime(d) {
  const diff = (new Date("2026-04-22T18:30:00Z") - d) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff/60))} min ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)} h ago`;
  const days = Math.floor(diff/86400);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
function fmtDate(d) {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ——— Sidebar ———
function Sidebar({ view, setView, counts, activeCohort, onChangeCohort }) {
  const items = [
    { id: "admin",       label: "Cohorts",      count: 4, section: "Admin" },
    { id: "teachers",    label: "Teachers",     count: 7 },
    { id: "students",    label: "Students",     count: 86 },
    { id: "submissions", label: "Submissions",  count: counts.newReviews, section: "Teach" },
    { id: "trends",      label: "Class Trends", count: null },
    { id: "roster",      label: "Roster",       count: 24 },
    { id: "modules",     label: "Modules",      count: 12 },
    { id: "library",     label: "Library",      count: null, section: "Content" },
    { id: "assignments", label: "Assignments",  count: null },
    { id: "settings",    label: "Settings",     count: null, section: "Account" },
  ];
  return (
    <aside className="side">
      <div className="side__brand">
        <div className="side__logo">ef</div>
        <div>
          <div className="side__brand-name">Emerflows</div>
          <div className="side__brand-sub">Educator</div>
        </div>
      </div>
      <div style={{marginBottom: 8, padding: "0 6px"}}>
        <button className="select"
          onClick={onChangeCohort}
          style={{background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--cream)", width: "100%", cursor: "pointer"}}>
          <span className="select__label" style={{color: "rgba(245,240,232,0.55)"}}>Cohort</span>
          <span>{activeCohort || "Spring 2026 · B1–B2"}</span>
        </button>
      </div>
      {items.map((it, i) => (
        <React.Fragment key={it.id}>
          {it.section && <div className="side__section">{it.section}</div>}
          <button className={`side__item ${view === it.id ? "is-on" : ""}`} onClick={() => setView(it.id)}>
            <span className="side__item-bullet"/>
            <span>{it.label}</span>
            {it.count != null && <span className="side__item-count">{it.count}</span>}
          </button>
        </React.Fragment>
      ))}
      <div className="side__foot">
        <div className="side__avatar">CR</div>
        <div>
          <div className="side__who">Claire Roy</div>
          <div className="side__who-sub">Head Coach</div>
        </div>
      </div>
    </aside>
  );
}

// ——— Topbar ———
function Topbar({ crumbs, search, setSearch }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumbs__sep">/</span>}
            <span className={i === crumbs.length - 1 ? "crumbs__current" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="topbar__spacer"/>
      <div className="search">
        <Icon.search/>
        <input placeholder="Search student, module or keyword…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        <kbd>⌘K</kbd>
      </div>
      <button className="icon-btn" title="Notifications"><Icon.bell/></button>
      <button className="btn btn--sage"><Icon.sparkle/> Ask Coach</button>
    </div>
  );
}

// ——— Submissions list ———
function SubmissionsView({ data, onOpen, search }) {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("date");

  const filtered = useMemo(() => {
    let rows = data.submissions.slice();
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.student.name.toLowerCase().includes(q) || r.module.title.toLowerCase().includes(q));
    }
    if (moduleFilter !== "all") rows = rows.filter(r => r.module.id === moduleFilter);
    if (statusFilter !== "all") rows = rows.filter(r => r.status === statusFilter);
    if (typeFilter !== "all") rows = rows.filter(r => r.type === typeFilter || (typeFilter === "speak" && r.type === "both") || (typeFilter === "convo" && r.type === "both"));
    if (sort === "date") rows.sort((a,b) => b.submittedAt - a.submittedAt);
    else if (sort === "flags") rows.sort((a,b) => b.flagCount - a.flagCount);
    else if (sort === "name") rows.sort((a,b) => a.student.name.localeCompare(b.student.name));
    return rows;
  }, [data, search, moduleFilter, statusFilter, typeFilter, sort]);

  const stats = useMemo(() => {
    const all = data.submissions;
    const newReviews = all.filter(s => s.status === "needs-review").length;
    const reviewed = all.filter(s => s.status === "reviewed").length;
    const avgFlags = (all.reduce((a,s) => a + s.flagCount, 0) / all.length).toFixed(1);
    const completion = Math.round((all.length / (data.students.length * data.modules.length)) * 100);
    return { newReviews, reviewed, avgFlags, completion };
  }, [data]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="kicker">Spring 2026 · Cohort B</div>
          <h1 className="page__title">Submissions inbox</h1>
          <div className="page__sub">
            {stats.newReviews} submissions need your review. Click any row to open the recording, transcript, and rubric.
          </div>
        </div>
        <div style={{display: "flex", gap: 8}}>
          <button className="btn btn--ghost"><Icon.download/> Export CSV</button>
          <button className="btn btn--teal"><Icon.check/> Mark all reviewed</button>
        </div>
      </div>

      <div className="stats">
        <StatCard k="Needs review" v={stats.newReviews} sub="↑ 4 since yesterday" up spark/>
        <StatCard k="Reviewed this week" v={stats.reviewed} sub="42 last week" up spark/>
        <StatCard k="Class completion" v={stats.completion} suffix="%" sub="Target 75%" up spark/>
        <StatCard k="Avg flags per submission" v={stats.avgFlags} sub="↓ 0.6 vs. prev. module" up spark/>
      </div>

      <div className="filters">
        <span className="filters__label">Module</span>
        <button className={`chip ${moduleFilter === "all" ? "is-on" : ""}`} onClick={() => setModuleFilter("all")}>All 12</button>
        {data.modules.slice(0, 6).map(m => (
          <button key={m.id} className={`chip ${moduleFilter === m.id ? "is-on" : ""}`} onClick={() => setModuleFilter(m.id)}>
            M{String(m.num).padStart(2, "0")} · {m.title}
          </button>
        ))}
        <div className="select" onClick={() => {
          const ids = data.modules.slice(6).map(m => m.id);
          const next = ids.includes(moduleFilter) ? "all" : ids[0];
          setModuleFilter(next);
        }}>
          <span className="select__label">+ More</span>
          <span>{data.modules.slice(6).find(m => m.id === moduleFilter)?.title || "Modules 7–12"}</span>
        </div>

        <div style={{width: 1, height: 20, background: "var(--line)", margin: "0 6px"}}/>

        <span className="filters__label">Status</span>
        {[["all","All"],["needs-review","Needs review"],["reviewed","Reviewed"],["late","Late"]].map(([v,l]) => (
          <button key={v} className={`chip ${statusFilter === v ? "is-on" : ""}`} onClick={() => setStatusFilter(v)}>{l}</button>
        ))}

        <div style={{marginLeft: "auto", display: "flex", gap: 8, alignItems: "center"}}>
          <span className="filters__label">Sort</span>
          <div className="select" onClick={() => setSort(sort === "date" ? "flags" : sort === "flags" ? "name" : "date")}>
            <span className="select__label">By</span>
            <span>{sort === "date" ? "Newest" : sort === "flags" ? "Most flags" : "Name A→Z"}</span>
          </div>
        </div>
      </div>

      <div className="table-card">
        <table className="sub-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Module</th>
              <th>Type</th>
              <th>Level</th>
              <th className={sort === "flags" ? "is-sorted" : ""}>Flags</th>
              <th>Duration</th>
              <th>Score</th>
              <th>Status</th>
              <th className={sort === "date" ? "is-sorted" : ""}>Submitted</th>
              <th style={{width: 32}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 22).map(r => (
              <tr key={r.id} onClick={() => onOpen(r.id)} className={r.id === data.featuredId ? "is-selected" : ""}>
                <td>
                  <div className="name-cell">
                    <div className={`avatar avatar--${r.student.avatar}`}>{r.student.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                    <div>
                      <div className="name-cell__name">{r.student.name}</div>
                      <div className="name-cell__sub">{r.student.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{fontWeight: 500}}>M{String(r.module.num).padStart(2, "0")} · {r.module.title}</div>
                  {r.attempts > 1 && <div style={{fontSize: 11, color: "var(--ink-3)"}}>Attempt {r.attempts}</div>}
                </td>
                <td>
                  {r.type === "speak" && <span className="badge badge--type-speak"><Icon.mic/> Speaking</span>}
                  {r.type === "convo" && <span className="badge badge--type-convo"><Icon.chat/> Conversation</span>}
                  {r.type === "both" && <span className="badge badge--type-both"><Icon.sparkle/> Both</span>}
                </td>
                <td><span className="badge badge--lvl">{r.level}</span></td>
                <td>
                  <span className={`flag-count ${r.flagCount >= 6 ? "is-higher" : r.flagCount >= 3 ? "is-high" : ""}`}>
                    <Icon.flag/> {r.flagCount}
                  </span>
                </td>
                <td style={{fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)"}}>{fmtDuration(r.duration)}</td>
                <td>
                  {r.score != null ? (
                    <span className="mini-bar__wrap">
                      <span className="mini-bar">
                        <span className={`mini-bar__fill ${r.score < 65 ? "mini-bar__fill--bad" : r.score < 80 ? "mini-bar__fill--warn" : ""}`} style={{width: r.score + "%"}}/>
                      </span>
                      {r.score}
                    </span>
                  ) : <span style={{color: "var(--ink-4)"}}>—</span>}
                </td>
                <td>
                  {r.status === "needs-review" && <span className="badge badge--status-review"><Icon.clock/> Needs review</span>}
                  {r.status === "reviewed" && <span className="badge badge--status-reviewed"><Icon.check/> Reviewed</span>}
                  {r.status === "late" && <span className="badge badge--status-late"><Icon.warn/> Late</span>}
                  {r.status === "submitted" && <span className="badge badge--status-submitted">Submitted</span>}
                </td>
                <td>
                  <div className="date-cell">{fmtDate(r.submittedAt)}</div>
                  <div className="date-cell date-cell__rel">{relTime(r.submittedAt)}</div>
                </td>
                <td><span className="row-chev"><Icon.chev/></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop: 10, fontSize: 11.5, color: "var(--ink-3)", textAlign: "center"}}>
        Showing {Math.min(22, filtered.length)} of {filtered.length} submissions
      </div>
    </div>
  );
}

function StatCard({ k, v, suffix, sub, up, spark }) {
  // cheap static sparkline
  const pts = "0,18 8,15 16,17 24,12 32,14 40,9 48,11 56,6";
  return (
    <div className="stat">
      <div className="stat__k">{k}</div>
      <div className="stat__v">{v}{suffix && <span>{suffix}</span>}</div>
      <div className={`stat__d ${up ? "delta-up" : ""}`}>{sub}</div>
      {spark && (
        <svg className="stat__spark" viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points={pts}/>
        </svg>
      )}
    </div>
  );
}

Object.assign(window, { Icon, fmtDuration, relTime, fmtDate, Sidebar, Topbar, SubmissionsView, StatCard });
