import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "./Reveal.jsx";
import SectionHead from "./SectionHead.jsx";
import { ArrowUpRight } from "./Icons.jsx";
import { getRagMeta, askRagStream } from "../lib/api.js";
import { useStore } from "../store.js";
import { SUGGESTED_QUESTIONS } from "../data/suggested-questions.js";

const MAX_CHARS = 500;

/* What a visitor sees. Never mentions keys, servers or commands — none of
   that is their problem, and a stranger reading "run npm run ingest" on a
   portfolio learns only that it is broken. */
const OFFLINE_COPY = {
  unreachable:
    "The assistant isn't reachable right now — everything else on this page works as normal.",
  "empty-index":
    "The assistant is being set up and has nothing to answer from yet — everything else on this page works as normal.",
  "no-api-key":
    "The assistant isn't switched on right now — everything else on this page works as normal.",
};

/* What Husnain sees, in dev only: the actual fix, named. */
const DEV_FIX = {
  unreachable:
    "the API isn't responding. Start it with `npm start` in backend/ (it builds the knowledge base on boot if it's missing).",
  "empty-index":
    "the API is up but the chunk table is empty. Run `npm run ingest` in backend/, or hit Rebuild in /admin → RAG Assistant.",
  "no-api-key":
    "LLM_API_KEY isn't set in backend/.env. Retrieval works without it; generation doesn't.",
};

/**
 * The retrieval-augmented assistant, front and centre on the home page.
 *
 * It answers only from Husnain's own material — site content, resumes,
 * LinkedIn and public GitHub repositories — and every answer carries the
 * passages it used. The whole pipeline (retrieval, rerank, generation) runs
 * on the backend; this component sends a question and renders a stream. The
 * model provider and its key never touch the browser.
 *
 * If the backend isn't running the section still renders, explains itself,
 * and points at the contact form instead of showing a dead input.
 */
