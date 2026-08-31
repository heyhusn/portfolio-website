import { useParams, Link, Navigate } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import PostCard from "../components/PostCard.jsx";
import SectionHead from "../components/SectionHead.jsx";
import ContactSection from "../components/ContactSection.jsx";
import { ArrowUpRight, Check } from "../components/Icons.jsx";
import { useStore } from "../store.js";

function Block({ block }) {
  switch (block.type) {
    case "h":
      return <h2 className="h4">{block.text}</h2>;
    case "list":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>
              <span className="acc__check" aria-hidden="true">
                <Check />
              </span>
              {item}
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote>
          <p>{block.text}</p>
        </blockquote>
      );
    default:
      return <p>{block.text}</p>;
  }
}

export default function BlogPost() {
  const { slug } = useParams();
  const { findPost, getPublishedPosts } = useStore();
  const post = findPost(slug);

  // findPost already excludes drafts, so an unpublished slug 404s here
  // exactly like an unknown one instead of leaking scaffold content.
  if (!post) return <Navigate to="/blogs" replace />;

  const more = getPublishedPosts().filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <section className="detail-head">
        <div className="shell">
          <div className="article">
            <Reveal>
              <Link className="back" to="/blogs">
                <ArrowUpRight aria-hidden="true" /> All writing
              </Link>
            </Reveal>
            <Reveal delay={1}>
              <div className="post__meta" style={{ marginTop: 22 }}>
                <span className="post__cat">{post.category}</span>
                <time className="post__date" dateTime={post.date}>
                  {post.dateLabel}
                </time>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <h1 className="h1" style={{ marginTop: 18 }}>
                {post.title}
              </h1>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section--tight" style={{ paddingTop: 36 }}>
        <div className="shell">
          <Reveal>
            <figure className="detail-hero">
              <img src={post.image} alt="" />
            </figure>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="shell">
          <div className="article">
            <Reveal>
              <p className="lead" style={{ fontSize: 19, maxWidth: "none" }}>
                {post.excerpt}
              </p>
            </Reveal>
            {post.body.map((block, i) => (
              <Reveal key={i}>
                <div>
                  <Block block={block} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <SectionHead title="Keep Reading" lead="Three more from the same shelf." />
          <div className="posts posts--3">
            {more.map((p, i) => (
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
