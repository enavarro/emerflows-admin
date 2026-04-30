// Teacher dashboard — seed data (1 class, 12 modules, ~24 students)
window.TD_DATA = (() => {
  const modules = [
    { id: "m01", num: 1, title: "Self-Introduction", types: ["speak","convo"] },
    { id: "m02", num: 2, title: "Work & Responsibilities", types: ["speak"] },
    { id: "m03", num: 3, title: "Describing a Project", types: ["convo"] },
    { id: "m04", num: 4, title: "Meetings & Small Talk", types: ["speak","convo"] },
    { id: "m05", num: 5, title: "Giving Feedback", types: ["convo"] },
    { id: "m06", num: 6, title: "Presenting Data", types: ["speak"] },
    { id: "m07", num: 7, title: "Negotiation Basics", types: ["speak","convo"] },
    { id: "m08", num: 8, title: "Client Calls", types: ["convo"] },
    { id: "m09", num: 9, title: "Storytelling at Work", types: ["speak"] },
    { id: "m10", num: 10, title: "Difficult Conversations", types: ["convo"] },
    { id: "m11", num: 11, title: "Interview Practice", types: ["speak","convo"] },
    { id: "m12", num: 12, title: "Reflections & Goals", types: ["speak"] },
  ];

  const students = [
    { id:"s01", name:"Max Dubois",       email:"max.d@emerflows.io",      level:"B1+", avatar:"a" },
    { id:"s02", name:"Priya Shah",       email:"priya.s@emerflows.io",    level:"B2",  avatar:"b" },
    { id:"s03", name:"Yuki Tanaka",      email:"yuki.t@emerflows.io",     level:"B1",  avatar:"c" },
    { id:"s04", name:"Carlos Mendez",    email:"carlos.m@emerflows.io",   level:"A2+", avatar:"d" },
    { id:"s05", name:"Sofia Rinaldi",    email:"sofia.r@emerflows.io",    level:"B2+", avatar:"e" },
    { id:"s06", name:"Omar Khalid",      email:"omar.k@emerflows.io",     level:"B1",  avatar:"f" },
    { id:"s07", name:"Emilia Nowak",     email:"emilia.n@emerflows.io",   level:"B1+", avatar:"a" },
    { id:"s08", name:"Jin-ho Park",      email:"jinho.p@emerflows.io",    level:"B2",  avatar:"b" },
    { id:"s09", name:"Luana Costa",      email:"luana.c@emerflows.io",    level:"B1",  avatar:"c" },
    { id:"s10", name:"Ahmet Yilmaz",     email:"ahmet.y@emerflows.io",    level:"A2+", avatar:"d" },
    { id:"s11", name:"Ingrid Larsen",    email:"ingrid.l@emerflows.io",   level:"B2+", avatar:"e" },
    { id:"s12", name:"Rafael Soto",      email:"rafael.s@emerflows.io",   level:"B1+", avatar:"f" },
    { id:"s13", name:"Mei Chen",         email:"mei.c@emerflows.io",      level:"B2",  avatar:"a" },
    { id:"s14", name:"Daniel Becker",    email:"daniel.b@emerflows.io",   level:"B1",  avatar:"b" },
    { id:"s15", name:"Aïcha Diop",       email:"aicha.d@emerflows.io",    level:"B1+", avatar:"c" },
    { id:"s16", name:"Tomás Álvarez",    email:"tomas.a@emerflows.io",    level:"A2+", avatar:"d" },
    { id:"s17", name:"Hana Okafor",      email:"hana.o@emerflows.io",     level:"B2",  avatar:"e" },
    { id:"s18", name:"Lukas Bauer",      email:"lukas.b@emerflows.io",    level:"B1",  avatar:"f" },
    { id:"s19", name:"Noor Al-Sayed",    email:"noor.a@emerflows.io",     level:"B2+", avatar:"a" },
    { id:"s20", name:"Valeria Rossi",    email:"valeria.r@emerflows.io",  level:"B1+", avatar:"b" },
    { id:"s21", name:"Marcus Obi",       email:"marcus.o@emerflows.io",   level:"B1",  avatar:"c" },
    { id:"s22", name:"Anika Sharma",     email:"anika.s@emerflows.io",    level:"B2",  avatar:"d" },
    { id:"s23", name:"Pedro Araújo",     email:"pedro.a@emerflows.io",    level:"A2+", avatar:"e" },
    { id:"s24", name:"Ines Fischer",     email:"ines.f@emerflows.io",     level:"B2+", avatar:"f" },
  ];

  // Deterministic pseudo-random for consistent demo data
  const r = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };

  // Generate module completion per student (0-4 = not-started → excellent, null = locked)
  const progress = {};
  students.forEach((s, si) => {
    progress[s.id] = modules.map((m, mi) => {
      const seed = si * 13 + mi;
      const v = r(seed);
      if (mi > 8 && v < 0.4) return null; // late modules partially locked
      if (v < 0.15) return 0;              // not started
      if (v < 0.30) return 1;              // in progress
      if (v < 0.55) return 2;              // submitted
      if (v < 0.80) return 3;              // reviewed
      return 4;                             // excellent
    });
  });

  // Submissions (one row per student × module assignment)
  const now = new Date("2026-04-22T18:30:00Z");
  const statuses = ["needs-review","needs-review","reviewed","needs-review","late","reviewed","needs-review"];
  const submissions = [];
  let idx = 0;
  students.forEach((s, si) => {
    modules.forEach((m, mi) => {
      const p = progress[s.id][mi];
      if (p === null || p <= 1) return;
      const status = p === 4 ? "reviewed" : (r(idx+7) < 0.45 ? "needs-review" : (r(idx+19) < 0.1 ? "late" : "reviewed"));
      const hoursAgo = Math.floor(r(idx+1) * 240); // within 10 days
      const submittedAt = new Date(now.getTime() - hoursAgo * 3600 * 1000);
      const flagCount = Math.floor(r(idx+3) * 9);
      const attempts = 1 + (r(idx+5) < 0.3 ? 1 : 0);
      const duration = 45 + Math.floor(r(idx+9) * 110); // seconds
      const score = status === "reviewed" ? (60 + Math.floor(r(idx+11) * 40)) : null;
      submissions.push({
        id: `sub_${s.id}_${m.id}`,
        student: s,
        module: m,
        type: m.types.length > 1 ? (r(idx+13) < 0.5 ? "both" : m.types[0]) : m.types[0],
        status,
        submittedAt,
        flagCount,
        attempts,
        duration,
        score,
        level: s.level,
      });
      idx++;
    });
  });

  // Sort newest first
  submissions.sort((a,b) => b.submittedAt - a.submittedAt);

  // Full detail for ONE showcase submission (Max, Module 1) — blends the two JSON samples
  const featuredId = "sub_s01_m01";

  const featured = {
    id: featuredId,
    student: students[0],
    module: modules[0],
    type: "both",
    status: "needs-review",
    submittedAt: new Date("2026-04-22T14:12:00Z"),
    duration: 87,
    attempts: 2,
    level: "B1-B2",
    // Speaking recording
    recording: {
      audioPath: "recordings/spring-2026/117ab70e-302d-468e-9ed3-7aae197122a7/module-01-attempt-1.webm",
      transcript: [
        { t: 0.0,  text: "Hello, my name is Max.", classification: "strong" },
        { t: 2.3,  text: "I work at In Edit, a real estate company where I manage commercial tasks and help with property visits and negotiations.", classification: "strong" },
        { t: 10.1, text: "I work closely with the sales and marketing teams and I also support my mom who is the boss.", classification: "strong" },
        { t: 19.4, text: "I'm proud of recently selling many houses and apartments which shows my discipline and work and hard work.", classification: "needs improvement", weak: "and work and hard work" },
        { t: 28.8, text: "I also study marketing while working which is challenging but very rewarding.", classification: "strong" },
        { t: 36.2, text: "I enjoy meeting new clients and learning from their stories and ideas every day.", classification: "strong" },
      ],
      tips: [
        { category: "pronunciation", tip: "You pronounced 'In Edit' mostly clearly, but try to give a bit more emphasis to the 'In' part of the company name. Say: IN-eh-dit." },
        { category: "delivery", tip: "Your pacing is generally good, but I noticed a slight hesitation and repetition when you said 'and work and hard work'. Practice delivering this phrase smoothly as 'and hard work' to maintain a confident flow. You can also vary your intonation to keep listeners engaged." },
      ],
    },
    // Conversational assignment
    conversation: {
      introduction: "I am an AI Solutions Engineer at IlleLabs, where I focus on developing innovative AI solutions for our customers. My main responsibility is to create and implement these solutions, ensuring they meet client needs. I recently worked on a project developing AI agents, and I'm proud to see the positive impact and smiles they bring to our customers. I enjoy collaborating directly with clients and am most excited by their satisfaction when they successfully use our AI agents.",
      pairs: [
        { question: "What is your current job title?", answer: "I'm a AI Solutions Engineer.",
          flags: [
            { word: "a AI", issue: "Grammar", suggestion: "an AI" },
            { word: "I'm a", issue: "Too informal", suggestion: "I am an" },
          ]},
        { question: "Where do you work, and what does the company do?", answer: "I work in, uh, IlleLabs.",
          flags: [
            { word: "in, uh, IlleLabs", issue: "Filler word, missing company description", suggestion: "at IlleLabs, a company that…" },
            { word: "", issue: "Missing detail", suggestion: "Describe what IlleLabs does" },
          ]},
        { question: "What are your main responsibilities day to day?", answer: "I'm responsible for developing solutions for customers.",
          flags: [
            { word: "developing solutions for customers", issue: "Too vague", suggestion: "developing innovative AI solutions for our customers" },
          ]},
        { question: "Can you tell me about a recent project or achievement you are proud of?", answer: "I'm proud of, uh, developing, uh,",
          flags: [
            { word: "developing, uh,", issue: "Incomplete thought, filler word", suggestion: "developing AI agents" },
            { word: "", issue: "Missing detail", suggestion: "Provide a specific project or achievement" },
          ]},
        { question: "Who do you usually work with?", answer: "Clients.",
          flags: [{ word: "Clients", issue: "Too brief", suggestion: "I collaborate directly with clients" }]},
        { question: "What do you enjoy most about your role?", answer: "I'm excited about seeing customers using AI agents and seeing their smiles.",
          flags: [
            { word: "seeing their smiles", issue: "Too informal", suggestion: "seeing the positive impact and satisfaction" },
            { word: "I'm excited about seeing", issue: "Could be more professional", suggestion: "I am most excited by their satisfaction" },
          ]},
      ],
      summary: "You clearly articulated your job title, company, and what you enjoy most about your role, showing a good understanding of the questions. To make your self-introduction even more impactful, you could aim to expand on your answers with a little more detail and specific examples. For next time, try adding an extra phrase or two to really paint a fuller picture of your responsibilities and achievements.",
    },
  };

  // Class-wide trends (aggregated for display)
  const vocabGaps = [
    { word: "negotiate",     count: 18, note: "often substituted with 'talk'" },
    { word: "deadline",      count: 15, note: "confused with 'time limit'" },
    { word: "stakeholder",   count: 14, note: "often 'person who…'" },
    { word: "colleague",     count: 12, note: "frequent 'partner'" },
    { word: "efficient",     count: 11, note: "often 'fast'" },
    { word: "prioritize",    count: 10, note: "often 'put first'" },
    { word: "approximately", count:  9 },
    { word: "eventually",    count:  8, note: "often 'finally' (false friend)" },
    { word: "appreciate",    count:  7 },
  ];

  const grammarErrors = [
    { label: "a / an before vowel sounds", count: 32 },
    { label: "Present simple vs. continuous", count: 24 },
    { label: "Missing articles (the / a)", count: 21 },
    { label: "Subject-verb agreement", count: 17 },
    { label: "Prepositions (in / on / at)", count: 15 },
    { label: "Third-person -s", count: 12 },
    { label: "Countable / uncountable", count: 9 },
  ];

  const fillers = [
    { word: "uh",       count: 184 },
    { word: "like",     count: 142 },
    { word: "you know", count:  98 },
    { word: "so",       count:  76 },
    { word: "actually", count:  61 },
    { word: "kind of",  count:  54 },
    { word: "basically",count:  47 },
    { word: "I mean",   count:  42 },
    { word: "right",    count:  35 },
    { word: "sort of",  count:  28 },
    { word: "well",     count:  24 },
    { word: "anyway",   count:  18 },
  ];

  const struggling = [
    { student: students[3],  reason: "3 missed deadlines, dropping attempts", metric: "42%",  detail: "Completion" },
    { student: students[9],  reason: "Flag count rising across 4 modules",    metric: "+18",  detail: "Flags Δ" },
    { student: students[15], reason: "Below level target on speaking pace",   metric: "A2",   detail: "Avg level" },
    { student: students[22], reason: "No submissions in 14 days",              metric: "14d",  detail: "Inactive" },
    { student: students[5],  reason: "Same grammar error repeats × 6",        metric: "6×",   detail: "Repeat" },
  ];

  return { modules, students, progress, submissions, featured, featuredId, vocabGaps, grammarErrors, fillers, struggling };
})();
