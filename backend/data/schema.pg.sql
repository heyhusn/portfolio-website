-- Postgres / Supabase schema.
--
-- Mirrors the SQLite schema in backend/db.mjs, with the type differences that
-- actually matter: JSONB instead of TEXT-holding-JSON (so the driver hands
-- back real objects and Postgres can index into them), BOOLEAN instead of
-- INTEGER flags, and identity columns instead of AUTOINCREMENT.
--
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS users (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- Single-row table, same as SQLite's CHECK (id = 1).
CREATE TABLE IF NOT EXISTS profile (
  id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name         TEXT,
  "heroWords"  JSONB DEFAULT '[]'::jsonb,
  kicker       TEXT,
  availability TEXT,
  role         TEXT,
  location     TEXT,
  tagline      TEXT,
  intro        TEXT,
  "aboutEyebrow" TEXT,
  "aboutTitle"   TEXT,
  "aboutLead"    TEXT,
  email        TEXT,
  phone        TEXT,
  "phoneHref"  TEXT,
  socials      JSONB DEFAULT '[]'::jsonb,
  stats        JSONB DEFAULT '[]'::jsonb,
  education    JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS projects (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  tag         TEXT,
  year        TEXT,
  image       TEXT,
  featured    BOOLEAN DEFAULT FALSE,
  summary     TEXT,
  description TEXT,
  highlights  JSONB DEFAULT '[]'::jsonb,
  stack       JSONB DEFAULT '[]'::jsonb,
  links       JSONB DEFAULT '[]'::jsonb,
  note        TEXT,
  ordering    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  date        TEXT,
  "dateLabel" TEXT,
  category    TEXT,
  excerpt     TEXT,
  body        JSONB DEFAULT '[]'::jsonb,
  image       TEXT,
  "isDraft"   BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS site_content (
  key   TEXT PRIMARY KEY,
  value JSONB
);

CREATE TABLE IF NOT EXISTS sections (
  id               TEXT PRIMARY KEY,
  title            TEXT,
  is_visible       BOOLEAN DEFAULT TRUE,
  ordering         INTEGER,
  animation_type   TEXT DEFAULT 'default',
  font_family      TEXT DEFAULT 'default',
  type             TEXT DEFAULT 'predefined',
  content          JSONB
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id      TEXT PRIMARY KEY,
  "docId" TEXT,
  source  TEXT,
  kind    TEXT,
  title   TEXT,
  url     TEXT,
  date    TEXT,
  text    TEXT,
  part    INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_chunks(source);

CREATE TABLE IF NOT EXISTS rag_queries (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question    TEXT,
  answer      TEXT,
  sources     JSONB,
  grounded    BOOLEAN,
  "latencyMs" INTEGER,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
