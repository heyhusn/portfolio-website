/**
 * Skills, certifications and volunteering — the resume-derived content.
 *
 * Everything here is filtered down to what actually supports the four
 * profiles this portfolio targets: research, AI/ML engineering, Android,
 * and backend / full-stack. Project-management chat tools and one-off
 * design utilities are deliberately left out; they can be added back from
 * the admin panel (Skills tab) without touching this file.
 *
 * `icon` is a slug into src/data/tech-icons.js. A skill with no brand mark
 * (NLP, RAG, Agile...) sets `icon: null` and renders the generic glyph, so
 * a concept and a product sit in the same grid without one looking broken.
 * `level` is optional and renders as a small tag under the name.
 */
export const skillGroups = [
  {
    id: "languages",
    title: "Languages",
    lead: "The four I reach for, in the order I reach for them.",
    skills: [
      { name: "Python", icon: "python" },
      { name: "Java", icon: "openjdk" },
      { name: "Kotlin", icon: "kotlin" },
      { name: "C++", icon: "cplusplus" },
      { name: "C", icon: "c" },
      { name: "JavaScript", icon: "javascript" },
    ],
  },
  {
    id: "ai-ml",
    title: "AI, ML & Research",
    lead: "The stack behind VLVRAG and the solar digital twin — training, retrieval, and the evaluation that keeps both honest.",
    skills: [
      { name: "TensorFlow", icon: "tensorflow" },
      { name: "scikit-learn", icon: "scikitlearn" },
      { name: "NumPy", icon: "numpy" },
      { name: "pandas", icon: "pandas" },
      { name: "LangChain", icon: "langchain" },
      { name: "CrewAI", icon: "crewai" },
      { name: "Deep Learning", icon: null },
      { name: "NLP", icon: null },
      { name: "RAG Systems", icon: null },
      { name: "LLMs & Agentic AI", icon: null },
      { name: "Generative AI", icon: null },
      { name: "Matplotlib / Seaborn", icon: null },
    ],
  },
  {
    id: "backend",
    title: "Backend & APIs",
    lead: "Typed, async services that survive contact with real traffic.",
    skills: [
      { name: "FastAPI", icon: "fastapi" },
      { name: "Django", icon: "django" },
      { name: "Spring Boot", icon: "spring", level: "Basic" },
      { name: "Async Programming", icon: null },
      { name: "REST APIs", icon: null },
    ],
  },
  {
    id: "mobile",
    title: "Mobile",
    lead: "Android clients, and the on-device work that belongs with them.",
    skills: [
      { name: "Android", icon: "android" },
      { name: "Kotlin", icon: "kotlin" },
      { name: "Java", icon: "openjdk" },
      { name: "Firebase", icon: "firebase" },
    ],
  },
  {
    id: "web",
    title: "Web & Full-Stack",
    lead: "Front ends with a performance budget, wired to the services above.",
    skills: [
      { name: "React", icon: "react" },
      { name: "JavaScript", icon: "javascript" },
      { name: "HTML5", icon: "html5" },
      { name: "CSS3", icon: "css" },
      { name: "Django", icon: "django" },
      { name: "FastAPI", icon: "fastapi" },
    ],
  },
  {
    id: "data",
    title: "Databases",
    lead: "Relational where the shape is settled, document where it still moves.",
    skills: [
      { name: "MySQL", icon: "mysql" },
      { name: "MongoDB", icon: "mongodb" },
      { name: "Firebase", icon: "firebase" },
    ],
  },
  {
    id: "devops",
    title: "Cloud, DevOps & Tooling",
    lead: "Getting it off my machine, and keeping it reviewable once it is.",
    skills: [
      { name: "AWS", icon: "amazonwebservices" },
      { name: "Vercel", icon: "vercel" },
      { name: "Railway", icon: "railway" },
      { name: "Git", icon: "git" },
      { name: "GitHub", icon: "github" },
      { name: "Azure DevOps", icon: "azuredevops" },
      { name: "Jira", icon: "jira" },
      { name: "Selenium", icon: "selenium" },
      { name: "Figma", icon: "figma" },
      { name: "Scrum / Agile", icon: null },
    ],
  },
];

/* ---------- Certifications & credentials ---------- */
export const certifications = [
  {
    id: "lums-business-comm-ai",
    title: "Business Communication and AI for Professionals",
    issuer: "LUMSx — Lahore University of Management Sciences",
    partner: "In partnership with Roshan Kal Academy, ilmX and PepsiCo",
    date: "Nov 2025",
    credentialId: "6cc9d9f8b9af4853baba87d66b7d8284",
    href: "",
    topics: [
      "Professional and executive communication",
      "Applied AI for day-to-day knowledge work",
      "Structuring and presenting technical findings",
    ],
  },
  {
    id: "forage-software-engineering",
    title: "Software Engineering Job Simulation",
    issuer: "Forage",
    partner: "",
    date: "Nov 2025",
    credentialId: "psLva7CFDxghMs4oS",
    href: "",
    topics: [
      "Working a ticket end to end against a real codebase",
      "Code review and defect triage",
      "Writing to a brief under production constraints",
    ],
  },
];

