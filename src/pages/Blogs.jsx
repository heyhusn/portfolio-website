import Reveal from "../components/Reveal.jsx";
import PostCard from "../components/PostCard.jsx";
import ContactSection from "../components/ContactSection.jsx";
import { useStore } from "../store.js";
import { useDocumentMeta } from "../lib/meta.js";

export default function Blogs() {
  const { profile, getPublishedPosts } = useStore();
  useDocumentMeta({
    title: `Blogs & Insights — ${profile?.name || "Husnain Aslam"}`,
    description: "Writing on retrieval, evaluation, and production systems engineering.",
  });

  const posts = getPublishedPosts();
  return (
    <>
      <section className="page-head">
        <div className="shell">
          <Reveal>
            <span className="eyebrow">Notes & Insights</span>
          </Reveal>
          <Reveal delay={1}>
            <h1 className="display" style={{ marginTop: 16 }}>
              Blogs
            </h1>
          </Reveal>
          <Reveal delay={2}>
            <p className="lead">
              Writing on retrieval, evaluation and the engineering decisions that
              only look small until they break something.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 80 }}>
        <div className="shell">
          <div className="posts posts--3">
            {posts.map((p, i) => (
              <Reveal key={p.slug} delay={i % 3}>
                <PostCard post={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
