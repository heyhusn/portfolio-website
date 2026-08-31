/**
 * Project inventory.
 *
 * `featured` drives the home page grid and the top of /projects.
 * `more` fills the second grid. Every entry also gets a detail page at
 * /projects/:slug, built from the same object — add a project here and the
 * route, the card and the page all appear together.
 *
 * Images point at the generated SVG artwork in /public/assets/img. Swap any
 * `image` for a real screenshot when you have one; the aspect ratios are fixed
 * in CSS so nothing shifts.
 */

export const projects = [
  {
    slug: "vlvrag",
    title: "VLVRAG — Vectorless Video RAG",
    tag: "Research",
    year: "2026",
    image: "/assets/img/project-3.svg",
    featured: true,
    summary:
      "A retrieval system for lecture video that indexes meaning instead of embeddings — no vector database anywhere in the pipeline.",
    description:
      "Lectures are split into adaptive evidence units of 10–45 seconds on signal and transition cues. On-screen text from OCR and speech from ASR are fused and aligned to a frame grid, then indexed as a three-level Markdown ledger — lecture, topic, timed unit — through a local summary-augmented tree. Retrieval unions deterministic timestamp resolution, two-stage tree traversal and BM25, and a pedagogical evidence filter reranks on cross-modal agreement, preferring speech over slides wherever a lecturer corrects themselves out loud.",
    highlights: [
      "Pk 0.512 → 0.344 and WindowDiff 0.513 → 0.391 against a count-matched equal-spacing baseline, Wilcoxon p < 0.001, improving on 16 of 16 held-out lectures",
      "92.0 NMI against the project's own oracle-K baseline at 74.2 on a second, denser course",
      "Transferred to the second course under a single pre-fitted configuration — one granularity prior, chosen on the dev split and never retuned",
      "Ships a negative control: common faithfulness metrics fail to penalise an answer written for a different question; entailment-based grounding catches it",
    ],
    stack: ["Python", "OCR / ASR fusion", "BM25", "LLM judges", "Evaluation harness"],
    links: [],
    note: "Abstract accepted at ICASF 2027 (Abu Dhabi University); full paper in writing.",
  },
  {
    slug: "big-brains",
    title: "Big Brains",
    tag: "Platform",
    year: "2025 — present",
    image: "/assets/img/project-1.svg",
    featured: true,
    summary:
      "An e-learning platform on web and mobile — the final year project that turned into a company.",
    description:
      "Course delivery, enrolment and content management across a web app and a mobile client, built and run as a working product rather than a submission. I lead the backend and now teach on the same platform.",
    highlights: [
      "Web and mobile clients over one backend",
      "Started as the final year project; recognised with the department's Best FYP award",
      "Live at bigbrainslearning.com",
    ],
    stack: ["React", "Node.js", "MongoDB", "Mobile client"],
    links: [{ label: "bigbrainslearning.com", href: "https://bigbrainslearning.com" }],
  },
  {
    slug: "solar-pv-digital-twin",
    title: "Solar PV Digital Twin",
    tag: "ML Systems",
    year: "2026",
    image: "/assets/img/project-5.svg",
    featured: true,
    summary:
      "A digital twin that forecasts real-time photovoltaic output for Dhaka, Lahore and the Thar Desert, with the physics baked into the features.",
    description:
      "Five and a half years of hourly NASA POWER meteorological data, cleaned with time-based interpolation and extended with physics-derived features — solar zenith angle, clear-sky irradiance — so the models learn the residual rather than rediscovering astronomy. Random Forest sets the floor, XGBoost with SHAP explains itself, and an LSTM picks up the temporal weather dependencies the tree models miss. A containerised FastAPI service streams predictions to a Three.js front end.",
    highlights: [
      "5.5+ years of hourly meteorological data across three climates",
      "Physics-informed feature engineering rather than raw weather columns",
      "SHAP interpretability on the gradient-boosted model, so a forecast can be argued with",
      "FastAPI inference API, Docker containerised, deployed on Vercel",
    ],
    stack: [
      "Python",
      "XGBoost",
      "LSTM",
      "SHAP",
      "FastAPI",
      "Docker",
      "React Three Fiber",
    ],
    links: [
      {
        label: "solar-pv-digital-twin.vercel.app",
        href: "https://solar-pv-digital-twin.vercel.app/",
      },
    ],
  },
  {
    slug: "scholarmind",
    title: "ScholarMind",
    tag: "AI Assistant",
    year: "2025",
    image: "/assets/img/project-4.svg",
    featured: true,
    summary:
      "An Android research assistant that reads papers with you — extraction, literature search, and every study aid built on top.",
    description:
      "PDFs go through pdfplumber extraction into a DeepSeek LLM wrapped in a JSON-repair layer, because a model that returns almost-valid JSON at 3am is the difference between a working feature and a support ticket. OpenAlex handles literature search, Firestore keeps history, and the same extracted structure powers flashcards, quizzes, a text-to-speech podcast, peer review and reference export.",
    highlights: [
      "JSON-repair layer around the LLM so malformed generations degrade instead of failing",
      "OpenAlex literature search wired into the reading flow",
      "One extraction pass feeds flashcards, quizzes, TTS podcast, peer review and reference export",
    ],
    stack: ["Android", "FastAPI", "pdfplumber", "DeepSeek", "OpenAlex", "Firestore"],
    links: [
      {
        label: "scholar-ai-backend.vercel.app",
        href: "https://scholar-ai-backend.vercel.app",
      },
    ],
  },

  /* ---------------- more ---------------- */

  {
    slug: "attention-tracking",
    title: "Real-Time Attention Tracking",
    tag: "On-Device ML",
    year: "2025",
    image: "/assets/img/project-6.svg",
    featured: false,
    summary:
      "Head pose and eye openness fused into an attention score — computed entirely in the browser, with no video leaving the device.",
    description:
      "MediaPipe Face Mesh runs client-side through WebAssembly. Yaw and pitch from head pose combine with the Eye Aspect Ratio into a single 0–1 score, and only that number crosses the FastAPI WebSocket. No video frames, no biometric templates, nothing that could be replayed.",
    highlights: [
      "Inference runs in WebAssembly on the client — the camera stream never leaves the machine",
      "Head-pose yaw/pitch fused with Eye Aspect Ratio into one bounded score",
      "FastAPI WebSockets carry the score only",
    ],
    stack: ["MediaPipe", "WebAssembly", "FastAPI", "WebSockets"],
    links: [],
  },
  {
    slug: "rag-system",
    title: "Local RAG over PDFs",
    tag: "Retrieval",
    year: "2025",
    image: "/assets/img/project-2.svg",
    featured: false,
    summary:
      "Question answering over PDF collections, running entirely on local models.",
    description:
      "LangChain and PyPDFLoader handle ingestion, Ollama serves the embeddings and gemma3:1b, and ChromaDB stores the index. The whole loop runs offline, which makes it the right test bed for retrieval ideas before they go anywhere near a hosted API.",
    highlights: [
      "Fully local — embeddings and generation both served by Ollama",
      "ChromaDB vector store with PyPDFLoader ingestion",
    ],
    stack: ["LangChain", "Ollama", "gemma3:1b", "ChromaDB"],
    links: [],
  },
  {
    slug: "hariyali",
    title: "Hariyali",
    tag: "Mobile / ML",
    year: "2025",
    image: "/assets/img/project-7.svg",
    featured: false,
    summary:
      "An Android gardening companion: photograph a sick plant, get a diagnosis and a plan.",
    description:
      "Image recognition identifies plant disease from a photo, location data narrows down what will actually grow where the user is, and an AI chat handles the follow-up questions. Firebase backs the whole thing; the interface was prototyped in Figma before a line of Kotlin.",
    highlights: [
      "Plant-disease image recognition from a phone camera",
      "Location-based plant suitability",
      "Figma prototype ahead of the build",
    ],
    stack: ["Android", "Firebase", "Image classification", "Figma"],
    links: [],
  },
  {
    slug: "resume-screening",
    title: "Resume Screening Classifier",
    tag: "NLP",
    year: "2025",
    image: "/assets/img/project-8.svg",
    featured: false,
    summary:
      "A job-title classifier over raw résumé text, wrapped in something a recruiter can use.",
    description:
      "TF-IDF features into a OneVsRest KNN classifier, with NLTK and regex doing the preprocessing that decides how good the features are. Serialised with pickle and served through a Streamlit interface.",
    highlights: [
      "TF-IDF + OneVsRest KNN over cleaned résumé text",
      "NLTK and regex preprocessing pipeline",
      "Streamlit interface for non-technical use",
    ],
    stack: ["scikit-learn", "NLTK", "Streamlit"],
    links: [],
  },
  {
    slug: "financial-sentiment",
    title: "Financial Sentiment Analysis",
    tag: "NLP",
    year: "2025",
    image: "/assets/img/post-3.svg",
    featured: false,
    summary:
      "Three-class sentiment over financial text using SBERT embeddings and a deep ANN.",
    description:
      "Sentence-BERT embeddings feed a deep feed-forward network for three-way classification, deployed as a Streamlit app so the model can be poked at directly rather than through a notebook.",
    highlights: ["SBERT sentence embeddings", "Deep ANN classifier", "Streamlit deployment"],
    stack: ["SBERT", "PyTorch", "Streamlit"],
    links: [],
  },
  {
    slug: "birnn-sentiment-api",
    title: "BiRNN Sentiment API",
    tag: "Backend / ML",
    year: "2025",
    image: "/assets/img/post-5.svg",
    featured: false,
    summary: "A bidirectional RNN text classifier, served properly over HTTP.",
    description:
      "The interesting half of this one is the serving, not the model: a bidirectional RNN behind a FastAPI service with the shapes, batching and error paths a real caller needs.",
    highlights: ["Bidirectional RNN classifier", "FastAPI service"],
    stack: ["PyTorch", "FastAPI"],
    links: [],
  },
  {
    slug: "smart-job-scraper",
    title: "Smart Job Scraper v3.0",
    tag: "Data",
    year: "2025",
    image: "/assets/img/post-1.svg",
    featured: false,
    summary:
      "Multi-source job aggregation with relevance scoring, because searching six boards by hand is a bad use of a week.",
    description:
      "Pulls from JobSpy, Indeed, LinkedIn and Google alongside remote-work APIs, scores each posting for relevance against a profile, and exports the shortlist to CSV.",
    highlights: [
      "Four scraped sources plus remote-work APIs in one pipeline",
      "Relevance scoring instead of raw keyword match",
      "CSV export for downstream triage",
    ],
    stack: ["Python", "JobSpy", "pandas"],
    links: [],
  },
  {
    slug: "engineering-fundamentals",
    title: "Engineering Fundamentals Set",
    tag: "Foundations",
    year: "2023 — 2025",
    image: "/assets/img/post-6.svg",
    featured: false,
    summary:
      "The coursework builds worth keeping: design patterns, data structures, refactoring and automation.",
    description:
      "A BookStore management system built around Java design patterns, an e-commerce recommender over a BST in C++, the Video Store refactoring kata done properly, a Django task manager, Selenium automation against Amazon, and a Family Income & Expenditure predictor. Individually small; together they are where the habits came from.",
    highlights: [
      "BookStore Management System — Java, design patterns",
      "E-Commerce recommender over a binary search tree — C++",
      "Video Store refactoring kata",
      "Task Manager — Django",
      "Amazon Selenium automation",
      "Family Income & Expenditure predictor",
    ],
    stack: ["Java", "C++", "Django", "Selenium"],
    links: [],
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const moreProjects = projects.filter((p) => !p.featured);
export const findProject = (slug) => projects.find((p) => p.slug === slug);

export default projects;
