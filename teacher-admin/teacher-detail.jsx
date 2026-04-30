// Submission detail view (speaking + conversational tabs)

function SubmissionDetail({ data, subId, onBack }) {
  const sub = data.featured; // showcase the featured submission
  const [tab, setTab] = useState(sub.type === "both" ? "speak" : sub.type);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0); // seconds
  const [speed, setSpeed] = useState(1);
  const [rubric, setRubric] = useState({ fluency: 3, grammar: 2, vocab: 3, pronunciation: 3, content: 4 });
  const [notes, setNotes] = useState("Nice progress since attempt 1 — delivery is more confident. Please work on the article 'a/an' rule and replace filler 'uh' with a short pause. Revisit Module 1 vocabulary before next assignment.");
  const [reviewed, setReviewed] = useState(false);
  const rafRef = useRef(null);

  const totalDur = sub.duration;
  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - pos * 1000 / speed;
    const tick = (ts) => {
      const p = (ts - start) * speed / 1000;
      if (p >= totalDur) { setPos(totalDur); setPlaying(false); return; }
      setPos(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed]);

  const activeLine = useMemo(() => {
    const lines = sub.recording.transcript;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (pos >= lines[i].t) return i;
    }
    return 0;
  }, [pos, sub]);

  // fake waveform bars (deterministic)
  const waveBars = useMemo(() => Array.from({length: 96}, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.43) * 0.6 + Math.sin(i * 1.7) * 0.3 + Math.cos(i * 0.21) * 0.2);
    return 18 + v * 28;
  }), []);

  const rubricTotal = Object.values(rubric).reduce((a,b) => a+b, 0);
  const rubricMax = Object.keys(rubric).length * 5;
  const rubricPct = Math.round((rubricTotal / rubricMax) * 100);

  return (
    <div className="page">
      <div style={{display: "flex", alignItems: "center", gap: 10, marginBottom: 18}}>
        <button className="btn btn--ghost btn--sm" onClick={onBack}>← Back to inbox</button>
        <div style={{fontSize: 12, color: "var(--ink-3)"}}>
          Prev student (J) · Next student (K) · Mark reviewed (⌘↵)
        </div>
      </div>

      <div className="detail-head">
        <div className={`detail-head__av avatar--${sub.student.avatar}`}>
          {sub.student.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <h1 className="detail-head__name">{sub.student.name}</h1>
          <div className="detail-head__meta">
            <span>M{String(sub.module.num).padStart(2,"0")} · {sub.module.title}</span>
            <span className="detail-head__dot"/>
            <span><Icon.clock/> {fmtDate(sub.submittedAt)}</span>
            <span className="detail-head__dot"/>
            <span>Attempt {sub.attempts} of 3</span>
            <span className="detail-head__dot"/>
            <span className="badge badge--lvl">{sub.level}</span>
            <span className="detail-head__dot"/>
            <span><Icon.flag/> {sub.conversation.pairs.reduce((a,p)=>a+p.flags.length,0) + 2} flags</span>
          </div>
        </div>
        <div className="detail-head__actions">
          <button className="btn btn--ghost btn--sm"><Icon.download/></button>
          <button className={`btn ${reviewed ? "btn--sage" : "btn--teal"}`} onClick={() => setReviewed(v => !v)}>
            <Icon.check/> {reviewed ? "Reviewed" : "Mark reviewed"}
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tabs__btn ${tab === "speak" ? "is-on" : ""}`} onClick={() => setTab("speak")}>
          <Icon.mic/> Speaking recording
          <span className="pill">{sub.recording.transcript.filter(l => l.classification === "needs improvement").length}</span>
        </button>
        <button className={`tabs__btn ${tab === "convo" ? "is-on" : ""}`} onClick={() => setTab("convo")}>
          <Icon.chat/> Conversation & intro
          <span className="pill">{sub.conversation.pairs.reduce((a,p)=>a+p.flags.length,0)}</span>
        </button>
        <button className={`tabs__btn ${tab === "ai" ? "is-on" : ""}`} onClick={() => setTab("ai")}>
          <Icon.sparkle/> AI tips & summary
        </button>
      </div>

      <div className="detail">
        <div>
          {tab === "speak" && (
            <>
              <div className="card" style={{padding: 0, overflow: "hidden"}}>
                <div style={{padding: "20px 22px 0"}}>
                  <div className="card__head">
                    <div>
                      <h3 className="card__title">Spoken introduction — attempt {sub.attempts}</h3>
                      <div className="card__sub">{sub.recording.audioPath}</div>
                    </div>
                    <div style={{display: "flex", gap: 6}}>
                      <button className="btn btn--ghost btn--sm"><Icon.download/> Download .webm</button>
                    </div>
                  </div>
                </div>
                <div style={{padding: "0 22px 22px"}}>
                  <div className="player">
                    <button className="player__play" onClick={() => setPlaying(p => !p)}>
                      {playing ? <Icon.pause/> : <Icon.play/>}
                    </button>
                    <div className="player__middle">
                      <div className="player__wave" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPos((e.clientX - rect.left) / rect.width * totalDur);
                      }}>
                        {waveBars.map((h, i) => {
                          const playedAt = (i / waveBars.length) * totalDur;
                          return <span key={i} className={`player__wave-bar ${playedAt <= pos ? "is-played" : ""}`} style={{height: h + "%"}}/>;
                        })}
                        <span className="player__wave-scrub" style={{left: `${(pos/totalDur) * 100}%`}}/>
                      </div>
                      <div className="player__meta">
                        <span>{fmtDuration(Math.floor(pos))} / {fmtDuration(totalDur)}</span>
                        <span>·</span>
                        <span>44.1 kHz / mono</span>
                      </div>
                    </div>
                    <div className="player__speed">
                      {[0.75, 1, 1.25, 1.5].map(s => (
                        <button key={s} className={`player__speed-btn ${speed === s ? "is-on" : ""}`} onClick={() => setSpeed(s)}>{s}×</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card__head">
                  <div>
                    <h3 className="card__title">Synced transcript</h3>
                    <div className="card__sub">Click any line to jump · weak passages highlighted</div>
                  </div>
                  <span style={{fontSize: 11, color: "var(--ink-3)"}}>Language model · Coach v4.2</span>
                </div>
                <div className="transcript">
                  {sub.recording.transcript.map((line, i) => {
                    const nextT = sub.recording.transcript[i+1]?.t ?? totalDur;
                    const weak = line.classification === "needs improvement";
                    return (
                      <div key={i} className={`t-line ${i === activeLine ? "is-playing" : ""} ${weak ? "t-line--weak" : ""}`}
                           onClick={() => { setPos(line.t); setPlaying(true); }}>
                        <div className="t-line__time">{fmtDuration(Math.floor(line.t))}</div>
                        <div className={`t-line__dot ${weak ? "t-line__dot--weak" : "t-line__dot--strong"}`}/>
                        <div className="t-line__text">
                          {weak && line.weak ? (
                            <>{line.text.split(line.weak).map((chunk, j, arr) => (
                              <React.Fragment key={j}>
                                {chunk}{j < arr.length - 1 && <em>{line.weak}</em>}
                              </React.Fragment>
                            ))}</>
                          ) : line.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <div className="card__head">
                  <h3 className="card__title">AI coaching tips from this recording</h3>
                  <span className="badge badge--lvl">{sub.level}</span>
                </div>
                {sub.recording.tips.map((tip, i) => (
                  <div key={i} className="tip">
                    <div className="tip__ic">
                      {tip.category === "pronunciation" ? <Icon.mic/> : <Icon.sparkle/>}
                    </div>
                    <div>
                      <div className="tip__cat">{tip.category}</div>
                      <div className="tip__body">{tip.tip}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "convo" && (
            <>
              <div className="card">
                <div className="card__head">
                  <h3 className="card__title">Polished self-introduction</h3>
                  <span className="card__sub">Generated from the live coach chat</span>
                </div>
                <div className="polished">
                  <div className="polished__k">Final intro · submitted</div>
                  <div className="polished__body">"{sub.conversation.introduction}"</div>
                </div>
              </div>

              <div className="card">
                <div className="card__head">
                  <div>
                    <h3 className="card__title">Coach conversation — {sub.conversation.pairs.length} Q/A pairs</h3>
                    <div className="card__sub">Flagged spans and inline suggestions</div>
                  </div>
                  <span style={{fontSize: 11, color: "var(--ink-3)"}}>
                    conv_6501kn1wj9jsfr38ma4d1cgrf846
                  </span>
                </div>
                <div className="qa">
                  {sub.conversation.pairs.map((p, i) => (
                    <div key={i} className="qa__pair">
                      <div className="qa__q">Q{i+1} · {p.question}</div>
                      <div className="qa__a">
                        {p.flags.filter(f => f.word).reduce((acc, f, fi) => {
                          if (!acc.text.includes(f.word)) return acc;
                          const parts = acc.text.split(f.word);
                          return {
                            text: parts.join("␟"),
                            nodes: (acc.nodes || []).concat([{ raw: parts, word: f.word }])
                          };
                        }, { text: p.answer, nodes: [] }).text.split("").length > 0 && (
                          <HighlightedAnswer text={p.answer} flags={p.flags}/>
                        )}
                      </div>
                      {p.flags.length > 0 && (
                        <div className="qa__flags">
                          {p.flags.map((f, fi) => (
                            <div key={fi} className="qa__flag">
                              {f.word ? <span className="qa__flag-word">{f.word}</span> : <span className="qa__flag-word" style={{fontStyle:"italic", opacity:0.6}}>(missing)</span>}
                              <span><span className="qa__flag-issue">{f.issue}</span> <span className="qa__flag-suggest">→ try: <code>{f.suggestion}</code></span></span>
                              <button className="btn btn--ghost btn--sm">Apply</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card__head">
                  <h3 className="card__title">Exercise summary</h3>
                  <Icon.sparkle style={{color: "var(--sage-deep)"}}/>
                </div>
                <div style={{fontFamily: "var(--font-display)", fontSize: 16, lineHeight: 1.55, color: "var(--ink)", fontStyle: "italic"}}>
                  "{sub.conversation.summary}"
                </div>
              </div>
            </>
          )}

          {tab === "ai" && (
            <>
              <div className="card">
                <h3 className="card__title" style={{marginBottom: 12}}>Cross-assignment signals</h3>
                <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12}}>
                  <MiniMetric k="Estimated level" v={sub.level} note="Stable across 2 attempts"/>
                  <MiniMetric k="Words / min" v="112" note="Target 120–140"/>
                  <MiniMetric k="Filler rate" v="6.4 / min" note="↑ vs. class avg 3.1"/>
                  <MiniMetric k="Lexical variety" v="0.51" note="B1 band"/>
                  <MiniMetric k="Pause ratio" v="18%" note="Healthy"/>
                  <MiniMetric k="Confidence" v="7.2 / 10" note="Up from 5.8"/>
                </div>
              </div>
              <div className="card">
                <h3 className="card__title" style={{marginBottom: 12}}>Patterns across modules 1–3</h3>
                <div className="bars">
                  {[
                    {label: "Article errors (a/an)", count: 6, total: 10},
                    {label: "Filler 'uh'", count: 5, total: 10, warn: true},
                    {label: "Repetition of phrases", count: 3, total: 10, warn: true},
                    {label: "Strong vocabulary use", count: 7, total: 10},
                  ].map((row,i) => (
                    <div key={i} className="bar-row">
                      <div className="bar-row__label">{row.label}</div>
                      <div className="bar-row__track">
                        <div className={`bar-row__fill ${row.warn ? "bar-row__fill--warn" : ""}`} style={{width: (row.count/row.total*100) + "%"}}/>
                      </div>
                      <div className="bar-row__count">{row.count}/{row.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right rail — rubric, notes, actions */}
        <div>
          <div className="card">
            <div className="card__head">
              <h3 className="card__title">Rubric</h3>
              <span style={{fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)"}}>/ 25</span>
            </div>
            <div className="rubric">
              {[
                ["fluency", "Fluency & pace"],
                ["grammar", "Grammar"],
                ["vocab", "Vocabulary range"],
                ["pronunciation", "Pronunciation"],
                ["content", "Content depth"],
              ].map(([k, label]) => (
                <div key={k} className="rubric__item">
                  <div className="rubric__row">
                    <span className="rubric__name">{label}</span>
                    <span className="rubric__val">{rubric[k]} / 5</span>
                  </div>
                  <div className="rubric__scale">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={`rubric__dot ${n <= rubric[k] ? "is-on" : ""}`} onClick={() => setRubric(r => ({...r, [k]: n}))}/>
                    ))}
                  </div>
                </div>
              ))}
              <div className="rubric__total">
                <div>
                  <div style={{fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600}}>Total</div>
                  <div style={{fontSize: 11, color: "var(--ink-3)"}}>{rubricPct}% · {rubricPct >= 80 ? "Pass with merit" : rubricPct >= 60 ? "Pass" : "Revisit"}</div>
                </div>
                <div className="rubric__total-v">{rubricTotal} / 25</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <h3 className="card__title">Private notes</h3>
              <span style={{fontSize: 11, color: "var(--ink-3)"}}>Only you see these</span>
            </div>
            <textarea className="notes" value={notes} onChange={(e) => setNotes(e.target.value)}/>
            <div style={{display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap"}}>
              <button className="chip" onClick={() => setNotes(n => n + "\n\nPlease redo attempt focusing on articles (a/an).")}>+ Request redo</button>
              <button className="chip">+ Send to student</button>
              <button className="chip">+ Flag for head coach</button>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <h3 className="card__title">Quick actions</h3>
            </div>
            <div style={{display: "flex", flexDirection: "column", gap: 6}}>
              <button className="btn btn--ghost" style={{justifyContent: "flex-start"}}>
                <Icon.sparkle/> Unlock 3rd attempt
              </button>
              <button className="btn btn--ghost" style={{justifyContent: "flex-start"}}>
                <Icon.arrow/> Compare with attempt 1
              </button>
              <button className="btn btn--ghost" style={{justifyContent: "flex-start"}}>
                <Icon.download/> Export feedback PDF
              </button>
              <button className="btn btn--ghost" style={{justifyContent: "flex-start"}}>
                <Icon.chat/> Draft student reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ k, v, note }) {
  return (
    <div style={{padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--paper)"}}>
      <div style={{fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-3)", marginBottom: 6}}>{k}</div>
      <div style={{fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em"}}>{v}</div>
      <div style={{fontSize: 11, color: "var(--ink-2)", marginTop: 2}}>{note}</div>
    </div>
  );
}

function HighlightedAnswer({ text, flags }) {
  const spans = flags.filter(f => f.word && text.includes(f.word)).map(f => f.word);
  if (spans.length === 0) return <>{text}</>;
  // Build regex
  const esc = spans.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${esc.join("|")})`, "g");
  const parts = text.split(re);
  return parts.map((p, i) => spans.includes(p) ? <em key={i}>{p}</em> : <React.Fragment key={i}>{p}</React.Fragment>);
}

Object.assign(window, { SubmissionDetail, HighlightedAnswer, MiniMetric });
