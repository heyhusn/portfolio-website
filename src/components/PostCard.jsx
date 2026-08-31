import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "./Icons.jsx";

const PostCard = forwardRef(function PostCard({ post, className, ...rest }, ref) {
  return (
    <Link
      className={["post", className].filter(Boolean).join(" ")}
      to={`/blogs/${post.slug}`}
      ref={ref}
      {...rest}
    >
      <div className="post__media">
        <img src={post.image} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="post__body">
        <div className="post__meta">
          <span className="post__cat">{post.category}</span>
          <time className="post__date" dateTime={post.date}>
            {post.dateLabel}
          </time>
        </div>
        <h3 className="post__title">{post.title}</h3>
        <p className="post__excerpt">{post.excerpt}</p>
        <span className="post__more">
          Read article <ArrowUpRight />
        </span>
      </div>
    </Link>
  );
});

export default PostCard;
