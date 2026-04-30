// Admin hub — cohorts, teachers, students + create-cohort wizard

function AdminHub({ onEnterCohort }) {
  const [tab, setTab] = useState("cohorts");
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="kicker">Teach Admin · Emerflows School</div>
          <h1 className="page__title">Cohorts & people</h1>
          <div className="page__sub">Create a new cohort, assign teachers and students, and jump into any active class.</div>
        </div>
        <div style={{display: "flex", gap: 8}}>
          <button className="btn btn--ghost"><Icon.download/> Export</button>
          <button className="btn btn--teal" onClick={() => setWizardOpen(true)}>+ New cohort</button>
        </div>
      </div>

      <div className="stats">
        <StatCard k="Active cohorts" v="3" sub="1 upcoming · 0 archived" up/>
        <StatCard k="Teachers" v="7" sub="2 invited, pending" up/>
        <StatCard k="Enrolled students" v="86" sub="↑ 12 this term" up/>
        <StatCard k="School completion" v="71" suffix="%" sub="target 75%" up/>
      </div>

      <div className="tabs" style={{marginBottom: 18}}>
        <button className={`tabs__btn ${tab === "cohorts" ? "is-on" : ""}`} onClick={() => setTab("cohorts")}>
          Cohorts <span className="pill">4</span>
        </button>
        <button className={`tabs__btn ${tab === "teachers" ? "is-on" : ""}`} onClick={() => setTab("teachers")}>
          Teachers <span className="pill">7</span>
        </button>
        <button className={`tabs__btn ${tab === "students" ? "is-on" : ""}`} onClick={() => setTab("students")}>
          Student pool <span className="pill">86</span>
        </button>
      </div>

      {tab === "cohorts" && <CohortsGrid onEnterCohort={onEnterCohort} onNew={() => setWizardOpen(true)}/>}
      {tab === "teachers" && <TeachersTable/>}
      {tab === "students" && <StudentPool/>}

      {wizardOpen && <CreateCohortWizard onClose={() => setWizardOpen(false)}/>}
    </div>
  );
}

const COHORTS = [
  { id: "spring26",  name: "Spring 2026 · B1–B2",      level: "B1 → B2", term: "Feb 3 – May 29, 2026", status: "active",   students: 24, teachers: ["Claire Roy","Noah Park"],           completion: 68, needsReview: 14, modules: 12, next: "M04 · Apr 26" },
  { id: "spring26b", name: "Spring 2026 · Business",   level: "B2 → C1", term: "Feb 3 – May 29, 2026", status: "active",   students: 18, teachers: ["Emily Tran"],                       completion: 74, needsReview:  6, modules: 12, next: "M05 · Apr 27" },
  { id: "intensive", name: "April Intensive",          level: "A2 → B1", term: "Apr 6 – Apr 30, 2026", status: "active",   students: 12, teachers: ["Luis Ortega","Claire Roy"],          completion: 82, needsReview:  3, modules:  8, next: "M07 · Apr 25" },
  { id: "summer26",  name: "Summer 2026 · General",    level: "B1 → B2", term: "Jun 8 – Aug 28, 2026", status: "upcoming", students:  0, teachers: ["Claire Roy"],                       completion:  0, needsReview:  0, modules: 12, next: "Starts Jun 8" },
  { id: "fall25",    name: "Fall 2025 · B1–B2",        level: "B1 → B2", term: "Sep 9 – Dec 12, 2025", status: "archived", students: 21, teachers: ["Emily Tran","Noah Park"],            completion: 94, needsReview:  0, modules: 12, next: "Completed" },
];

function CohortsGrid({ onEnterCohort, onNew }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const rows = statusFilter === "all" ? COHORTS : COHORTS.filter(c => c.status === statusFilter);

  return (
    <>
      <div className="filters">
        <span className="filters__label">Status</span>
        {[["all","All"],["active","Active"],["upcoming","Upcoming"],["archived","Archived"]].map(([v,l]) => (
          <button key={v} className={`chip ${statusFilter === v ? "is-on" : ""}`} onClick={() => setStatusFilter(v)}>{l}</button>
        ))}
        <div style={{marginLeft: "auto", display: "flex", gap: 8}}>
          <button className="btn btn--ghost btn--sm">Sort: Recent</button>
          <button className="btn btn--ghost btn--sm">View: Grid</button>
        </div>
      </div>

      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14}}>
        {rows.map(c => <CohortCard key={c.id} c={c} onOpen={() => onEnterCohort(c)}/>)}
        <button onClick={onNew} style={{
          border: "2px dashed var(--line)",
          borderRadius: 14,
          padding: 24,
          background: "transparent",
          color: "var(--ink-2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          minHeight: 220,
          cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s"
        }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.background = "var(--cream)"; }}
           onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "transparent"; }}>
          <div style={{width: 44, height: 44, borderRadius: 999, background: "var(--teal)", color: "var(--cream)", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 300}}>+</div>
          <div style={{fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)"}}>New cohort</div>
          <div style={{fontSize: 12, color: "var(--ink-3)", textAlign: "center", maxWidth: 220}}>Start from scratch or duplicate an existing cohort in 4 quick steps.</div>
        </button>
      </div>
    </>
  );
}

