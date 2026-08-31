# LinkedIn profile — Husnain Aslam

Source: his own LinkedIn profile, transcribed and cleaned. LinkedIn interface
text ("Thumbnail for…", "Show all 8 media", "· 1st", "+5 skills", "Show
credential") has been removed; nothing factual was changed.

## Headline

Husnain Aslam — Software Engineer | AI Engineer & Researcher | 5x Academic
Awards Achiever | Full Stack Android Dev | Django | FastAPI
Lahore, Punjab, Pakistan.
Currently associated with Big Brains and the University of Management and
Technology (UMT).

## Experience

### Backend Development in FastAPI Instructor — Big Brains (part-time, remote)
Dec 2025 – Present. Lahore, Punjab, Pakistan.
Delivers structured, industry-aligned training in backend development with an
emphasis on scalable API architecture and best practices. Instruction covers
RESTful API design, Pydantic-based data validation, SQLAlchemy ORM integration,
JWT authentication, middleware implementation, dependency injection and modular
project structuring. Hands-on, project-driven learning aimed at designing,
developing and deploying production-ready backend systems.
Skills: FastAPI, back-end web development.

### Teaching Assistant — University of Management and Technology (part-time)
Nov 2025 – Mar 2026. Lahore, on-site.
Courses: Mobile Application Development; Software Design and Architecture.

### Professor of Computer Science — KIPS Education System (part-time)
May 2024 – Jan 2025. On-site.

### Cloud Administrator — AM Digital Solution (part-time)
Jul 2023 – Apr 2024. Lahore, on-site.

## Education

### University of Management and Technology (UMT)
Bachelor's degree, Computer Software Engineering. Oct 2022 – Nov 2026.
Grade: 3.93.
Skills listed: Mobile Application Development, Natural Language Processing.

### MAO College Lahore
Intermediate, Computer Science. Sep 2020 – Jun 2022. Grade: 87%.
Activities and societies: Music, Book Writing.

### Federal Government School
Matric, Computer Science. Mar 2018 – May 2020. Grade: 86.5%.

## Projects

### Multi-Modal Video Understanding — Vectorless VRAG System
Mar 2026 – Present.
Built a custom vectorless retrieval architecture (PageIndex Engine) that
replaces traditional embedding-based search with a hierarchical document tree
and LLM-guided reasoning. This enables precise, context-preserving retrieval
without chunk fragmentation.
Skills: research skills, Retrieval-Augmented Generation (RAG).

### Solar PV Digital Twin — Simulation & Modeling
May 2026 – Jun 2026. Associated with UMT.
A comprehensive digital twin for a solar photovoltaic power generation system.
An interactive 3D web simulation predicts real-time solar power output across
diverse climates (Dhaka, Lahore and the Thar Desert), bridging data
engineering, predictive machine learning and immersive web development.

Key contributions:
- Data engineering and physics modelling: an automated pipeline acquiring and
  processing over 5.5 years of hourly meteorological data from the NASA POWER
  API, with physics-based feature engineering (solar zenith angles, clear-sky
  irradiance models) and time-based interpolation for missing sensor data.
- Machine learning architecture: trained and evaluated multiple models to
  forecast power generation — Random Forest as a robust baseline, XGBoost with
  SHAP for high-performance gradient boosting and interpretability, and LSTM
  networks to capture temporal weather dependencies.
- Backend inference engine: a high-performance FastAPI backend serving the
  trained models for real-time inference and streaming of power predictions.
- Interactive 3D visualisation: a responsive, data-driven frontend with a
  dynamic 3D environment in Three.js and React Three Fiber, letting users
  explore the simulated solar facility alongside animated data visualisations.

Technologies: React, Vite, Three.js, React Three Fiber/Drei, Tailwind CSS,
Radix UI, Recharts, Framer Motion; Python, FastAPI; scikit-learn, XGBoost,
LSTM, SHAP, pandas, NASA POWER API; Docker; deployed on Vercel.

### RAG System (Chatbot)
Sep 2025. Associated with UMT.
An interactive Retrieval-Augmented Generation project where users upload a PDF
and ask natural-language questions about its content. The system retrieves the
most relevant sections and generates context-based answers using LangChain,
Ollama and ChromaDB.
Features: extracts and processes PDF content with PyPDFLoader; splits documents
into overlapping chunks for context retention; Ollama embeddings with a Chroma
vector database for semantic search; Ollama LLM (gemma3:1b) for answers; an
interactive command-line Q&A loop with exit handling; input validation, error
handling and flexible PDF path support.
Tech stack: Python, LangChain, Ollama (LLM and embeddings), ChromaDB,
PyPDFLoader.
Repository: github.com/heyhusn/RAG-System
Skills: generative AI, Retrieval-Augmented Generation (RAG).

### Machine Learning Resume Screening Application
Aug 2025.
A machine-learning resume screening application that automates job-category
classification to improve recruitment efficiency.
- A text preprocessing pipeline with regex and NLTK for consistent feature
  extraction.
- A multi-class KNN model using OneVsRestClassifier for high-accuracy
  predictions across job categories.
- A Streamlit app with error handling for text and PDF inputs, usable by
  non-technical users.
- Models serialised with pickle for deployment without retraining.
Tools: Python, scikit-learn, NLTK, Streamlit, PyPDF2, pickle, pandas, regex,
KNeighborsClassifier, TF-IDF, OneVsRestClassifier.
Repository: github.com/heyhusn/Resume-Screen-App-NLP
Skills: Natural Language Processing (NLP), machine learning.

### Hariyali — AI-Based Gardening App
Jun 2025 – Jul 2025. Associated with UMT.
An AI-powered gardening application for urban users of all ages, with
video-based tutorials guiding users step by step on growing and maintaining
plants.
Features: AI image recognition for plant-disease detection from user photos;
location-based plant suitability analysis using environmental data; an AI chat
assistant for plant queries trained on a dataset; real-time notifications for
watering and care; a MyGarden module to add, search, update and delete plants
with tracking tailored to local suitability; a minimal dual-colour interface
for usability and accessibility.
Skills: Firebase, software deployment.

### BookStore Management System — Java, OOP, Design Patterns
Jun 2025. Associated with UMT.
A console-based bookstore management system in Java using four core design
patterns — Factory, Observer, Singleton and Strategy — supporting both admin
and customer roles.
Features: admin panel for books, inventory and sales reports; customer portal
for registration, login, browsing, cart and wishlist management and orders;
Strategy pattern for payment by cash, credit card and PayPal; Observer pattern
to notify customers of new arrivals; Singleton pattern for a consistent
shopping cart per session; Factory pattern to create books by category
(academic, novel, science).
Technical highlights: modular code following SOLID principles, input validation
and error handling, and a design that extends to new features or payment
methods.
Repository: github.com/heyhusn/BookstoreManagementSys
Skills: Java, design patterns.

### Figma UI/UX Design Showcase — Hariyali App
Apr 2025 – Jun 2025. Associated with UMT.
A complete Figma prototype for Hariyali, focused on a clean, intuitive and
visually engaging interface. A white-and-green palette represents freshness and
growth, with green for key actions and white for a distraction-free experience.
Built with auto layouts for consistent spacing, components and variants for
reusable UI, grids and constraints for responsive design, and prototypes
simulating button clicks and the chatbot flow.
Screens: splash and onboarding, home with AI tools and tutorials, AI image
recognition with upload/capture and result cards, location-based suggestions,
AI chat support styled like a messaging app, MyGarden as a grid with reminders,
and a notification centre. UX choices include large buttons, readable fonts and
clear icons for users of all ages.
Skills: Figma, human–computer interaction.

### National Legal Framework for the Regulation, Compliance and Adoption of Cryptocurrency in Pakistan
May 2025 – Jun 2025. Associated with UMT.
Advanced research on the evolving legal landscape for cryptocurrency
regulation, compliance and adoption in Pakistan. Examines the emerging
framework developed by the State Bank of Pakistan, the Securities and Exchange
Commission and the Pakistan Crypto Council, and benchmarks it against practice
in the EU, Japan, Switzerland and the United States.
Focus areas: licensing, investor protection, anti-money-laundering (AML) and
financial innovation; the role of technical committees; blockchain integration;
and the balance between innovation and market integrity. Output includes
drafted proposals on scam and fraud, ransomware, and money laundering via
cryptocurrency.
Skills: research skills, project management.

### Audi Celestium R9 — Luxury Vehicle Launch Campaign
Dec 2024 – Feb 2025. Associated with UMT. A team project.
A full marketing project: developed the Celestium R9 premium vehicle concept
for upper-class consumers in Pakistan, with the slogan "Driving Distinction,
Inspiring Envy". Included demographic, geographic, behavioural and
psychographic segmentation identifying affluent professionals and entrepreneurs
aged 30–55 in Lahore, Karachi and Islamabad; a premium pricing model at PKR
8 crore with a cost and margin analysis (56.25%); competitor and SWOT analysis
identifying a niche in compact hybrid luxury vehicles; a promotion mix of print
ads, a scripted TV commercial and billboards; selective distribution through
luxury showrooms, online booking with home delivery and exclusive events; and a
final pitch delivered to faculty and peers.
Skills: project management, market research.

### E-Commerce Recommendation System
Jan 2024 – Feb 2024. Associated with UMT.
A C++ product recommendation system built on a binary search tree. Products are
stored in a BST organised by price, enabling efficient price-based search and
recommendation.
Features: product management with name, specifications, description, price,
stock, status and category; exact price matching via BST traversal; minimum and
maximum price recommendations for budget and premium options; and inventory
display in sorted order via inorder traversal.
Algorithms: BST insertion for a price-sorted hierarchy, recursive inorder
traversal, iterative search by price, and min/max finding — O(log n) search
complexity for price queries.
Repository: github.com/heyhusn/EcommerceRecommendationSystemDSA
Skills: data structures and algorithms, C++.

## Licenses & certifications

### Business Communication and AI for Professionals
Lahore University of Management Sciences (LUMS). Issued Nov 2025.
Credential ID 6cc9d9f8b9af4853baba87d66b7d8284.
Skills: business communication, AI prompting.

### Software Engineering Job Simulation
Forage — J.P. Morgan's Software Engineer Job Simulation. Issued Nov 2025.
Credential ID psLva7CFDxghMs4oS.
Skills: Spring Framework, event-driven programming.

## Honors & awards

- Rector's Merit Award, University of Management and Technology, Jun 2026.
- Rector's Merit Award, UMT, Jun 2025 — achieved 4.0 SGPA in the 4th semester.
- Rector's Merit Award, UMT, Jun 2024 — achieved 4.0 SGPA in the 3rd semester.
- Dean's Merit Award, UMT, Feb 2023 — achieved 3.94 SGPA in the 1st semester.