export default function AskAssistant({ id = "assistant" }) {
  const { profile } = useStore();
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState("checking"); // checking | ready | offline
  // Why it is offline, when we know: "unreachable" | "empty-index" | "no-api-key".
  // "Assistant offline" on its own tells the owner nothing about which of
  // three completely different things to fix.
  const [reason, setReason] = useState(null);
  const [turns, setTurns] = useState([]); // {role, content, sources?, error?}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const abortRef = useRef(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getRagMeta()
      .then((m) => {
        if (cancelled) return;
        setMeta(m);
        setStatus(m.ready ? "ready" : "offline");
        setReason(m.ready ? null : m.reason || "empty-index");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("offline");
        setReason("unreachable");
      });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  // Keep the newest turn in view while tokens stream in, but only scroll the
  // log itself — hijacking the page scroll while someone is reading further
  // down would be worse than not following the answer.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const ask = async (question) => {
    const q = question.trim();
    if (!q || busy) return;

    setInput("");
    setBusy(true);

    // Only completed exchanges become history; the turn in flight is not
    // context for itself.
    const history = turns
      .filter((t) => !t.error)
      .slice(-4)
      .map((t) => ({ role: t.role, content: t.content }));

    setTurns((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: "", sources: [] }]);

    const controller = new AbortController();
    abortRef.current = controller;

    const patchLast = (patch) =>
      setTurns((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = typeof patch === "function" ? patch(last) : { ...last, ...patch };
        return next;
      });

    try {
      await askRagStream(q, history, {
        signal: controller.signal,
        onSources: (sources) => patchLast({ sources }),
        onDelta: (text) => patchLast((last) => ({ ...last, content: last.content + text })),
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      patchLast({
        content:
          err?.message ||
          "Something went wrong reaching the assistant. The contact form below still works.",
        error: true,
      });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  // Rendered from first paint, not from the meta response. The server returns
  // this same list (it is re-exported by backend/rag/pipeline.mjs from the
  // same module), so when the response lands the chips are already there and
  // nothing moves. Waiting for the response meant the assistant panel grew by
  // a chip row a few hundred milliseconds in, pushing every section below it
  // down the page — on a narrow screen that was over 300px of shift.
  const suggestions = meta?.suggestions || SUGGESTED_QUESTIONS;
  const started = turns.length > 0;

  return (
    <section className="section" id={id}>
      <div className="shell">
        <SectionHead
          title="Ask About My Work"
          lead="A retrieval-augmented assistant over my own material — projects, resumes, LinkedIn and public repositories. It answers from those passages and cites them, or tells you it doesn't know."
        />

        <Reveal>
          <div className="ask">
            <div className="ask__bar">
              <span className={`ask__dot ask__dot--${status}`} aria-hidden="true" />
              <span className="ask__status">
                {status === "checking"
                  ? "Connecting…"
                  : status === "ready"
                  ? `Grounded in ${meta.indexed} passages from his own material`
                  : "Assistant offline"}
              </span>
              {status === "ready" && meta?.model ? (
                <span className="ask__model">{meta.model}</span>
              ) : null}
            </div>

            {/* One box for all three pre-conversation states. Which one shows
                is only known after /api/rag/meta answers, a moment after first
                paint, and the offline message is shorter than the input +
                suggestions — so without a floor here, resolving the status
                nudges everything below the panel up the page. */}
            <div className="ask__body">
            {status === "offline" ? (
              <div className="ask__offline">
                <p>{OFFLINE_COPY[reason] || OFFLINE_COPY.unreachable}</p>
                <p className="ask__offline-sub">
                  {profile?.email ? (
                    <>
                      For anything you'd have asked it, the contact form below reaches Husnain,
                      or email <a href={`mailto:${profile.email}`}>{profile.email}</a>.
                    </>
                  ) : (
                    <>For anything you'd have asked it, the contact form below reaches Husnain.</>
                  )}
                </p>
                {import.meta.env.DEV ? (
                  <p className="ask__offline-dev">
                    <strong>Dev note:</strong> {DEV_FIX[reason] || DEV_FIX.unreachable}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                {started ? (
                  <div className="ask__log" ref={logRef} aria-live="polite" aria-atomic="false">
                    {turns.map((turn, i) =>
                      turn.role === "user" ? (
                        <div className="ask__turn ask__turn--you" key={i}>
                          <span className="ask__who">You</span>
                          <p>{turn.content}</p>
                        </div>
                      ) : (
                        <div
                          className={`ask__turn ask__turn--bot${turn.error ? " is-error" : ""}`}
                          key={i}
                        >
                          <span className="ask__who">Assistant</span>
                          {turn.content ? (
                            <p>{turn.content}</p>
                          ) : (
                            <p className="ask__thinking">
                              <span /><span /><span />
                            </p>
                          )}
                          {turn.sources?.length ? (
                            <ul className="ask__sources">
                              {turn.sources.map((s) => (
                                <li key={s.n}>
                                  {s.url?.startsWith("/") ? (
                                    <Link to={s.url}>
                                      <span className="ask__src-n">{s.n}</span>
                                      {s.title}
                                    </Link>
                                  ) : s.url ? (
                                    <a href={s.url} target="_blank" rel="noreferrer">
                                      <span className="ask__src-n">{s.n}</span>
                                      {s.title}
                                      <ArrowUpRight aria-hidden="true" />
                                    </a>
                                  ) : (
                                    <span>
                                      <span className="ask__src-n">{s.n}</span>
                                      {s.title}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      )
                    )}
                  </div>
                ) : null}

                {suggestions.length && !started ? (
                  <ul className="ask__suggestions">
                    {suggestions.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => ask(s)}
                          // Present but inert until the assistant reports
                          // ready — the chips are here to hold their space,
                          // not to accept a click the backend can't serve yet.
                          disabled={busy || status !== "ready"}
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <form
                  className="ask__form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask(input);
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    className="ask__input"
                    placeholder="Ask about a project, a skill, his research…"
                    value={input}
                    maxLength={MAX_CHARS}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={busy || status !== "ready"}
                    aria-label="Ask a question about Husnain's work"
                  />
                  <button
                    type="submit"
                    className="btn btn--lime ask__send"
                    disabled={busy || !input.trim() || status !== "ready"}
                  >
                    {busy ? "Thinking…" : "Ask"}
                  </button>
                </form>

                <p className="ask__note">
                  Answers come only from Husnain's own material and cite the passages used. It
                  will say when it doesn't know rather than guess — for anything it can't answer,
                  the contact form below reaches him directly.
                </p>
              </>
            )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
