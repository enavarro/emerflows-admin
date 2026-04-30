// Class Trends view — heatmap, bars, word cloud, struggling list

function TrendsView({ data, vizMode, setVizMode }) {
  const [range, setRange] = useState("30d");
  const [focus, setFocus] = useState("grammar"); // grammar | vocab | fillers

  // derive class-wide stats
  const completionPct = useMemo(() => {
    const cells = data.modules.map((m, mi) => {
      const scores = data.students.map(s => data.progress[s.id][mi]);
      const completed = scores.filter(s => s === 3 || s === 4).length;
      return Math.round((completed / data.students.length) * 100);
    });
    return cells;
  }, [data]);

  const activeSet = focus === "grammar" ? data.grammarErrors
                  : focus === "vocab" ? data.vocabGaps.map(v => ({label: v.word + (v.note ? ` — ${v.note}` : ""), count: v.count}))
                  : data.fillers.map(f => ({label: `"${f.word}"`, count: f.count}));

  const maxCount = Math.max(...activeSet.map(x => x.count));

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="kicker">Class Trends · Spring 2026 · B1–B2</div>
          <h1 className="page__title">What's happening across 24 students</h1>
          <div className="page__sub">
            Completion, recurring errors, and students who may need a one-on-one. Pick a visualisation style to suit how you think.
          </div>
        </div>
        <div style={{display: "flex", gap: 8}}>
          <div className="select" onClick={() => setRange(range === "30d" ? "7d" : range === "7d" ? "90d" : "30d")}>
            <span className="select__label">Range</span>
            <span>{range === "7d" ? "Past 7 days" : range === "30d" ? "Past 30 days" : "Past 90 days"}</span>
          </div>
          <button className="btn btn--ghost"><Icon.download/> Export report</button>
        </div>
      </div>

      <div className="stats">
        <StatCard k="Avg. completion" v="68" suffix="%" sub="↑ 6% vs. prev. month" up spark/>
        <StatCard k="Active students" v="21" suffix=" / 24" sub="3 inactive &gt; 7 days" up spark/>
        <StatCard k="Avg. flags / sub" v="4.2" sub="↓ 0.8 vs. Mod 1–3" up spark/>
        <StatCard k="Needs attention" v="5" sub="flagged by model" up spark/>
      </div>

      <div className="trends-grid">
        {/* Module completion heatmap — always shown; this is the anchor */}
        <div className="card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Module completion by student</h3>
              <div className="card__sub">Rows: students · Columns: modules 1–12 · Outlined cells have open flags</div>
            </div>
            <div style={{display: "flex", gap: 6}}>
              <button className="btn btn--ghost btn--sm">Sort by name</button>
              <button className="btn btn--ghost btn--sm is-on" style={{background: "var(--teal)", color: "var(--cream)", borderColor: "var(--teal)"}}>Sort by progress</button>
            </div>
          </div>
          <div className="heat__header">
            <div>Student</div>
            {data.modules.map(m => <div key={m.id}>M{String(m.num).padStart(2,"0")}</div>)}
          </div>
          <div className="heat">
            {data.students.slice().sort((a,b) => {
              const sa = data.progress[a.id].reduce((x,y) => x + (y||0), 0);
              const sb = data.progress[b.id].reduce((x,y) => x + (y||0), 0);
              return sb - sa;
            }).map(s => (
              <div key={s.id} className="heat__row">
                <div className="heat__name" title={s.name}>
                  <span className={`avatar avatar--${s.avatar}`} style={{width: 20, height: 20, fontSize: 9, display: "inline-grid", verticalAlign: "middle", marginRight: 6}}>
                    {s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </span>
                  {s.name}
                </div>
                {data.progress[s.id].map((lvl, mi) => {
                  const flagged = lvl === 2 && (s.id.charCodeAt(2) + mi) % 5 === 0;
                  return (
                    <div key={mi}
                         className={`heat__cell heat__cell--${lvl ?? 0} ${flagged ? "heat__cell--flagged" : ""}`}
                         title={`${s.name} · M${mi+1} · ${["Not started","In progress","Submitted","Reviewed","Excellent"][lvl ?? 0]}`}/>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="legend">
            <span>Level</span>
            <div className="legend__scale">
              <div className="legend__dot" style={{background: "var(--cream)"}}/>
              <div className="legend__dot" style={{background: "color-mix(in oklab, var(--sage) 25%, var(--cream))"}}/>
              <div className="legend__dot" style={{background: "color-mix(in oklab, var(--sage) 50%, var(--cream))"}}/>
              <div className="legend__dot" style={{background: "color-mix(in oklab, var(--sage) 75%, var(--cream))"}}/>
              <div className="legend__dot" style={{background: "var(--sage-deep)"}}/>
            </div>
            <span style={{marginLeft: 6}}>not started → excellent</span>
            <span style={{marginLeft: 16, display: "inline-flex", alignItems: "center", gap: 6}}>
              <div className="legend__dot" style={{border: "2px solid var(--amber)", background: "transparent"}}/>
              open flags
            </span>
          </div>
          <div style={{marginTop: 14, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 3}}>
            {completionPct.map((p, i) => (
              <div key={i} style={{fontSize: 10, textAlign: "center"}}>
                <div style={{color: "var(--ink-3)", fontFamily: "var(--font-mono)"}}>{p}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right rail: trends deep-dive + struggling list */}
        <div>
          {/* Focus picker + viz variant switcher */}
          <div className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Recurring {focus === "grammar" ? "grammar errors" : focus === "vocab" ? "vocabulary gaps" : "filler words"}</h3>
                <div className="card__sub">Across all submissions in {range === "7d" ? "past week" : range === "30d" ? "past 30 days" : "past quarter"}</div>
              </div>
            </div>
            <div style={{display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap"}}>
              <button className={`chip ${focus === "grammar" ? "is-on" : ""}`} onClick={() => setFocus("grammar")}>Grammar</button>
              <button className={`chip ${focus === "vocab" ? "is-on" : ""}`} onClick={() => setFocus("vocab")}>Vocabulary gaps</button>
              <button className={`chip ${focus === "fillers" ? "is-on" : ""}`} onClick={() => setFocus("fillers")}>Filler words</button>
              <div style={{marginLeft: "auto", display: "flex", gap: 2, background: "var(--paper)", padding: 2, borderRadius: 8, border: "1px solid var(--line)"}}>
                {["bars","cloud","heat"].map(v => (
                  <button key={v} onClick={() => setVizMode(v)}
                          className="btn btn--sm"
                          style={{background: vizMode === v ? "var(--teal)" : "transparent",
                                  color: vizMode === v ? "var(--cream)" : "var(--ink-2)",
                                  border: "none", padding: "5px 9px", fontSize: 11}}>
                    {v === "bars" ? "Bars" : v === "cloud" ? "Cloud" : "Heat"}
                  </button>
                ))}
              </div>
            </div>

            {vizMode === "bars" && (
              <div className="bars">
                {activeSet.map((row, i) => (
                  <div key={i} className="bar-row">
                    <div className="bar-row__label">{row.label}</div>
                    <div className="bar-row__track">
                      <div className={`bar-row__fill ${focus === "fillers" ? "bar-row__fill--warn" : focus === "vocab" ? "bar-row__fill--rose" : ""}`}
                           style={{width: (row.count / maxCount * 100) + "%"}}/>
                    </div>
                    <div className="bar-row__count">{row.count}</div>
                  </div>
                ))}
              </div>
            )}

            {vizMode === "cloud" && (
              <div className="cloud">
                {activeSet.map((row, i) => {
                  const weight = row.count / maxCount;
                  const size = 14 + weight * 34;
                  const cls = weight > 0.7 ? "cloud__w--hot" : weight > 0.4 ? "cloud__w--warm" : "";
                  const label = row.label.replace(/"/g, "").split(" — ")[0];
                  return <span key={i} className={`cloud__w ${cls}`} style={{fontSize: size}} title={`${row.count} occurrences`}>{label}</span>;
                })}
              </div>
            )}

            {vizMode === "heat" && (
              <div style={{display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6}}>
                {activeSet.map((row, i) => {
                  const w = row.count / maxCount;
                  return (
                    <div key={i} title={`${row.count} occurrences`}
                         style={{
                           aspectRatio: "1.3",
                           borderRadius: 10,
                           padding: 10,
                           background: `color-mix(in oklab, var(--teal) ${Math.round(w*60+10)}%, var(--cream))`,
                           color: w > 0.5 ? "var(--cream)" : "var(--ink)",
                           display: "flex",
                           flexDirection: "column",
                           justifyContent: "space-between",
                           cursor: "pointer"
                         }}>
                      <div style={{fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, opacity: 0.7}}>#{i+1}</div>
                      <div>
                        <div style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 14, lineHeight: 1.2, marginBottom: 2}}>
                          {row.label.split(" — ")[0].replace(/"/g, "")}
                        </div>
                        <div style={{fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.75}}>{row.count} occurrences</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Struggling students */}
          <div className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Students who may need a check-in</h3>
                <div className="card__sub">Flagged by completion, flag-count change, level regression, or inactivity</div>
              </div>
              <Icon.warn style={{color: "var(--amber)"}}/>
            </div>
            <div className="struggle">
              {data.struggling.map((s, i) => (
                <div key={i} className="struggle__row">
                  <div className={`avatar avatar--${s.student.avatar}`}>
                    {s.student.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div>
                    <div className="struggle__name">{s.student.name}</div>
                    <div className="struggle__why">{s.reason}</div>
                  </div>
                  <div className="struggle__metric">
                    <div style={{color: "var(--rose)", fontWeight: 600, fontSize: 13}}>{s.metric}</div>
                    <div style={{fontSize: 10.5, color: "var(--ink-3)"}}>{s.detail}</div>
                  </div>
                  <button className="btn btn--ghost btn--sm">Open →</button>
                </div>
              ))}
            </div>
          </div>

          {/* Completion-per-module mini chart */}
          <div className="card">
            <div className="card__head">
              <h3 className="card__title">Attempt rates by module</h3>
              <Icon.trend style={{color: "var(--sage-deep)"}}/>
            </div>
            <div style={{display: "flex", alignItems: "flex-end", gap: 4, height: 120, padding: "4px 0"}}>
              {data.modules.map((m, i) => {
                const p = completionPct[i];
                return (
                  <div key={m.id} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4}}>
                    <div style={{fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)"}}>{p}</div>
                    <div style={{
                      width: "100%",
                      height: p + "%",
                      background: p > 70 ? "var(--sage-deep)" : p > 40 ? "var(--teal)" : "var(--amber)",
                      borderRadius: "4px 4px 2px 2px",
                      minHeight: 6
                    }}/>
                    <div style={{fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--ink-3)"}}>M{String(m.num).padStart(2,"0")}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TrendsView });
