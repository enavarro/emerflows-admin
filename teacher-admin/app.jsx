const { useState, useEffect, useRef } = React;

// ————————————————————————————————————————————————————————————————
// Content — matches the real screens
// ————————————————————————————————————————————————————————————————
const AGENT_QUESTIONS = [
  "What is your current job title?",
  "Where do you work, and what does the company do?",
  "What are your main responsibilities day to day?",
  "Can you tell me about a recent project or achievement you are proud of?",
  "Who do you usually work with?",
  "What do you enjoy most about your role?",
];

const COACH_OPENER = "Hello Emilio! My name is Matilda, your virtual speaking coach. I am going to ask you six questions to practice your self-introduction. Are you ready to get started?";

const LIVE_TURNS = [
  { role: "coach", text: COACH_OPENER },
  { role: "user",  text: "Yes, ready." },
  { role: "coach", text: "Great. What is your current job title?" },
  { role: "user",  text: "I am an AI Solutions Engineer." },
  { role: "coach", text: "And where do you work, and what does the company do?" },
  { role: "user",  text: "I work at ElevenLabs." },
  { role: "coach", text: "What are your main responsibilities day to day?" },
  { role: "user",  text: "I meet with potential customers that are interested in implementing the AI voice technology into their products. So I'm gathering all the requirements and providing feedback about how they can implement it." },
  { role: "coach", text: "Can you tell me about a recent project or achievement you are proud of?" },
  { role: "user",  text: "We implemented AI technology voice into an English app, where students can learn English by following a specific set of rules, with the AI coach." },
  { role: "coach", text: "Who do you usually work with?" },
  { role: "user",  text: "I work with sales teams and with clients." },
  { role: "coach", text: "What do you enjoy most about your role?" },
  { role: "user",  text: "I love seeing how voice technology evolves in society, and how it can be integrated into our day-to-day lives." },
];

// Answers as "sentences" for colour-coding in Improvements view
const SENTENCES = [
  { q: "What is your current job title?",
    parts: [{ t: "I am an ", cls: "ok" }, { t: "AI Solutions Engineer", cls: "weak" }, { t: ".", cls: "ok" }] },
  { q: "Where do you work, and what does the company do?",
    parts: [{ t: "I work at ", cls: "ok" }, { t: "ElevenLabs", cls: "weak" }, { t: ".", cls: "ok" }],
    flag: { label: "GRAMMAR, REFERRING TO PEOPLE", body: "who are interested", attach: 2 } },
  { q: "What are your main responsibilities day to day?",
    parts: [
      { t: "I meet with potential customers ", cls: "ok" },
      { t: "that are interested", cls: "weak" },
      { t: " in implementing the AI voice technology into their products. ", cls: "ok" },
      { t: "So I'm gathering", cls: "weak" },
      { t: " all the requirements and providing feedback about how they can implement it.", cls: "ok" },
    ] },
  { q: "Can you tell me about a recent project or achievement you are proud of?",
    parts: [
      { t: "We implemented ", cls: "ok" },
      { t: "AI technology voice", cls: "weak" },
      { t: " into an ", cls: "ok" },
      { t: "English app", cls: "weak" },
      { t: ", where students can learn English by ", cls: "ok" },
      { t: "following a specific set of rules", cls: "weak" },
      { t: ", with the AI coach.", cls: "ok" },
    ] },
  { q: "Who do you usually work with?",
    parts: [{ t: "I work with sales teams and ", cls: "ok" }, { t: "with clients", cls: "weak" }, { t: ".", cls: "ok" }] },
  { q: "What do you enjoy most about your role?",
    parts: [
      { t: "I ", cls: "ok" }, { t: "love seeing", cls: "weak" },
      { t: " how voice technology evolves ", cls: "ok" },
      { t: "in society", cls: "weak" },
      { t: ", and how it can be integrated into our day-to-day lives.", cls: "ok" },
    ] },
];

