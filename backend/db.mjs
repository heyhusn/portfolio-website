import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, "portfolio.db");

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT,
    heroWords JSON,
    kicker TEXT,
    availability TEXT,
    role TEXT,
    location TEXT,
    tagline TEXT,
    intro TEXT,
    aboutEyebrow TEXT,
    aboutTitle TEXT,
    aboutLead TEXT,
    email TEXT,
    phone TEXT,
    phoneHref TEXT,
    socials JSON,
    stats JSON,
    education JSON
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    title TEXT,
    tag TEXT,
    year TEXT,
    image TEXT,
    featured INTEGER,
    summary TEXT,
    description TEXT,
    highlights JSON,
    stack JSON,
    links JSON,
    note TEXT,
    ordering INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    title TEXT,
    date TEXT,
    dateLabel TEXT,
    category TEXT,
    excerpt TEXT,
    body JSON,
    image TEXT,
    isDraft INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    value JSON
  );

  CREATE TABLE IF NOT EXISTS rag_chunks (
    id TEXT PRIMARY KEY,
    docId TEXT,
    source TEXT,
    kind TEXT,
    title TEXT,
    url TEXT,
    date TEXT,
    text TEXT,
    part INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_chunks(source);

  CREATE TABLE IF NOT EXISTS rag_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    answer TEXT,
    sources JSON,
    grounded INTEGER,
    latencyMs INTEGER,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    title TEXT,
    is_visible INTEGER DEFAULT 1,
    ordering INTEGER,
    animation_type TEXT DEFAULT 'default',
    font_family TEXT DEFAULT 'default',
    type TEXT DEFAULT 'predefined',
    content JSON
  );
`);

export default db;
