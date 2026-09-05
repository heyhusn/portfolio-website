/**
 * Build-time content snapshot — GENERATED FILE, DO NOT EDIT BY HAND.
 *
 * Written by scripts/snapshot-content.mjs during `npm run build`. See that
 * file for why this exists; see src/data/fallback.js for how it is consumed.
 * Committed as null so a checkout with no database still builds.
 */
export const snapshot = {
  "profile": {
    "id": 1,
    "name": "Husnain Aslam",
    "heroWords": [
      "Software",
      "Engineer"
    ],
    "kicker": "Portfolio — 2026",
    "availability": "Available for work",
    "role": "Software & AI Engineer",
    "location": "Lahore, Pakistan",
    "tagline": "Software engineer building retrieval systems, on-device ML and production web platforms that hold up outside a notebook.",
    "intro": "I build the parts of a system that have to be right when nobody is watching — the retrieval layer, the inference API, the pipeline that has to survive five years of messy sensor data. Final-year software engineering at UMT, teaching backend on the side, and shipping research into things people actually use.",
    "aboutEyebrow": "About Me",
    "aboutTitle": "Engineering With Evidence",
    "aboutLead": "I care about the step most projects skip: proving the thing works. Every project below has a number attached to it, and where a number could not be defended honestly, it was dropped rather than dressed up.",
    "email": "mhusnainaslam2003@gmail.com",
    "phone": "+92 322-4912179",
    "phoneHref": "tel:+923224912179",
    "socials": [
      {
        "href": "https://github.com/heyhusn",
        "kind": "github",
        "label": "GitHub"
      },
      {
        "href": "https://linkedin.com/in/husnain-aslam-0a959a1a7",
        "kind": "linkedin",
        "label": "LinkedIn"
      },
      {
        "href": "mailto:mhusnainaslam2003@gmail.com",
        "kind": "email",
        "label": "Email"
      }
    ],
    "stats": [
      {
        "label": "CGPA out of 4.00",
        "value": 3.94,
        "decimals": 2
      },
      {
        "label": "Projects built and shipped",
        "value": 17,
        "suffix": ""
      },
      {
        "label": "Teaching roles held",
        "value": 2,
        "suffix": ""
      }
    ],
    "education": {
      "cgpa": "3.94 / 4.00",
      "years": "Nov 2022 — Sep 2026",
      "awards": [
        "Best Final Year Project Award — Software Engineering department",
        "Rector's Merit Award, 2024 — 2026",
        "Dean's Merit Award, 2023 and 2026"
      ],
      "degree": "B.S. Software Engineering",
      "school": "University of Management and Technology, Lahore"
    }
  },
  "projects": [
    {
      "id": "1",
      "slug": "vlvrag",
      "title": "VLVRAG — Vectorless Video RAG",
      "tag": "Research",
      "year": "2026",
      "image": "/assets/img/project-3.svg",
      "featured": true,
      "summary": "A retrieval system for lecture video that indexes meaning instead of embeddings — no vector database anywhere in the pipeline.",
      "description": "Lectures are split into adaptive evidence units of 10–45 seconds on signal and transition cues. On-screen text from OCR and speech from ASR are fused and aligned to a frame grid, then indexed as a three-level Markdown ledger — lecture, topic, timed unit — through a local summary-augmented tree. Retrieval unions deterministic timestamp resolution, two-stage tree traversal and BM25, and a pedagogical evidence filter reranks on cross-modal agreement, preferring speech over slides wherever a lecturer corrects themselves out loud.",
      "highlights": [
        "Pk 0.512 → 0.344 and WindowDiff 0.513 → 0.391 against a count-matched equal-spacing baseline, Wilcoxon p < 0.001, improving on 16 of 16 held-out lectures",
        "92.0 NMI against the project's own oracle-K baseline at 74.2 on a second, denser course",
        "Transferred to the second course under a single pre-fitted configuration — one granularity prior, chosen on the dev split and never retuned",
        "Ships a negative control: common faithfulness metrics fail to penalise an answer written for a different question; entailment-based grounding catches it"
      ],
      "stack": [
        "Python",
        "OCR / ASR fusion",
        "BM25",
        "LLM judges",
        "Evaluation harness"
      ],
      "links": [],
      "note": "Abstract accepted at ICASF 2027 (Abu Dhabi University); full paper in writing.",
      "ordering": 0
    },
    {
      "id": "2",
      "slug": "big-brains",
      "title": "Big Brains",
      "tag": "Platform",
      "year": "2025 — present",
      "image": "/assets/img/project-1.svg",
      "featured": true,
      "summary": "An e-learning platform on web and mobile — the final year project that turned into a company.",
      "description": "Course delivery, enrolment and content management across a web app and a mobile client, built and run as a working product rather than a submission. I lead the backend and now teach on the same platform.",
      "highlights": [
        "Web and mobile clients over one backend",
        "Started as the final year project; recognised with the department's Best FYP award",
        "Live at bigbrainslearning.com"
      ],
      "stack": [
        "React",
        "Node.js",
        "MongoDB",
        "Mobile client"
      ],
      "links": [
        {
          "href": "https://bigbrainslearning.com",
          "label": "bigbrainslearning.com"
        }
      ],
      "note": null,
      "ordering": 1
    },
    {
      "id": "3",
      "slug": "solar-pv-digital-twin",
      "title": "Solar PV Digital Twin",
      "tag": "ML Systems",
      "year": "2026",
      "image": "/assets/img/project-5.svg",
      "featured": true,
      "summary": "A digital twin that forecasts real-time photovoltaic output for Dhaka, Lahore and the Thar Desert, with the physics baked into the features.",
      "description": "Five and a half years of hourly NASA POWER meteorological data, cleaned with time-based interpolation and extended with physics-derived features — solar zenith angle, clear-sky irradiance — so the models learn the residual rather than rediscovering astronomy. Random Forest sets the floor, XGBoost with SHAP explains itself, and an LSTM picks up the temporal weather dependencies the tree models miss. A containerised FastAPI service streams predictions to a Three.js front end.",
      "highlights": [
        "5.5+ years of hourly meteorological data across three climates",
        "Physics-informed feature engineering rather than raw weather columns",
        "SHAP interpretability on the gradient-boosted model, so a forecast can be argued with",
        "FastAPI inference API, Docker containerised, deployed on Vercel"
      ],
      "stack": [
        "Python",
        "XGBoost",
        "LSTM",
        "SHAP",
        "FastAPI",
        "Docker",
        "React Three Fiber"
      ],
      "links": [
        {
          "href": "https://solar-pv-digital-twin.vercel.app/",
          "label": "solar-pv-digital-twin.vercel.app"
        }
      ],
      "note": null,
      "ordering": 2
    },
    {
      "id": "4",
      "slug": "scholarmind",
      "title": "ScholarMind",
      "tag": "AI Assistant",
      "year": "2025",
      "image": "/assets/img/project-4.svg",
      "featured": true,
      "summary": "An Android research assistant that reads papers with you — extraction, literature search, and every study aid built on top.",
      "description": "PDFs go through pdfplumber extraction into a DeepSeek LLM wrapped in a JSON-repair layer, because a model that returns almost-valid JSON at 3am is the difference between a working feature and a support ticket. OpenAlex handles literature search, Firestore keeps history, and the same extracted structure powers flashcards, quizzes, a text-to-speech podcast, peer review and reference export.",
      "highlights": [
        "JSON-repair layer around the LLM so malformed generations degrade instead of failing",
        "OpenAlex literature search wired into the reading flow",
        "One extraction pass feeds flashcards, quizzes, TTS podcast, peer review and reference export"
      ],
      "stack": [
        "Android",
        "FastAPI",
        "pdfplumber",
        "DeepSeek",
        "OpenAlex",
        "Firestore"
      ],
      "links": [
        {
          "href": "https://scholar-ai-backend.vercel.app",
          "label": "scholar-ai-backend.vercel.app"
        }
      ],
      "note": null,
      "ordering": 3
    },
    {
      "id": "5",
      "slug": "attention-tracking",
      "title": "Real-Time Attention Tracking",
      "tag": "On-Device ML",
      "year": "2025",
      "image": "/assets/img/project-6.svg",
      "featured": false,
      "summary": "Head pose and eye openness fused into an attention score — computed entirely in the browser, with no video leaving the device.",
      "description": "MediaPipe Face Mesh runs client-side through WebAssembly. Yaw and pitch from head pose combine with the Eye Aspect Ratio into a single 0–1 score, and only that number crosses the FastAPI WebSocket. No video frames, no biometric templates, nothing that could be replayed.",
      "highlights": [
        "Inference runs in WebAssembly on the client — the camera stream never leaves the machine",
        "Head-pose yaw/pitch fused with Eye Aspect Ratio into one bounded score",
        "FastAPI WebSockets carry the score only"
      ],
      "stack": [
        "MediaPipe",
        "WebAssembly",
        "FastAPI",
        "WebSockets"
      ],
      "links": [],
      "note": null,
      "ordering": 4
    },
    {
      "id": "6",
      "slug": "rag-system",
      "title": "Local RAG over PDFs",
      "tag": "Retrieval",
      "year": "2025",
      "image": "/assets/img/project-2.svg",
      "featured": false,
      "summary": "Question answering over PDF collections, running entirely on local models.",
      "description": "LangChain and PyPDFLoader handle ingestion, Ollama serves the embeddings and gemma3:1b, and ChromaDB stores the index. The whole loop runs offline, which makes it the right test bed for retrieval ideas before they go anywhere near a hosted API.",
      "highlights": [
        "Fully local — embeddings and generation both served by Ollama",
        "ChromaDB vector store with PyPDFLoader ingestion"
      ],
      "stack": [
        "LangChain",
        "Ollama",
        "gemma3:1b",
        "ChromaDB"
      ],
      "links": [],
      "note": null,
      "ordering": 5
    },
    {
      "id": "7",
      "slug": "hariyali",
      "title": "Hariyali",
      "tag": "Mobile / ML",
      "year": "2025",
      "image": "/assets/img/project-7.svg",
      "featured": false,
      "summary": "An Android gardening companion: photograph a sick plant, get a diagnosis and a plan.",
      "description": "Image recognition identifies plant disease from a photo, location data narrows down what will actually grow where the user is, and an AI chat handles the follow-up questions. Firebase backs the whole thing; the interface was prototyped in Figma before a line of Kotlin.",
      "highlights": [
        "Plant-disease image recognition from a phone camera",
        "Location-based plant suitability",
        "Figma prototype ahead of the build"
      ],
      "stack": [
        "Android",
        "Firebase",
        "Image classification",
        "Figma"
      ],
      "links": [],
      "note": null,
      "ordering": 6
    },
    {
      "id": "8",
      "slug": "resume-screening",
      "title": "Resume Screening Classifier",
      "tag": "NLP",
      "year": "2025",
      "image": "/assets/img/project-8.svg",
      "featured": false,
      "summary": "A job-title classifier over raw résumé text, wrapped in something a recruiter can use.",
      "description": "TF-IDF features into a OneVsRest KNN classifier, with NLTK and regex doing the preprocessing that decides how good the features are. Serialised with pickle and served through a Streamlit interface.",
      "highlights": [
        "TF-IDF + OneVsRest KNN over cleaned résumé text",
        "NLTK and regex preprocessing pipeline",
        "Streamlit interface for non-technical use"
      ],
      "stack": [
        "scikit-learn",
        "NLTK",
        "Streamlit"
      ],
      "links": [],
      "note": null,
      "ordering": 7
    },
    {
      "id": "9",
      "slug": "financial-sentiment",
      "title": "Financial Sentiment Analysis",
      "tag": "NLP",
      "year": "2025",
      "image": "/assets/img/post-3.svg",
      "featured": false,
      "summary": "Three-class sentiment over financial text using SBERT embeddings and a deep ANN.",
      "description": "Sentence-BERT embeddings feed a deep feed-forward network for three-way classification, deployed as a Streamlit app so the model can be poked at directly rather than through a notebook.",
      "highlights": [
        "SBERT sentence embeddings",
        "Deep ANN classifier",
        "Streamlit deployment"
      ],
      "stack": [
        "SBERT",
        "PyTorch",
        "Streamlit"
      ],
      "links": [],
      "note": null,
      "ordering": 8
    },
    {
      "id": "10",
      "slug": "birnn-sentiment-api",
      "title": "BiRNN Sentiment API",
      "tag": "Backend / ML",
      "year": "2025",
      "image": "/assets/img/post-5.svg",
      "featured": false,
      "summary": "A bidirectional RNN text classifier, served properly over HTTP.",
      "description": "The interesting half of this one is the serving, not the model: a bidirectional RNN behind a FastAPI service with the shapes, batching and error paths a real caller needs.",
      "highlights": [
        "Bidirectional RNN classifier",
        "FastAPI service"
      ],
      "stack": [
        "PyTorch",
        "FastAPI"
      ],
      "links": [],
      "note": null,
      "ordering": 9
    },
    {
      "id": "11",
      "slug": "smart-job-scraper",
      "title": "Smart Job Scraper v3.0",
      "tag": "Data",
      "year": "2025",
      "image": "/assets/img/post-1.svg",
      "featured": false,
      "summary": "Multi-source job aggregation with relevance scoring, because searching six boards by hand is a bad use of a week.",
      "description": "Pulls from JobSpy, Indeed, LinkedIn and Google alongside remote-work APIs, scores each posting for relevance against a profile, and exports the shortlist to CSV.",
      "highlights": [
        "Four scraped sources plus remote-work APIs in one pipeline",
        "Relevance scoring instead of raw keyword match",
        "CSV export for downstream triage"
      ],
      "stack": [
        "Python",
        "JobSpy",
        "pandas"
      ],
      "links": [],
      "note": null,
      "ordering": 10
    },
    {
      "id": "12",
      "slug": "engineering-fundamentals",
      "title": "Engineering Fundamentals Set",
      "tag": "Foundations",
      "year": "2023 — 2025",
      "image": "/assets/img/post-6.svg",
      "featured": false,
      "summary": "The coursework builds worth keeping: design patterns, data structures, refactoring and automation.",
      "description": "A BookStore management system built around Java design patterns, an e-commerce recommender over a BST in C++, the Video Store refactoring kata done properly, a Django task manager, Selenium automation against Amazon, and a Family Income & Expenditure predictor. Individually small; together they are where the habits came from.",
      "highlights": [
        "BookStore Management System — Java, design patterns",
        "E-Commerce recommender over a binary search tree — C++",
        "Video Store refactoring kata",
        "Task Manager — Django",
        "Amazon Selenium automation",
        "Family Income & Expenditure predictor"
      ],
      "stack": [
        "Java",
        "C++",
        "Django",
        "Selenium"
      ],
      "links": [],
      "note": null,
      "ordering": 11
    }
  ],
  "posts": [],
  "siteContent": {
    "services": [
      {
        "items": [
          "RAG pipelines — chunking, indexing, reranking, and the evaluation to prove it works",
          "LLM integration with repair and fallback layers, not raw hope",
          "Model interpretability where a prediction has to be defended",
          "Honest evaluation harnesses: baselines, significance tests, negative controls"
        ],
        "title": "AI & Retrieval Systems"
      },
      {
        "items": [
          "FastAPI and Node services, containerised and deployable",
          "WebSocket and streaming endpoints for real-time inference",
          "MongoDB and Firestore data modelling",
          "Auth, rate limiting and the error paths nobody demos"
        ],
        "title": "Backend & APIs"
      },
      {
        "items": [
          "React front ends with real performance budgets",
          "Three.js / React Three Fiber where depth earns its bytes",
          "Accessible, responsive interfaces down to 320px",
          "Vercel deployment, previews and CI gates"
        ],
        "title": "Full-Stack Web"
      },
      {
        "items": [
          "Client-side inference through WebAssembly, keeping data on the device",
          "Android apps with image recognition and AI assistance",
          "Privacy-first pipelines that transmit conclusions, not raw capture",
          "Latency and memory profiling on mid-tier hardware"
        ],
        "title": "On-Device & Mobile ML"
      }
    ],
    "tickerWords": [
      "Retrieval Systems",
      "Backend Engineering",
      "Applied ML",
      "Web Platforms"
    ],
    "recognition": [
      {
        "kind": "award",
        "text": "Best Final Year Project Award — Software Engineering department, University of Management and Technology.",
        "detail": "Big Brains",
        "source": "UMT"
      },
      {
        "kind": "stat",
        "text": "CGPA across the B.S. Software Engineering programme, out of 4.00.",
        "value": 3.94,
        "decimals": 2
      },
      {
        "kind": "award",
        "text": "Rector's Merit Award, held 2024 through 2026.",
        "detail": "Academic merit",
        "source": "UMT"
      },
      {
        "kind": "award",
        "text": "Dean's Merit Award, 2023 and again in 2026.",
        "detail": "Academic merit",
        "source": "UMT"
      },
      {
        "kind": "stat",
        "text": "Held-out lectures where VLVRAG beat its baseline on segmentation error, Wilcoxon p < 0.001.",
        "value": 16,
        "suffix": "/16"
      },
      {
        "kind": "award",
        "text": "VLVRAG abstract accepted at ICASF 2027, Abu Dhabi University.",
        "detail": "Conference",
        "source": "ICASF 2027"
      }
    ],
    "faqs": [
      {
        "a": "Software and AI engineering roles — backend services, retrieval and ML systems, or full-stack product work. Lahore on-site or remote. I am finishing a B.S. in Software Engineering at UMT in September 2026 and already working alongside it.",
        "q": "What kind of work are you looking for?"
      },
      {
        "a": "Python and FastAPI for services and ML, React with Vite on the front end, MongoDB or Firestore for data, Docker for packaging, Vercel for deployment. Android with Kotlin when the work belongs on a phone. I pick the boring option unless there is a reason not to.",
        "q": "What does your stack actually look like?"
      },
      {
        "a": "Baseline first. Before any model or clever retrieval scheme, I build the dumbest thing that could work and measure it, so every later claim has something to beat. Most of the projects on this site exist because that baseline was not good enough.",
        "q": "How do you approach a new problem?"
      },
      {
        "a": "Yes. VLVRAG is an ongoing paper with an abstract accepted at ICASF 2027, evaluated on held-out MIT OpenCourseWare lectures with significance testing and a negative-control protocol. An internal audit of that pipeline made me drop several published-looking numbers that could not be defended — that audit is the part I would want to be judged on.",
        "q": "Do you have research experience?"
      },
      {
        "a": "Comfortably. I taught computer science at KIPS Virtual and currently teach backend development at Big Brains, so explaining a system to someone who has never seen it is part of the daily job rather than an extra.",
        "q": "Can you teach or mentor as part of a role?"
      },
      {
        "a": "The form below, or mhusnainaslam2003@gmail.com directly. A sentence about the problem is enough to start; you get a reply within two working days.",
        "q": "How do I get in touch?"
      }
    ],
    "experience": [
      {
        "org": "Big Brains — remote",
        "role": "Backend Development Lecturer",
        "years": "Dec 2025 — Present"
      },
      {
        "org": "KIPS Virtual, Lahore",
        "role": "Computer Science Lecturer",
        "years": "Jun 2024 — Feb 2025"
      },
      {
        "org": "University of Management and Technology, Lahore",
        "role": "B.S. Software Engineering",
        "years": "Nov 2022 — Sep 2026"
      }
    ],
    "process": [
      {
        "d": "Work out what success actually means as a number, then build the simplest thing that produces one. Everything afterwards has to beat it.",
        "n": "01.",
        "t": "Frame & Baseline"
      },
      {
        "d": "Ingestion, cleaning and feature work before modelling. Most of the gain in every project on this site came from this stage, not the model.",
        "n": "02.",
        "t": "Data & Pipeline"
      },
      {
        "d": "The service, the interface and the logging together. If a failure cannot be seen in production it will be found by a user instead.",
        "n": "03.",
        "t": "Build & Instrument"
      },
      {
        "d": "Significance tests, ablations and negative controls. Claims that cannot survive an audit get dropped, not softened.",
        "n": "04.",
        "t": "Evaluate Honestly"
      },
      {
        "d": "Containerised, deployed, documented, with the budget checks wired into CI so the next person cannot quietly regress it.",
        "n": "05.",
        "t": "Ship & Hand Over"
      }
    ],
    "serviceOptions": [
      "Full-time role",
      "Contract / freelance",
      "AI or retrieval system",
      "Backend or API work",
      "Research collaboration",
      "Something else"
    ],
    "skillGroups": [
      {
        "id": "languages",
        "lead": "The four I reach for, in the order I reach for them.",
        "title": "Languages",
        "skills": [
          {
            "icon": "python",
            "name": "Python"
          },
          {
            "icon": "openjdk",
            "name": "Java"
          },
          {
            "icon": "kotlin",
            "name": "Kotlin"
          },
          {
            "icon": "cplusplus",
            "name": "C++"
          },
          {
            "icon": "c",
            "name": "C"
          },
          {
            "icon": "javascript",
            "name": "JavaScript"
          }
        ]
      },
      {
        "id": "ai-ml",
        "lead": "The stack behind VLVRAG and the solar digital twin — training, retrieval, and the evaluation that keeps both honest.",
        "title": "AI, ML & Research",
        "skills": [
          {
            "icon": "tensorflow",
            "name": "TensorFlow"
          },
          {
            "icon": "scikitlearn",
            "name": "scikit-learn"
          },
          {
            "icon": "numpy",
            "name": "NumPy"
          },
          {
            "icon": "pandas",
            "name": "pandas"
          },
          {
            "icon": "langchain",
            "name": "LangChain"
          },
          {
            "icon": "crewai",
            "name": "CrewAI"
          },
          {
            "icon": null,
            "name": "Deep Learning"
          },
          {
            "icon": null,
            "name": "NLP"
          },
          {
            "icon": null,
            "name": "RAG Systems"
          },
          {
            "icon": null,
            "name": "LLMs & Agentic AI"
          },
          {
            "icon": null,
            "name": "Generative AI"
          },
          {
            "icon": null,
            "name": "Matplotlib / Seaborn"
          }
        ]
      },
      {
        "id": "backend",
        "lead": "Typed, async services that survive contact with real traffic.",
        "title": "Backend & APIs",
        "skills": [
          {
            "icon": "fastapi",
            "name": "FastAPI"
          },
          {
            "icon": "django",
            "name": "Django"
          },
          {
            "icon": "spring",
            "name": "Spring Boot",
            "level": "Basic"
          },
          {
            "icon": null,
            "name": "Async Programming"
          },
          {
            "icon": null,
            "name": "REST APIs"
          }
        ]
      },
      {
        "id": "mobile",
        "lead": "Android clients, and the on-device work that belongs with them.",
        "title": "Mobile",
        "skills": [
          {
            "icon": "android",
            "name": "Android"
          },
          {
            "icon": "kotlin",
            "name": "Kotlin"
          },
          {
            "icon": "openjdk",
            "name": "Java"
          },
          {
            "icon": "firebase",
            "name": "Firebase"
          }
        ]
      },
      {
        "id": "web",
        "lead": "Front ends with a performance budget, wired to the services above.",
        "title": "Web & Full-Stack",
        "skills": [
          {
            "icon": "react",
            "name": "React"
          },
          {
            "icon": "javascript",
            "name": "JavaScript"
          },
          {
            "icon": "html5",
            "name": "HTML5"
          },
          {
            "icon": "css",
            "name": "CSS3"
          },
          {
            "icon": "django",
            "name": "Django"
          },
          {
            "icon": "fastapi",
            "name": "FastAPI"
          }
        ]
      },
      {
        "id": "data",
        "lead": "Relational where the shape is settled, document where it still moves.",
        "title": "Databases",
        "skills": [
          {
            "icon": "mysql",
            "name": "MySQL"
          },
          {
            "icon": "mongodb",
            "name": "MongoDB"
          },
          {
            "icon": "firebase",
            "name": "Firebase"
          }
        ]
      },
      {
        "id": "devops",
        "lead": "Getting it off my machine, and keeping it reviewable once it is.",
        "title": "Cloud, DevOps & Tooling",
        "skills": [
          {
            "icon": "amazonwebservices",
            "name": "AWS"
          },
          {
            "icon": "vercel",
            "name": "Vercel"
          },
          {
            "icon": "railway",
            "name": "Railway"
          },
          {
            "icon": "git",
            "name": "Git"
          },
          {
            "icon": "github",
            "name": "GitHub"
          },
          {
            "icon": "azuredevops",
            "name": "Azure DevOps"
          },
          {
            "icon": "jira",
            "name": "Jira"
          },
          {
            "icon": "selenium",
            "name": "Selenium"
          },
          {
            "icon": "figma",
            "name": "Figma"
          },
          {
            "icon": null,
            "name": "Scrum / Agile"
          }
        ]
      }
    ],
    "certifications": [
      {
        "id": "lums-business-comm-ai",
        "date": "Nov 2025",
        "href": "",
        "title": "Business Communication and AI for Professionals",
        "issuer": "LUMSx — Lahore University of Management Sciences",
        "topics": [
          "Professional and executive communication",
          "Applied AI for day-to-day knowledge work",
          "Structuring and presenting technical findings"
        ],
        "partner": "In partnership with Roshan Kal Academy, ilmX and PepsiCo",
        "credentialId": "6cc9d9f8b9af4853baba87d66b7d8284"
      },
      {
        "id": "forage-software-engineering",
        "date": "Nov 2025",
        "href": "",
        "title": "Software Engineering Job Simulation",
        "issuer": "Forage",
        "topics": [
          "Working a ticket end to end against a real codebase",
          "Code review and defect triage",
          "Writing to a brief under production constraints"
        ],
        "partner": "",
        "credentialId": "psLva7CFDxghMs4oS"
      }
    ],
    "volunteering": [
      {
        "id": "unicef",
        "org": "UNICEF",
        "href": "https://www.linkedin.com/in/husnain-aslam-0a959a1a7/details/volunteer-experiences/",
        "note": "",
        "role": "Volunteer",
        "cause": "Human Rights",
        "years": "Nov 2025 — Present"
      },
      {
        "id": "amnesty-international",
        "org": "Amnesty International",
        "href": "https://www.linkedin.com/in/husnain-aslam-0a959a1a7/details/volunteer-experiences/",
        "note": "",
        "role": "Student Volunteer",
        "cause": "Human Rights",
        "years": "Dec 2025 — Present"
      }
    ],
    "github": {
      "lead": "A live contribution calendar, pulled straight from the GitHub API.",
      "title": "Open-Source Activity",
      "username": "heyhusn"
    }
  },
  "sections": [
    {
      "id": "hero",
      "title": "Hero Section",
      "is_visible": true,
      "ordering": 0,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "ticker",
      "title": "Word Ticker",
      "is_visible": true,
      "ordering": 1,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "services",
      "title": "Services",
      "is_visible": true,
      "ordering": 2,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "about",
      "title": "About",
      "is_visible": true,
      "ordering": 3,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "work",
      "title": "Featured Projects",
      "is_visible": true,
      "ordering": 4,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "recognition",
      "title": "Recognition",
      "is_visible": true,
      "ordering": 5,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "faq",
      "title": "FAQ",
      "is_visible": true,
      "ordering": 6,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "notes",
      "title": "Notes & Insights",
      "is_visible": true,
      "ordering": 7,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "contact",
      "title": "Contact",
      "is_visible": true,
      "ordering": 8,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "github",
      "title": "GitHub Contributions",
      "is_visible": true,
      "ordering": 9,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "skills",
      "title": "Technical Skills",
      "is_visible": false,
      "ordering": 10,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "certifications",
      "title": "Certifications",
      "is_visible": false,
      "ordering": 11,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    },
    {
      "id": "volunteering",
      "title": "Volunteering",
      "is_visible": false,
      "ordering": 12,
      "animation_type": "default",
      "font_family": "default",
      "type": "predefined",
      "content": null
    }
  ]
};

/** Set by the build script to the ISO timestamp the snapshot was taken. */
export const snapshotTakenAt = "2026-09-05T12:53:24.248Z";
