/**
 * Section content for the four pages: services, recognition, FAQ, work history,
 * tech stack and process. Copy lives here so a page component stays structure.
 */

/* ---------- "How I Can Help" accordion ---------- */
export const services = [
  {
    title: "AI & Retrieval Systems",
    items: [
      "RAG pipelines — chunking, indexing, reranking, and the evaluation to prove it works",
      "LLM integration with repair and fallback layers, not raw hope",
      "Model interpretability where a prediction has to be defended",
      "Honest evaluation harnesses: baselines, significance tests, negative controls",
    ],
  },
  {
    title: "Backend & APIs",
    items: [
      "FastAPI and Node services, containerised and deployable",
      "WebSocket and streaming endpoints for real-time inference",
      "MongoDB and Firestore data modelling",
      "Auth, rate limiting and the error paths nobody demos",
    ],
  },
  {
    title: "Full-Stack Web",
    items: [
      "React front ends with real performance budgets",
      "Three.js / React Three Fiber where depth earns its bytes",
      "Accessible, responsive interfaces down to 320px",
      "Vercel deployment, previews and CI gates",
    ],
  },
  {
    title: "On-Device & Mobile ML",
    items: [
      "Client-side inference through WebAssembly, keeping data on the device",
      "Android apps with image recognition and AI assistance",
      "Privacy-first pipelines that transmit conclusions, not raw capture",
      "Latency and memory profiling on mid-tier hardware",
    ],
  },
];

/* ---------- Word ticker under the hero ---------- */
export const tickerWords = [
  "Retrieval Systems",
  "Backend Engineering",
  "Applied ML",
  "Web Platforms",
];

/* ---------- Recognition marquee ----------
   This section replaced the template's testimonial carousel. It carries real,
   checkable facts rather than quotes attributed to invented people. When you
   have permission to publish a genuine quote from a colleague or client, add it
   here with their name and role and it will render in the same card. */
export const recognition = [
  {
    kind: "stat",
    value: 92.0,
    decimals: 1,
    text: "NMI VLVRAG reached on a dense evaluation course, against 74.2 for an oracle-K baseline.",
  },
  {
    kind: "award",
    text: "VLVRAG abstract accepted at ICASF 2027, Abu Dhabi University — as lead developer and first author.",
    source: "ICASF 2027",
    detail: "Conference",
  },
  {
    kind: "award",
    text: "Best Final Year Project Award — Software Engineering department, University of Management and Technology.",
    source: "UMT",
    detail: "Big Brains",
  },
  {
    kind: "award",
    text: "Rector's Merit Award, held 2024 through 2026.",
    source: "UMT",
    detail: "Academic merit",
  },
  {
    kind: "award",
    text: "Dean's Merit Award, 2023 and again in 2026.",
    source: "UMT",
    detail: "Academic merit",
  },
];

/* ---------- FAQ ---------- */
export const faqs = [
  {
    q: "What kind of work are you looking for?",
    a: "Software and AI engineering roles — backend services, retrieval and ML systems, or full-stack product work. Lahore on-site or remote. I am finishing a B.S. in Software Engineering at UMT in September 2026 and already working alongside it.",
  },
  {
    q: "What does your stack actually look like?",
    a: "Python and FastAPI for services and ML, React with Vite on the front end, MongoDB or Firestore for data, Docker for packaging, Vercel for deployment. Android with Kotlin when the work belongs on a phone. I pick the boring option unless there is a reason not to.",
  },
  {
    q: "How do you approach a new problem?",
    a: "Baseline first. Before any model or clever retrieval scheme, I build the dumbest thing that could work and measure it, so every later claim has something to beat. Most of the projects on this site exist because that baseline was not good enough.",
  },
  {
    q: "Do you have research experience?",
    a: "Yes. I'm lead developer and first author on VLVRAG, an ongoing paper with an abstract accepted at ICASF 2027, Abu Dhabi University. On held-out MIT OpenCourseWare lectures it cut segmentation error (Pk) from 0.512 to 0.344 and WindowDiff from 0.513 to 0.391 against its baseline, and on a denser evaluation course reached 92.0 NMI against 74.2 for an oracle-K baseline. An internal audit of that same pipeline made me drop several published-looking numbers that could not be defended — that audit is the part I would want to be judged on.",
  },
  {
    q: "Can you teach or mentor as part of a role?",
    a: "Comfortably. I taught computer science at KIPS Virtual and currently teach backend development at Big Brains, so explaining a system to someone who has never seen it is part of the daily job rather than an extra.",
  },
  {
    q: "How do I get in touch?",
    a: "The form below, or mhusnainaslam2003@gmail.com directly. A sentence about the problem is enough to start; you get a reply within two working days.",
  },
];