function CohortCard({ c, onOpen }) {
  const statusColor = c.status === "active" ? "var(--sage-deep)" : c.status === "upcoming" ? "var(--amber)" : "var(--ink-3)";
  return (
    <div className="card" style={{padding: 0, overflow: "hidden", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s"}}
         onClick={onOpen}
         onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 30px -12px rgba(26,92,107,0.15)"; }}
         onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{padding: "18px 20px 14px", borderBottom: "1px solid var(--line-soft)"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10}}>
          <div style={{display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: statusColor}}>
            <span style={{width: 6, height: 6, borderRadius: 999, background: statusColor}}/> {c.status}
          </div>
          <span className="badge badge--lvl">{c.level}</span>
        </div>
        <div style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.015em", color: "var(--ink)", marginBottom: 4}}>{c.name}</div>
        <div style={{fontSize: 12, color: "var(--ink-3)"}}>{c.term}</div>
      </div>
      <div style={{padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12}}>
        <div>
          <div style={{fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-3)", marginBottom: 4}}>Students</div>
          <div style={{fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: "var(--ink)"}}>{c.students}</div>
        </div>
        <div>
          <div style={{fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-3)", marginBottom: 4}}>Completion</div>
          <div style={{display: "flex", alignItems: "center", gap: 8}}>
            <span className="mini-bar" style={{width: 60}}>
              <span className="mini-bar__fill" style={{width: c.completion + "%"}}/>
            </span>
            <span style={{fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)"}}>{c.completion}%</span>
          </div>
        </div>
        <div>
          <div style={{fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-3)", marginBottom: 4}}>Needs review</div>
          <div style={{fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: c.needsReview > 10 ? "var(--amber)" : "var(--ink)"}}>{c.needsReview}</div>
        </div>
        <div>
          <div style={{fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-3)", marginBottom: 4}}>Next</div>
          <div style={{fontSize: 12, color: "var(--ink-2)", fontWeight: 500}}>{c.next}</div>
        </div>
      </div>
      <div style={{padding: "10px 20px 14px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--line-soft)"}}>
        <div style={{display: "flex", alignItems: "center"}}>
          {c.teachers.slice(0, 3).map((t, i) => (
            <div key={i} className="avatar" style={{
              width: 24, height: 24, fontSize: 10,
              marginLeft: i === 0 ? 0 : -8,
              border: "2px solid var(--white)",
              background: ["#F4E4C9","#D8F0D8","#E6DFF0"][i]
            }}>{t.split(" ").map(n=>n[0]).join("")}</div>
          ))}
        </div>
        <div style={{fontSize: 11.5, color: "var(--ink-3)"}}>{c.teachers.join(", ")}</div>
        <div style={{marginLeft: "auto", fontSize: 11, color: "var(--teal)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4}}>
          Open <Icon.chev/>
        </div>
      </div>
    </div>
  );
}

function TeachersTable() {
  const teachers = [
    { name: "Claire Roy",    email: "claire@emerflows.io",   role: "Head Coach",  cohorts: ["Spring 2026 · B1–B2","April Intensive","Summer 2026"], status: "active" },
    { name: "Noah Park",     email: "noah@emerflows.io",     role: "Lead Teacher", cohorts: ["Spring 2026 · B1–B2","Fall 2025"], status: "active" },
    { name: "Emily Tran",    email: "emily@emerflows.io",    role: "Lead Teacher", cohorts: ["Spring 2026 · Business","Fall 2025"], status: "active" },
    { name: "Luis Ortega",   email: "luis@emerflows.io",     role: "Teacher",      cohorts: ["April Intensive"], status: "active" },
    { name: "Yusuf Aden",    email: "yusuf@emerflows.io",    role: "Teacher",      cohorts: [], status: "pending" },
    { name: "Sara Holm",     email: "sara@emerflows.io",     role: "Teacher",      cohorts: [], status: "pending" },
    { name: "Rita Moreau",   email: "rita@emerflows.io",     role: "Teacher (PT)", cohorts: ["Fall 2025"],  status: "archived" },
  ];
  return (
    <div className="table-card">
      <table className="sub-table">
        <thead><tr><th>Teacher</th><th>Role</th><th>Cohorts</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {teachers.map((t,i) => (
            <tr key={i}>
              <td>
                <div className="name-cell">
                  <div className={`avatar avatar--${["a","b","c","d","e","f"][i%6]}`}>{t.name.split(" ").map(n=>n[0]).join("")}</div>
                  <div><div className="name-cell__name">{t.name}</div><div className="name-cell__sub">{t.email}</div></div>
                </div>
              </td>
              <td style={{fontSize: 12.5, color: "var(--ink-2)"}}>{t.role}</td>
              <td>
                <div style={{display: "flex", gap: 4, flexWrap: "wrap"}}>
                  {t.cohorts.length > 0 ? t.cohorts.map(c => <span key={c} className="chip" style={{fontSize: 11}}>{c}</span>) : <span style={{color: "var(--ink-4)", fontSize: 12}}>No cohorts</span>}
                </div>
              </td>
              <td>
                {t.status === "active"   && <span className="badge badge--status-reviewed">Active</span>}
                {t.status === "pending"  && <span className="badge badge--status-review">Invite pending</span>}
                {t.status === "archived" && <span className="badge badge--status-submitted">Archived</span>}
              </td>
              <td><button className="btn btn--ghost btn--sm">Manage</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{padding: "14px 16px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <div style={{fontSize: 12, color: "var(--ink-3)"}}>7 total · 5 active · 2 invite pending</div>
        <button className="btn btn--teal btn--sm">+ Invite teacher</button>
      </div>
    </div>
  );
}

function StudentPool() {
  const data = window.TD_DATA;
  return (
    <div className="table-card">
      <table className="sub-table">
        <thead><tr><th>Student</th><th>Level</th><th>Cohorts</th><th>Last active</th><th>Completion</th><th></th></tr></thead>
        <tbody>
          {data.students.slice(0, 14).map((s, i) => (
            <tr key={s.id}>
              <td><div className="name-cell">
                <div className={`avatar avatar--${s.avatar}`}>{s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                <div><div className="name-cell__name">{s.name}</div><div className="name-cell__sub">{s.email}</div></div>
              </div></td>
              <td><span className="badge badge--lvl">{s.level}</span></td>
              <td><span className="chip" style={{fontSize: 11}}>Spring 2026 · B1–B2</span></td>
              <td style={{fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)"}}>{(i % 5) + 1}h ago</td>
              <td>
                <span className="mini-bar__wrap">
                  <span className="mini-bar"><span className="mini-bar__fill" style={{width: (40 + i*3.5) + "%"}}/></span>
                  {40 + i*3}%
                </span>
              </td>
              <td><button className="btn btn--ghost btn--sm">Open</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{padding: "14px 16px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <div style={{fontSize: 12, color: "var(--ink-3)"}}>Showing 14 of 86 students across all cohorts</div>
        <div style={{display: "flex", gap: 6}}>
          <button className="btn btn--ghost btn--sm">CSV import</button>
          <button className="btn btn--teal btn--sm">+ Invite student</button>
        </div>
      </div>
    </div>
  );
}

// ——— Create Cohort Wizard ———
function CreateCohortWizard({ onClose }) {
  const [step, setStep] = useState(0);
  const steps = ["Details", "Modules", "Teachers", "Students", "Review"];
  const [form, setForm] = useState({
    name: "Autumn 2026 · B1–B2",
    level: "B1 → B2",
    start: "2026-09-07",
    end: "2026-12-18",
    template: "spring26",
    teachers: ["Claire Roy"],
    students: 0,
    inviteMode: "email",
    modules: 12,
  });

  const update = (k, v) => setForm(f => ({...f, [k]: v}));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(12, 58, 68, 0.55)",
      display: "grid", placeItems: "center", zIndex: 100, padding: 20,
      backdropFilter: "blur(6px)"
    }} onClick={onClose}>
      <div style={{
        background: "var(--paper)", borderRadius: 18,
        width: "min(860px, 100%)", maxHeight: "90vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.4)"
      }} onClick={e => e.stopPropagation()}>
        <div style={{padding: "22px 28px 18px", borderBottom: "1px solid var(--line)", background: "var(--white)"}}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16}}>
            <div>
              <div className="kicker">New cohort</div>
              <h2 style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 24, letterSpacing: "-0.015em", margin: "4px 0 0"}}>Set up a new class</h2>
            </div>
            <button className="icon-btn" onClick={onClose}>✕</button>
          </div>
          <div style={{display: "grid", gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 6}}>
            {steps.map((s, i) => (
              <div key={s} style={{display: "flex", flexDirection: "column", gap: 6}}>
                <div style={{height: 3, borderRadius: 3, background: i <= step ? "var(--teal)" : "var(--line)"}}/>
                <div style={{fontSize: 11, fontWeight: 600, color: i === step ? "var(--ink)" : "var(--ink-3)", letterSpacing: "0.01em"}}>
                  <span style={{fontFamily: "var(--font-mono)", marginRight: 6, color: i < step ? "var(--sage-deep)" : i === step ? "var(--teal)" : "var(--ink-4)"}}>
                    {i < step ? "✓" : String(i+1).padStart(2, "0")}
                  </span>
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{padding: "24px 28px", overflow: "auto", flex: 1}}>
          {step === 0 && <WizStepDetails form={form} update={update}/>}
          {step === 1 && <WizStepModules form={form} update={update}/>}
          {step === 2 && <WizStepTeachers form={form} update={update}/>}
          {step === 3 && <WizStepStudents form={form} update={update}/>}
          {step === 4 && <WizStepReview form={form}/>}
        </div>

        <div style={{padding: "16px 28px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--white)"}}>
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <div style={{display: "flex", gap: 8}}>
            {step > 0 && <button className="btn btn--ghost" onClick={() => setStep(s => s-1)}>← Back</button>}
            {step < steps.length - 1 ? (
              <button className="btn btn--teal" onClick={() => setStep(s => s+1)}>Next: {steps[step+1]} →</button>
            ) : (
              <button className="btn btn--sage" onClick={onClose}>Create cohort</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{display: "flex", flexDirection: "column", gap: 6}}>
      <label style={{fontSize: 11, fontWeight: 600, color: "var(--ink-2)", letterSpacing: "0.04em", textTransform: "uppercase"}}>{label}</label>
      {children}
      {hint && <div style={{fontSize: 11.5, color: "var(--ink-3)"}}>{hint}</div>}
    </div>
  );
}
const inputStyle = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--white)", fontSize: 13.5, color: "var(--ink)", outline: "none", fontFamily: "inherit", width: "100%" };

function WizStepDetails({ form, update }) {
  const templates = [
    { id: "blank", name: "Blank cohort", sub: "Start from scratch" },
    { id: "spring26", name: "Copy: Spring 2026 · B1–B2", sub: "12 modules, 2 teachers" },
    { id: "intensive", name: "Copy: April Intensive", sub: "8 modules, fast pace" },
  ];
  return (
    <div style={{display: "grid", gap: 16}}>
      <Field label="Start from">
        <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8}}>
          {templates.map(t => (
            <button key={t.id} onClick={() => update("template", t.id)} style={{
              padding: 14, borderRadius: 12,
              border: form.template === t.id ? "2px solid var(--teal)" : "1px solid var(--line)",
              background: form.template === t.id ? "color-mix(in oklab, var(--sage) 16%, transparent)" : "var(--white)",
              textAlign: "left", cursor: "pointer"
            }}>
              <div style={{fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 4}}>{t.name}</div>
              <div style={{fontSize: 11.5, color: "var(--ink-3)"}}>{t.sub}</div>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Cohort name" hint="Shown to students and in your inbox — use term + level">
        <input style={inputStyle} value={form.name} onChange={e => update("name", e.target.value)}/>
      </Field>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12}}>
        <Field label="Level range">
          <select style={inputStyle} value={form.level} onChange={e => update("level", e.target.value)}>
            <option>A1 → A2</option><option>A2 → B1</option><option>B1 → B2</option><option>B2 → C1</option><option>C1 → C2</option>
          </select>
        </Field>
        <Field label="Start date"><input type="date" style={inputStyle} value={form.start} onChange={e => update("start", e.target.value)}/></Field>
        <Field label="End date"><input type="date" style={inputStyle} value={form.end} onChange={e => update("end", e.target.value)}/></Field>
      </div>
      <Field label="Language">
        <div style={{display: "flex", gap: 6}}>
          {["English","Spanish","French","German"].map(l => (
            <button key={l} className={`chip ${l === "English" ? "is-on" : ""}`}>{l}</button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function WizStepModules({ form, update }) {
  const data = window.TD_DATA;
  const [selected, setSelected] = useState(data.modules.map(m => m.id));
  const toggle = (id) => setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  return (
    <div style={{display: "grid", gap: 14}}>
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <div>
          <div style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, color: "var(--ink)", marginBottom: 4}}>Module track</div>
          <div style={{fontSize: 12.5, color: "var(--ink-2)"}}>{selected.length} of {data.modules.length} modules included · drag to reorder, click to toggle</div>
        </div>
        <div style={{display: "flex", gap: 6}}>
          <button className="btn btn--ghost btn--sm" onClick={() => setSelected(data.modules.map(m => m.id))}>Select all</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      </div>
      <div style={{display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8}}>
        {data.modules.map((m, i) => (
          <button key={m.id} onClick={() => toggle(m.id)} style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
            padding: "10px 14px", borderRadius: 10,
            border: selected.includes(m.id) ? "1px solid var(--teal)" : "1px solid var(--line)",
            background: selected.includes(m.id) ? "color-mix(in oklab, var(--sage) 12%, var(--white))" : "var(--white)",
            cursor: "pointer", textAlign: "left"
          }}>
            <div style={{fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)"}}>M{String(m.num).padStart(2,"0")}</div>
            <div>
              <div style={{fontSize: 13, fontWeight: 500, color: "var(--ink)"}}>{m.title}</div>
              <div style={{fontSize: 11, color: "var(--ink-3)"}}>{m.types.map(t => t === "speak" ? "Speaking" : "Conversation").join(" · ")}</div>
            </div>
            <div style={{
              width: 18, height: 18, borderRadius: 999,
              border: selected.includes(m.id) ? "none" : "1.5px solid var(--line)",
              background: selected.includes(m.id) ? "var(--teal)" : "transparent",
              color: "var(--cream)", display: "grid", placeItems: "center", fontSize: 11
            }}>{selected.includes(m.id) && "✓"}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WizStepTeachers({ form, update }) {
  const [assigned, setAssigned] = useState(["Claire Roy"]);
  const pool = ["Claire Roy","Noah Park","Emily Tran","Luis Ortega","Yusuf Aden","Sara Holm"];
  const toggle = (n) => setAssigned(a => a.includes(n) ? a.filter(x => x !== n) : [...a, n]);
  return (
    <div style={{display: "grid", gap: 16}}>
      <div>
        <div style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, color: "var(--ink)", marginBottom: 4}}>Assign teachers</div>
        <div style={{fontSize: 12.5, color: "var(--ink-2)"}}>First assigned teacher becomes the Lead. Others can grade submissions for this cohort.</div>
      </div>
      <div style={{display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8}}>
        {pool.map((n, i) => (
          <button key={n} onClick={() => toggle(n)} style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center",
            padding: "10px 14px", borderRadius: 10,
            border: assigned.includes(n) ? "1px solid var(--teal)" : "1px solid var(--line)",
            background: assigned.includes(n) ? "color-mix(in oklab, var(--sage) 12%, var(--white))" : "var(--white)",
            cursor: "pointer", textAlign: "left"
          }}>
            <div className={`avatar avatar--${["a","b","c","d","e","f"][i%6]}`}>{n.split(" ").map(x=>x[0]).join("")}</div>
            <div>
              <div style={{fontSize: 13, fontWeight: 600, color: "var(--ink)"}}>{n}</div>
              <div style={{fontSize: 11, color: "var(--ink-3)"}}>{assigned[0] === n ? "Lead teacher" : (assigned.includes(n) ? "Co-teacher" : "Available")}</div>
            </div>
            <div style={{fontSize: 11, color: assigned.includes(n) ? "var(--teal)" : "var(--ink-3)", fontWeight: 600}}>
              {assigned.includes(n) ? "Assigned" : "+ Add"}
            </div>
          </button>
        ))}
      </div>
      <button className="btn btn--ghost" style={{alignSelf: "flex-start"}}>+ Invite new teacher by email</button>
    </div>
  );
}

function WizStepStudents({ form, update }) {
  const [mode, setMode] = useState("pool");
  return (
    <div style={{display: "grid", gap: 16}}>
      <div>
        <div style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, color: "var(--ink)", marginBottom: 4}}>Add students</div>
        <div style={{fontSize: 12.5, color: "var(--ink-2)"}}>Choose one or combine — you can always add more later.</div>
      </div>
      <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8}}>
        {[
          {id:"pool", label:"From student pool", sub:"Pick existing"},
          {id:"email", label:"Invite by email", sub:"Bulk paste"},
          {id:"csv", label:"CSV upload", sub:"Name + email"},
          {id:"link", label:"Invite link", sub:"Self-join code"},
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            padding: 12, borderRadius: 10, textAlign: "left",
            border: mode === m.id ? "2px solid var(--teal)" : "1px solid var(--line)",
            background: mode === m.id ? "color-mix(in oklab, var(--sage) 14%, var(--white))" : "var(--white)",
            cursor: "pointer"
          }}>
            <div style={{fontSize: 13, fontWeight: 600, color: "var(--ink)"}}>{m.label}</div>
            <div style={{fontSize: 11, color: "var(--ink-3)"}}>{m.sub}</div>
          </button>
        ))}
      </div>

      {mode === "pool" && (
        <div style={{border: "1px solid var(--line)", borderRadius: 12, background: "var(--white)", maxHeight: 260, overflow: "auto"}}>
          {window.TD_DATA.students.slice(0, 8).map((s, i) => (
            <label key={s.id} style={{display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--line-soft)", cursor: "pointer"}}>
              <input type="checkbox" defaultChecked={i < 3}/>
              <div className="name-cell">
                <div className={`avatar avatar--${s.avatar}`}>{s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                <div><div className="name-cell__name">{s.name}</div><div className="name-cell__sub">{s.email}</div></div>
              </div>
              <span className="badge badge--lvl">{s.level}</span>
              <span style={{fontSize: 11, color: "var(--ink-3)"}}>Not in a cohort</span>
            </label>
          ))}
        </div>
      )}
      {mode === "email" && (
        <textarea style={{...inputStyle, minHeight: 180, fontFamily: "var(--font-mono)", fontSize: 12}}
          placeholder={"max.d@emerflows.io\npriya.s@emerflows.io\nyuki.t@emerflows.io"}/>
      )}
      {mode === "csv" && (
        <div style={{border: "2px dashed var(--line)", borderRadius: 12, padding: 40, textAlign: "center", background: "var(--white)"}}>
          <div style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, color: "var(--ink)", marginBottom: 6}}>Drop a CSV</div>
          <div style={{fontSize: 12, color: "var(--ink-3)", marginBottom: 14}}>Columns: name, email, level (optional)</div>
          <button className="btn btn--ghost">Choose file</button>
        </div>
      )}
      {mode === "link" && (
        <div style={{background: "var(--white)", border: "1px solid var(--line)", borderRadius: 12, padding: 18}}>
          <div style={{fontSize: 12, color: "var(--ink-3)", marginBottom: 8}}>Share this link or code with students. Anyone with the link can join.</div>
          <div style={{display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--paper)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink)"}}>
            emerflows.io/join/<span style={{color: "var(--teal)", fontWeight: 600}}>SPR26-B1B2-4X7K</span>
            <button className="btn btn--ghost btn--sm" style={{marginLeft: "auto"}}>Copy</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WizStepReview({ form }) {
  return (
    <div style={{display: "grid", gap: 14}}>
      <div style={{background: "color-mix(in oklab, var(--sage) 12%, var(--white))", border: "1px solid color-mix(in oklab, var(--sage) 40%, transparent)", borderRadius: 12, padding: 18}}>
        <div style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 22, color: "var(--ink)", marginBottom: 4}}>{form.name}</div>
        <div style={{fontSize: 12.5, color: "var(--ink-2)"}}>{form.level} · {form.start} → {form.end}</div>
      </div>
      <div style={{display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10}}>
        {[
          ["Level range", form.level],
          ["Term", `${form.start} to ${form.end}`],
          ["Modules", `${form.modules} modules (full Spring track)`],
          ["Teachers", "Claire Roy (Lead)"],
          ["Students", "3 from pool · email invites saved as draft"],
          ["Status on create", "Draft — publish when ready"],
        ].map(([k,v]) => (
          <div key={k} style={{padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--white)"}}>
            <div style={{fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-3)", marginBottom: 4}}>{k}</div>
            <div style={{fontSize: 13, color: "var(--ink)", fontWeight: 500}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize: 12, color: "var(--ink-3)", padding: "10px 0"}}>
        On create, students and teachers will receive an invite email. You can still edit anything before publishing the cohort.
      </div>
    </div>
  );
}

Object.assign(window, { AdminHub, CreateCohortWizard, CohortCard });