/* ---------- Volunteering ---------- */
export const volunteering = [
  {
    id: "unicef",
    org: "UNICEF",
    role: "Volunteer",
    cause: "Human Rights",
    years: "Nov 2025 — Present",
    href: "https://www.linkedin.com/in/husnain-aslam-0a959a1a7/",
    note: "",
  },
  {
    id: "amnesty-international",
    org: "Amnesty International",
    role: "Student Volunteer",
    cause: "Human Rights",
    years: "Dec 2025 — Present",
    href: "https://www.linkedin.com/in/husnain-aslam-0a959a1a7/",
    note: "",
  },
];

/* ---------- GitHub panel ----------
   username is what the contributions section fetches for. Editable from the
   admin panel (Credentials tab) so it never has to be changed in source. */
export const github = {
  username: "heyhusn",
  title: "Open-Source Activity",
  lead: "A live contribution calendar, pulled straight from the GitHub API.",
};

/* ---------- LinkedIn recommendations ----------
   Real recommendations from named colleagues, quoted verbatim. Unlike the
   `recognition` marquee in site.js — which deliberately carries checkable
   facts rather than invented quotes — these are attributed to actual people
   who wrote them, so they belong on the site as written. Nothing here is
   paraphrased or trimmed for flattery; edit them in the admin panel only to
   correct a transcription. */
export const recommendations = [
  {
    id: "minahil-murtaza",
    name: "Minahil Murtaza",
    headline:
      "Final-Year SE Student | Django | ML & NLP | Building Systems That Learn & Adapt",
    relationship: "Worked with Husnain on the same team",
    date: "July 27, 2026",
    href: "",
    body: [
      "I have studied with Husnain in a few courses and have also worked with him outside class.",
      "What has stood out most to me is his curiosity. He is always learning something new, whether it is a tool, a course, or a project, and he actually sees it through. I have always found that drive to keep learning and exploring inspiring!",
      "Beyond his own work, Husnain is genuinely helpful. He shares opportunities when he finds them, explains concepts to classmates, and gives feedback that is honest but never about showing off. People naturally go to him when they are stuck. He is also consistent. He thinks things through, solves problems practically, and follows up on what he says he will do.",
      "Given how he learns and works, I am confident Husnain will do well and add real value wherever he goes. I recommend him without reservation!",
    ],
  },
  {
    id: "anusha-hassan",
    name: "Anusha Hassan",
    headline:
      "CS graduate @ UMT | AI & Robotics Enthusiast | Software Developer | Research Aspirant",
    relationship: "Worked with Husnain on the same team",
    date: "July 26, 2026",
    href: "",
    body: [
      "Working with Husnain has been a great experience. He has exceptional research skills and consistently go above and beyond to ensure his work is accurate, insightful, and well-supported by credible sources.",
      "One of his greatest strengths is his ability to break down complex topics, analyze information critically, and turn it into clear, meaningful insights. He's detail-oriented, organized, and always willing to explore different perspectives before drawing conclusions.",
      "What stands out most is his curiosity and dedication to continuous learning. He is someone you can always rely on to deliver thoughtful, high-quality research while being a supportive and collaborative teammate.",
      "I wholeheartedly recommend Husnain to anyone looking for someone with strong research abilities, excellent analytical skills, and a professional work ethic.",
    ],
  },
  {
    id: "muhammad-moeez",
    name: "Muhammad Moeez",
    headline:
      "AI Engineer @HSI TEAM | Generative AI · Agentic AI · Machine Learning · Deep Learning · NLP · Automation | Python Developer",
    relationship: "Worked with Husnain on the same team",
    date: "June 29, 2026",
    href: "",
    body: [
      "I had the opportunity to collaborate with Husnain on several AI projects and research initiatives focused on Generative AI, Agentic AI, LLM security, and multimodal applications.",
      "Husnain consistently demonstrated a mature and structured approach to problem-solving, especially when designing data-intensive and AI-powered systems and identifying effective ways to apply AI technologies to improve workflows and user experiences. On the academic side, he stood out for his ability to conduct in-depth literature reviews, understand research deeply, and connect academic ideas with practical implementation. When it comes to research, very few people bring the same level of depth, curiosity, and consistency as Husnain.",
      "He combines analytical depth with strong technical execution, which makes him a valuable contributor to both research-driven and product-focused work.",
      "I confidently recommend Husnain for AI Engineer, AI Research Engineer, or Full-Stack Engineer roles.",
    ],
  },
];

export default skillGroups;