/* ---------- Work history ---------- */
export const experience = [
  {
    role: "Lead Developer & First Author — VLVRAG",
    org: "University of Management and Technology, Lahore",
    years: "Mar 2026 — Present",
  },
  {
    role: "Backend Engineer",
    org: "Big Brains — Lahore / remote",
    years: "2025 — Present",
  },
  {
    role: "Backend Development Lecturer",
    org: "Big Brains — remote",
    years: "Dec 2025 — Present",
  },
  {
    role: "Computer Science Lecturer",
    org: "KIPS Virtual, Lahore",
    years: "Jun 2024 — Feb 2025",
  },
];

/* ---------- Tech stack grid ---------- */
export const stack = [
  {
    code: "Py",
    name: "Python",
    desc: "Services, pipelines and every model that ends up in production.",
  },
  {
    code: "Fa",
    name: "FastAPI",
    desc: "The default for inference APIs — typed, async, and fast to stand up.",
  },
  {
    code: "Re",
    name: "React",
    desc: "Front ends with a performance budget, built component-first.",
  },
  {
    code: "3js",
    name: "Three.js",
    desc: "React Three Fiber where a scene explains something a chart cannot.",
  },
  {
    code: "Mg",
    name: "MongoDB",
    desc: "Document storage for platforms whose shape is still moving.",
  },
  {
    code: "Dk",
    name: "Docker",
    desc: "So the thing that ran on my machine runs on yours too.",
  },
  {
    code: "Ln",
    name: "LangChain",
    desc: "Retrieval scaffolding — used where it saves work, dropped where it doesn't.",
  },
  {
    code: "Kt",
    name: "Kotlin",
    desc: "Android clients, and the on-device ML that belongs with them.",
  },
  {
    code: "Vc",
    name: "Vercel",
    desc: "Preview deploys and static output, with CI gates in front of them.",
  },
];

/* ---------- Process ---------- */
export const process = [
  {
    n: "01.",
    t: "Frame & Baseline",
    d: "Work out what success actually means as a number, then build the simplest thing that produces one. Everything afterwards has to beat it.",
  },
  {
    n: "02.",
    t: "Data & Pipeline",
    d: "Ingestion, cleaning and feature work before modelling. Most of the gain in every project on this site came from this stage, not the model.",
  },
  {
    n: "03.",
    t: "Build & Instrument",
    d: "The service, the interface and the logging together. If a failure cannot be seen in production it will be found by a user instead.",
  },
  {
    n: "04.",
    t: "Evaluate Honestly",
    d: "Significance tests, ablations and negative controls. Claims that cannot survive an audit get dropped, not softened.",
  },
  {
    n: "05.",
    t: "Ship & Hand Over",
    d: "Containerised, deployed, documented, with the budget checks wired into CI so the next person cannot quietly regress it.",
  },
];

/* ---------- Contact form service options ---------- */
export const serviceOptions = [
  "Full-time role",
  "Contract / freelance",
  "AI or retrieval system",
  "Backend or API work",
  "Research collaboration",
  "Something else",
];
