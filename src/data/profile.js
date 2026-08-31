/**
 * Single source of truth for identity, contact and the hero.
 * Everything else on the site reads from here — change it once.
 */
export const profile = {
  name: "Husnain Aslam",
  // The two display words that flank the hero portrait.
  heroWords: ["Software", "Engineer"],
  kicker: "Portfolio — 2026",
  availability: "Available for work",
  role: "Software & AI Engineer",
  location: "Lahore, Pakistan",

  tagline:
    "Lead developer and first author on a video-retrieval paper accepted at ICASF 2027 — and the engineer who builds the FastAPI backends, RAG pipelines and React front ends that make research ship.",

  intro:
    "Final-year software engineering at UMT, and lead developer and first author on VLVRAG — a vectorless video-retrieval system that cut segmentation error by a third against its baseline, with an abstract accepted at ICASF 2027, Abu Dhabi. Outside the paper: a solar PV digital twin trained on real NASA telemetry, backend and retrieval systems that survive contact with production traffic, and two teaching roles where explaining the system to someone else is what keeps the design honest.",

  about: {
    eyebrow: "About Me",
    title: "Built to Survive an Audit",
    lead:
      "VLVRAG's own evaluation is the reason I work this way — an internal audit of that pipeline made me drop several published-looking numbers that could not be defended, and every project below has been held to the same standard since. A number stays on this page only if it survives being checked.",
  },

  email: "mhusnainaslam2003@gmail.com",
  phone: "+92 322-4912179",
  phoneHref: "tel:+923224912179",

  socials: [
    { kind: "github", label: "GitHub", href: "https://github.com/heyhusn" },
    {
      kind: "linkedin",
      label: "LinkedIn",
      href: "https://linkedin.com/in/husnain-aslam-0a959a1a7",
    },
    { kind: "email", label: "Email", href: "mailto:mhusnainaslam2003@gmail.com" },
  ],

  // Counted, not estimated — see /src/data/projects.js for the full list.
  stats: [
    { value: 3.94, decimals: 2, label: "CGPA out of 4.00" },
    { value: 17, suffix: "", label: "Projects built and shipped" },
    { value: 2, suffix: "", label: "Teaching roles held" },
  ],

  education: {
    degree: "B.S. Software Engineering",
    school: "University of Management and Technology, Lahore",
    years: "Nov 2022 — Sep 2026",
    cgpa: "3.94 / 4.00",
    awards: [
      "Best Final Year Project Award — Software Engineering department",
      "Rector's Merit Award, 2024 — 2026",
      "Dean's Merit Award, 2023 and 2026",
    ],
  },
};

export default profile;