const POLISHED_INTRO = `“Hello, my name is Emilio. I am an AI Solutions Engineer at ElevenLabs, where we develop advanced voice technology to transform how people interact with digital products. I work closely with sales teams and clients to understand their needs and help them implement our AI voice solutions effectively. One project I'm especially proud of was integrating AI voice coaching into an English learning app, helping students improve their language skills through interactive practice. I enjoy seeing how voice technology evolves and how it can become a natural part of everyday life. It's exciting to be part of shaping the future of human-machine communication.”`;

const TRANSCRIPT_FOR_REVIEW = [
  { text: "Hello, my name is Emilio and I am a ", cls: "ok" },
  { text: "solution", cls: "highlight" },
  { text: " engineer at the level labs. AI voice is too your one project I'm especially proud of was integrating AI voice coaching into an English learning app, helping students improve their language skills ", cls: "ok" },
  { text: "with", cls: "highlight" },
  { text: " interactive practice. I enjoy seeing how voice technology evolves and how it can become a natural part of everyday life. It's exciting to be part of shaping the future of human machine communication.", cls: "ok" },
];

// ————————————————————————————————————————————————————————————————
// Icons
// ————————————————————————————————————————————————————————————————
const Icon = ({ name, size = 20, stroke = 1.8, style, filled }) => {
  const s = { width: size, height: size, stroke: "currentColor", strokeWidth: stroke, fill: filled ? "currentColor" : "none", strokeLinecap: "round", strokeLinejoin: "round", ...style };
  const paths = {
    mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></>,
    play: <path d="M8 5l12 7-12 7V5z" fill="currentColor" stroke="currentColor" />,
    pause: <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></>,
    chat: <path d="M4 5h16v11H8l-4 4V5z" />,
    sparkle: <><path d="M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3z" /></>,
    lightbulb: <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M8 14a6 6 0 1 1 8 0c-.8.8-1 1.5-1 2v2H9v-2c0-.5-.2-1.2-1-2z" /></>,
    check: <path d="M5 12l5 5L20 7" />,
    checkCircle: <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" /></>,
    arrow: <><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    quote: <><path d="M7 7h4v6a4 4 0 0 1-4 4" /><path d="M14 7h4v6a4 4 0 0 1-4 4" /></>,
    dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
    chev: <path d="M6 9l6 6 6-6" />,
    trophy: <><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M17 5h3v3a3 3 0 0 1-3 3" /><path d="M7 5H4v3a3 3 0 0 0 3 3" /></>,
    warn: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></>,
    reset: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>,
    x: <><path d="M6 6l12 12M18 6L6 18" /></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{paths[name]}</svg>;
};

// ————————————————————————————————————————————————————————————————
// Stepper — icon over a thick underline bar (matches screens)
// ————————————————————————————————————————————————————————————————
const Stepper = ({ step }) => {
  const items = [
    { icon: "chat", label: "Converse" },
    { icon: "mic", label: "Record" },
    { icon: "lightbulb", label: "Review" },
  ];
  return (
    <div className="stepper3">
      {items.map((it, i) => {
        const state = i < step ? "done" : i === step ? "current" : "future";
        return (
          <div key={i} className={`stepper3__col stepper3__col--${state}`}>
            <Icon name={it.icon} size={22} stroke={1.7} />
            <div className="stepper3__bar" />
          </div>
        );
      })}
    </div>
  );
};

// ————————————————————————————————————————————————————————————————
// Buttons
// ————————————————————————————————————————————————————————————————
const Btn = ({ children, variant = "teal", size = "md", onClick, icon, iconPos = "right", disabled, className = "" }) => (
  <button className={`btn btn--${variant} btn--${size} ${className}`} onClick={onClick} disabled={disabled}>
    {icon && iconPos === "left" && <Icon name={icon} size={size === "lg" ? 20 : 18} />}
    <span>{children}</span>
    {icon && iconPos === "right" && <Icon name={icon} size={size === "lg" ? 20 : 18} />}
  </button>
);

// Floating attempt chip (bottom left, matches screens)
const AttemptChip = () => <div className="attempt-chip">N</div>;

// ————————————————————————————————————————————————————————————————
// Screen 1: Name entry
// ————————————————————————————————————————————————————————————————
const NameEntry = ({ onContinue }) => {
  const [name, setName] = useState("Emilio");
  return (
    <div className="stage stage--beige center">
      <div className="name-card">
        <div className="name-card__avatar"><Icon name="user" size={24} stroke={1.6} /></div>
        <h1 className="display">Welcome!</h1>
        <p className="lede">What should we call you today?</p>
        <div className="input-frame">
          <input
            className="input-frame__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onContinue(name.trim())}
            autoFocus
          />
          <span className="input-frame__caret" aria-hidden="true" />
        </div>
        <Btn variant="teal" size="lg" className="w-full upper" onClick={() => name.trim() && onContinue(name.trim())} disabled={!name.trim()}>
          Continue
        </Btn>
      </div>
      <AttemptChip />
    </div>
  );
};

// ————————————————————————————————————————————————————————————————
// Screen 2: Idle
// ————————————————————————————————————————————————————————————————
const Idle = ({ name, attempt, onStart }) => (
  <div className="stage stage--beige center">
    <div className="dark-card dark-card--narrow">
      <h1 className="display display--dark">Professional Introduction<br/>Practice</h1>
      <div className="attempt">Attempt {attempt} of 2</div>
      <p className="lede lede--dark">Have a short conversation with Matilda, your AI speaking coach.</p>

      <div className="step-cards">
        {[
          { icon: "chat", k: "STEP 1", label: "Answer 6 questions" },
          { icon: "mic", k: "STEP 2", label: "Record the polished version" },
          { icon: "lightbulb", k: "STEP 3", label: "Check out the tips" },
        ].map((s, i) => (
          <div key={i} className="step-card">
            <Icon name={s.icon} size={22} />
            <div className="step-card__k">{s.k}</div>
            <div className="step-card__l">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="q-panel">
        <div className="q-panel__kicker">GET READY TO ANSWER:</div>
        {AGENT_QUESTIONS.map((q, i) => (
          <div key={i} className="q-row">
            <div className="q-row__num">{i + 1}</div>
            <div className="q-row__text">{q}</div>
          </div>
        ))}
      </div>

      <div className="mic-chip">
        <Icon name="checkCircle" size={18} />
        <span>Microphone ready, {name}!</span>
      </div>

      <Btn variant="sage" size="lg" className="w-full upper" onClick={onStart}>Start Conversation</Btn>
    </div>
    <AttemptChip />
  </div>
);

// ————————————————————————————————————————————————————————————————
// Screen 3: Live conversation — animated orb + transcript toggle
// ————————————————————————————————————————————————————————————————
const Orb = ({ phase }) => (
  <div className={`orb orb--${phase}`}>
    <div className="orb__halo" />
    <div className="orb__halo orb__halo--2" />
    <div className="orb__core">
      <div className="orb__petal orb__petal--1" />
      <div className="orb__petal orb__petal--2" />
      <div className="orb__petal orb__petal--3" />
      <div className="orb__petal orb__petal--4" />
    </div>
  </div>
);

const Conversation = ({ attempt, onEnd }) => {
  const [turns, setTurns] = useState([LIVE_TURNS[0]]);
  const [idx, setIdx] = useState(1);
  const [phase, setPhase] = useState("coach-speaking"); // coach-speaking | listening
  const [showTranscript, setShowTranscript] = useState(true);
  const [muted, setMuted] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (idx >= LIVE_TURNS.length) return;
    const next = LIVE_TURNS[idx];
    const ms = next.role === "coach" ? 1400 : 2200;
    const t = setTimeout(() => {
      setTurns((prev) => [...prev, next]);
      setIdx((i) => i + 1);
      setPhase(LIVE_TURNS[idx + 1]?.role === "user" ? "listening" : "coach-speaking");
    }, ms);
    return () => clearTimeout(t);
  }, [idx]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [turns]);

  return (
    <div className="stage stage--beige center">
      <div className="dark-card dark-card--convo">
        <Stepper step={0} />
        <Orb phase={muted ? "muted" : phase} />
        <div className="convo-status">
          <Icon name="dot" size={10} style={{ color: "var(--sage)" }} />
          <span>{muted ? "Muted — tap Mute again to resume" : phase === "coach-speaking" ? "Coach is speaking…" : "Listening to you…"}</span>
        </div>

        <div className="convo-controls">
          <button className={`btn btn--ghostdark btn--md ${muted ? "is-on" : ""}`} onClick={() => setMuted((m) => !m)}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <Btn variant="white" size="md" className="upper" onClick={onEnd}>End Conversation</Btn>
        </div>

        <button className={`transcript-toggle ${showTranscript ? "is-on" : ""}`} onClick={() => setShowTranscript((v) => !v)}>
          <Icon name="chev" size={16} style={{ transform: showTranscript ? "rotate(180deg)" : "none" }} />
          <span>{showTranscript ? "Hide transcript" : "Show transcript"}</span>
        </button>

        {showTranscript && (
          <div className="live-transcript" ref={listRef}>
            {turns.map((t, i) => (
              <div key={i} className={`live-bubble live-bubble--${t.role}`}>
                <div className="live-bubble__role">{t.role === "coach" ? "COACH" : "YOU"}</div>
                <div className="live-bubble__text">{t.text}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card-foot">
          <div className="card-foot__l"><Icon name="dot" size={10} style={{ color: "var(--sage)" }} /> LIVE CONVERSATION</div>
          <div className="card-foot__r">ATTEMPT {attempt} OF 2</div>
        </div>
      </div>
      <AttemptChip />
    </div>
  );
};

// ————————————————————————————————————————————————————————————————
// Screen 4: Analysing (beige full-bleed)
// ————————————————————————————————————————————————————————————————
const Analysing = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="stage stage--beige center">
      <div className="analysing">
        <div className="analysing__ring">
          <Icon name="sparkle" size={36} />
        </div>
        <h1 className="display">Analyzing your pitch…</h1>
        <p className="lede">Polishing your introduction for perfection</p>
      </div>
      <AttemptChip />
    </div>
  );
};

// ————————————————————————————————————————————————————————————————
// Screen 5: Results — polished pitch + summary + improvements
// ————————————————————————————————————————————————————————————————
const Results = ({ onProceed, onRestart }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="stage stage--beige">
      <div className="results-wrap">
        <div className="dark-card dark-card--results">
          <div className="sparkle-badge"><Icon name="sparkle" size={18} /></div>
          <Stepper step={1} />
          <div className="pill-chip"><Icon name="dot" size={9} style={{ color: "var(--sage-deep)" }} /><span>ANALYSIS COMPLETE</span></div>
          <h2 className="display display--dark center-text">Your Professional Pitch</h2>

          <blockquote className="pitch">
            <p>{POLISHED_INTRO}</p>
          </blockquote>

          <Btn variant="sage" size="lg" icon="mic" iconPos="left" className="w-full upper" onClick={onProceed}>
            Proceed to Recording
          </Btn>
        </div>

        <div className="light-card">
          <div className="light-card__row">
            <Icon name="chat" size={20} />
            <div className="light-card__title">Exercise Summary</div>
          </div>
          <p className="light-card__body">
            Emilio, you did a great job clearly articulating your role, company, and key responsibilities, providing concise and accurate answers to all the questions. To make your self-introduction even more impactful, try to elaborate slightly on the 'why' or 'how' of your tasks, perhaps by adding one more detail about the benefit or outcome of your work for clients. This will help paint a fuller picture of the value you bring.
          </p>
        </div>

        <div className="white-card">
          <button className="white-card__head" onClick={() => setOpen((o) => !o)}>
            <span>View Detailed Improvements</span>
            <Icon name="chev" size={20} style={{ transform: open ? "rotate(180deg)" : "none" }} />
          </button>
          {open && (
            <div className="white-card__body">
              {SENTENCES.map((s, i) => (
                <div key={i} className="sent-block">
                  <div className="sent-block__q">{s.q}</div>
                  <div className="sent-block__a">
                    {s.parts.map((p, j) => {
                      if (s.flag && s.flag.attach === j) {
                        return (
                          <span key={j} className="has-flag">
                            <span className={`seg seg--${p.cls}`}>{p.t}</span>
                            <span className="flag-bubble">
                              <span className="flag-bubble__warn"><Icon name="warn" size={14} /></span>
                              <span className="flag-bubble__title">{s.flag.label}</span>
                              <span className="flag-bubble__body">{s.flag.body}</span>
                            </span>
                          </span>
                        );
                      }
                      return <span key={j} className={`seg seg--${p.cls}`}>{p.t}</span>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="restart-link" onClick={onRestart}>
          <Icon name="reset" size={14} /> <span>RESTART ASSESSMENT</span>
        </button>
      </div>
      <AttemptChip />
    </div>
  );
};

// ————————————————————————————————————————————————————————————————
// Screen 6a: Record idle (tap to speak)
// ————————————————————————————————————————————————————————————————
const RecordIdle = ({ attempt, onStart, onSkip }) => {
  return (
    <div className="stage stage--beige center">
      <div className="dark-card dark-card--rec">
        <Stepper step={1} />
        <h2 className="display display--dark center-text">Record Your Introduction</h2>
        <p className="lede lede--dark center-text">Practice delivering your polished introduction out loud.</p>

        <button className="big-mic" onClick={onStart} aria-label="Tap to speak">
          <div className="big-mic__halo" />
          <div className="big-mic__core"><Icon name="mic" size={40} /></div>
        </button>
        <div className="tap-label">TAP TO SPEAK</div>
        <div className="tap-sub">Aim for 45 to 75 seconds</div>
        <div className="attempt-sub">Attempt {attempt} of 2</div>
        <div className="emilio">Emilio</div>

        <blockquote className="guide-quote">
          <div className="guide-quote__badge"><Icon name="sparkle" size={16} /></div>
          <p>{POLISHED_INTRO}</p>
        </blockquote>
      </div>
      <AttemptChip />
    </div>
  );
};

// ————————————————————————————————————————————————————————————————
// Screen 6b: Recording playback (listen / submit / re-record)
// ————————————————————————————————————————————————————————————————
const RecordPlayback = ({ attempt, onSubmit, onReRecord }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const total = 44;
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= total) { setPlaying(false); return total; }
        return p + 1;
      });
    }, 180);
    return () => clearInterval(iv);
  }, [playing]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="stage stage--beige center">
      <div className="dark-card dark-card--narrow">
        <Stepper step={1} />
        <h2 className="display display--dark">Record Your Introduction</h2>
        <p className="lede lede--dark">Practice delivering your polished introduction out loud.</p>

        <div className="playback">
          <button className="playback__btn" onClick={() => setPlaying((p) => !p)}>
            <Icon name={playing ? "pause" : "play"} size={20} />
          </button>
          <div className="playback__track">
            <div className="playback__fill" style={{ width: `${(progress / total) * 100}%` }} />
          </div>
          <div className="playback__time">{fmt(progress)}&nbsp;&nbsp;/&nbsp;&nbsp;{fmt(total)}</div>
        </div>

        <p className="center-text muted">Listen to your recording. If you are happy with it, submit to complete Step 2.</p>

        <div className="btn-row">
          <Btn variant="sage" size="lg" className="upper" onClick={onSubmit}>Submit Recording</Btn>
          <Btn variant="outlinewhite" size="lg" onClick={onReRecord}>Re-record</Btn>
        </div>

        <div className="card-foot">
          <div className="card-foot__l"><Icon name="dot" size={10} style={{ color: "var(--cream)", opacity: 0.5 }} /> RECORDING COMPLETE</div>
          <div className="card-foot__r">ATTEMPT {attempt} OF 2</div>
        </div>
      </div>
      <AttemptChip />
    </div>
  );
};

// ————————————————————————————————————————————————————————————————
// Screen 7: Performance review
// ————————————————————————————————————————————————————————————————
const PerformanceReview = ({ attempt, onComplete, onTryAgain }) => {
  return (
    <div className="stage stage--beige">
      <div className="perf-wrap">
        <div className="perf-head">
          <div className="pill-chip pill-chip--teal"><Icon name="sparkle" size={14} /><span>PRACTICE COMPLETE</span></div>
          <h1 className="display">Performance Review</h1>
          <div className="perf-sub">Module 1 · Professional Introductions</div>
          <div className="perf-sub perf-sub--small">ATTEMPT {attempt} OF 2</div>
        </div>

        <div className="transcript-card">
          <div className="transcript-card__head">
            <div className="transcript-pill">YOUR TRANSCRIPT</div>
            <button className="transcript-play"><Icon name="play" size={14} /></button>
          </div>
          <p className="transcript-body">
            {TRANSCRIPT_FOR_REVIEW.map((p, i) =>
              p.cls === "highlight"
                ? <span key={i} className="hl">{p.text}</span>
                : <span key={i}>{p.text}</span>
            )}
          </p>
          <div className="transcript-legend">
            <span className="legend-dot"/>
            <span>HOVER OVER AMBER TEXT FOR IMPROVEMENTS</span>
          </div>
        </div>

        <div className="feedback-card">
          <div className="feedback-card__icon"><Icon name="mic" size={18} /></div>
          <div className="feedback-card__body">
            <div className="feedback-card__title">Pronunciation</div>
            <p>You made a good effort with most words, but let's focus on a couple of key terms. For 'ElevenLabs', make sure to pronounce it clearly as ee-LEV-uhn-LABS. Also, remember 'solutions' (Say: suh-LOO-shuns) should be plural in 'AI Solutions Engineer'.</p>
          </div>
        </div>

        <div className="feedback-card">
          <div className="feedback-card__icon"><Icon name="lightbulb" size={18} /></div>
          <div className="feedback-card__body">
            <div className="feedback-card__title">Delivery &amp; Flow</div>
            <p>You started well, but there were some long pauses and a significant part of the introduction was skipped or unclear around the 0:24 mark. Practice delivering the full introduction smoothly, paying attention to the complete sentences and maintaining a consistent pace. Try to connect your ideas more fluidly to avoid abrupt transitions and ensure all the great information you want to share is included.</p>
          </div>
        </div>

        <div className="btn-row center">
          <Btn variant="sage" size="lg" icon="checkCircle" className="upper" onClick={onComplete}>Complete Module</Btn>
          <Btn variant="outlineteal" size="lg" icon="reset" onClick={onTryAgain}>Try Again</Btn>
        </div>
      </div>
      <AttemptChip />
    </div>
  );
};

// ————————————————————————————————————————————————————————————————
// Screen 8: Mission Accomplished
// ————————————————————————————————————————————————————————————————
const MissionComplete = ({ onNext }) => (
  <div className="stage stage--teal center">
    <div className="mission">
      <div className="mission__topline" />
      <div className="mission__trophy">
        <Icon name="trophy" size={32} stroke={2.2} />
      </div>
      <h1 className="display display--big">Mission<br/>Accomplished!</h1>
      <p className="mission__body">Amazing work! You have successfully built and practiced your professional introduction.</p>
      <Btn variant="teal" size="lg" icon="arrow" className="w-full upper" onClick={onNext}>Next Module</Btn>
    </div>
    <div className="attempt-chip attempt-chip--dark">N</div>
  </div>
);

// ————————————————————————————————————————————————————————————————
// Tweaks
// ————————————————————————————————————————————————————————————————
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "teal-sage",
  "headlineFont": "serif-bold",
  "attempt": 2
}/*EDITMODE-END*/;

const PALETTES = {
  "teal-sage":    { teal: "#1a5c6b", tealDeep: "#134955", sage: "#78F995", sageDeep: "#2ea15a", beige: "#EEEADF", cream: "#F5F0E8" },
  "ink-lime":     { teal: "#1f2937", tealDeep: "#111827", sage: "#c6f26a", sageDeep: "#6b9323", beige: "#f1ede3", cream: "#f7f2e7" },
  "plum-peach":   { teal: "#3b1f3d", tealDeep: "#2a1530", sage: "#ffb787", sageDeep: "#d88557", beige: "#f1e8e6", cream: "#f7ecea" },
  "ocean-butter": { teal: "#0f3e54", tealDeep: "#093044", sage: "#ffe48a", sageDeep: "#b99a2b", beige: "#ecefe8", cream: "#f3f4ec" },
};

const FONT_STACKS = {
  "serif-bold": `"Fraunces", "Instrument Serif", Georgia, serif`,
  "geometric":  `"Cabinet Grotesk", "Inter", system-ui, sans-serif`,
  "humanist":   `"Inter", system-ui, -apple-system, sans-serif`,
};

const App = () => {
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState("name");
  const [name, setName] = useState("Emilio");

  useEffect(() => {
    const p = PALETTES[tweaks.palette] || PALETTES["teal-sage"];
    const r = document.documentElement.style;
    r.setProperty("--teal", p.teal);
    r.setProperty("--teal-deep", p.tealDeep);
    r.setProperty("--sage", p.sage);
    r.setProperty("--sage-deep", p.sageDeep);
    r.setProperty("--beige", p.beige);
    r.setProperty("--cream", p.cream);
    r.setProperty("--font-display", FONT_STACKS[tweaks.headlineFont] || FONT_STACKS["serif-bold"]);
  }, [tweaks]);

  const attempt = tweaks.attempt;

  const page = (() => {
    switch (screen) {
      case "name":     return <NameEntry onContinue={(n) => { setName(n); setScreen("idle"); }} />;
      case "idle":     return <Idle name={name} attempt={attempt} onStart={() => setScreen("convo")} />;
      case "convo":    return <Conversation attempt={attempt} onEnd={() => setScreen("analyse")} />;
      case "analyse":  return <Analysing onDone={() => setScreen("results")} />;
      case "results":  return <Results onProceed={() => setScreen("recidle")} onRestart={() => setScreen("name")} />;
      case "recidle":  return <RecordIdle attempt={attempt} onStart={() => setScreen("recplay")} />;
      case "recplay":  return <RecordPlayback attempt={attempt} onSubmit={() => setScreen("perf")} onReRecord={() => setScreen("recidle")} />;
      case "perf":     return <PerformanceReview attempt={attempt} onComplete={() => setScreen("done")} onTryAgain={() => setScreen("recidle")} />;
      case "done":     return <MissionComplete onNext={() => setScreen("name")} />;
      default: return null;
    }
  })();

  return (
    <>
      {page}
      <StageNav screen={screen} setScreen={setScreen} />
      <TweaksPanel title="Tweaks">
        <TweakSection title="Palette">
          <TweakRadio
            label="Brand colours"
            value={tweaks.palette}
            onChange={(v) => setTweaks({ palette: v })}
            options={[
              { value: "teal-sage", label: "Teal + Sage (brief)" },
              { value: "ink-lime", label: "Ink + Lime" },
              { value: "plum-peach", label: "Plum + Peach" },
              { value: "ocean-butter", label: "Ocean + Butter" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Typography">
          <TweakRadio
            label="Display font"
            value={tweaks.headlineFont}
            onChange={(v) => setTweaks({ headlineFont: v })}
            options={[
              { value: "serif-bold", label: "Serif bold (Fraunces)" },
              { value: "geometric", label: "Geometric sans" },
              { value: "humanist", label: "Humanist (Inter)" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Flow">
          <TweakSlider label="Attempt" value={tweaks.attempt} min={1} max={2} step={1} onChange={(v) => setTweaks({ attempt: v })} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
};

const STAGES = [
  { id: "name", label: "1 Name" },
  { id: "idle", label: "2 Idle" },
  { id: "convo", label: "3 Converse" },
  { id: "analyse", label: "4 Analyse" },
  { id: "results", label: "5 Pitch" },
  { id: "recidle", label: "6a Record" },
  { id: "recplay", label: "6b Playback" },
  { id: "perf", label: "7 Review" },
  { id: "done", label: "8 Done" },
];

const StageNav = ({ screen, setScreen }) => (
  <div className="stage-nav">
    <div className="stage-nav__lbl">Jump</div>
    {STAGES.map((s) => (
      <button key={s.id} className={`stage-nav__b ${screen === s.id ? "is-on" : ""}`} onClick={() => setScreen(s.id)}>{s.label}</button>
    ))}
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
