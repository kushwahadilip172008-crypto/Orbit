import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Send } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { likePost, unlikePost, savePost, unsavePost, addComment } from "../../services/posts";
import { toast } from "../../store/toast";
import { compactNumber, timeAgo } from "../../utils/time";
import { cn } from "../../utils/cn";
import type { Post } from "../../types";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
  onCommented?: (post: Post) => void;
}

export const PostCard = memo(function PostCard({ post, onCommented }: PostCardProps) {
  const { profile } = useAuth();
  const [liked, setLiked] = useState(!!post.liked_by_me);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [saved, setSaved] = useState(!!post.saved_by_me);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(0);
  const [animating, setAnimating] = useState(false);

  const author = post.author!;
  if (!author) return null;

  const toggleLike = async () => {
    if (!profile) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => c + (wasLiked ? -1 : 1));
    if (!wasLiked) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 700);
    }
    try {
      if (wasLiked) await unlikePost(post.id);
      else await likePost(post.id);
    } catch {
      setLiked(wasLiked);
      setLikesCount((c) => c + (wasLiked ? 1 : -1));
      toast.error("Action failed");
    }
  };

  const toggleSave = async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) await unsavePost(post.id);
      else await savePost(post.id);
    } catch {
      setSaved(wasSaved);
      toast.error("Action failed");
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = commentText.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    try {
      await addComment(post.id, body);
      setCommentText("");
      onCommented?.(post);
    } catch {
      toast.error("Comment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <Link to={`/u/${author.username}`} className={styles.authorLink}>
          <Avatar src={author.avatar_url} name={author.username} size={40} ring />
          <div className={styles.authorMeta}>
            <span className={styles.authorName}>
              {author.username}
              {author.is_verified && <span className={styles.verified} aria-label="Verified" />}
            </span>
            {post.location && <span className={styles.location}>{post.location}</span>}
          </div>
        </Link>
        <button className={styles.moreBtn} aria-label="More options">
          <MoreHorizontal size={20} />
        </button>
      </header>

      <div className={styles.mediaWrap}>
        {post.media_urls.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={post.caption ?? `Post by ${author.username}`}
            className={styles.media}
            style={{ transform: `translateX(-${currentMedia * 100}%)`, display: i === currentMedia ? "block" : "none" }}
            loading="lazy"
          />
        ))}
        {animating && (
          <motion.div
            className={styles.heartBurst}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.7, times: [0, 0.5, 1] }}
          >
            <Heart size={96} fill="white" color="white" />
          </motion.div>
        )}
        {post.media_urls.length > 1 && (
          <>
            <div className={styles.dots}>
              {post.media_urls.map((_, i) => (
                <button
                  key={i}
                  className={cn(styles.dot, i === currentMedia && styles.dotActive)}
                  onClick={() => setCurrentMedia(i)}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
            {currentMedia > 0 && (
              <button
                className={`${styles.navBtn} ${styles.prev}`}
                onClick={() => setCurrentMedia((i) => Math.max(0, i - 1))}
                aria-label="Previous"
              >
                ‹
              </button>
            )}
            {currentMedia < post.media_urls.length - 1 && (
              <button
                className={`${styles.navBtn} ${styles.next}`}
                onClick={() => setCurrentMedia((i) => Math.min(post.media_urls.length - 1, i + 1))}
                aria-label="Next"
              >
                ›
              </button>
            )}
          </>
        )}
      </div>

      <div className={styles.actions}>
        <button
          className={cn(styles.action, liked && styles.actionActive)}
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart size={24} fill={liked ? "currentColor" : "none"} />
        </button>
        <Link to={`/p/${post.id}`} className={styles.action} aria-label="Comments">
          <MessageCircle size={24} />
        </Link>
        <button className={styles.action} aria-label="Share">
          <Send size={22} />
        </button>
        <button
          className={cn(styles.action, styles.saveAction, saved && styles.saveActive)}
          onClick={toggleSave}
          aria-pressed={saved}
          aria-label={saved ? "Unsave" : "Save"}
        >
          <Bookmark size={24} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className={styles.body}>
        {likesCount > 0 && (
          <p className={styles.likes}>{compactNumber(likesCount)} likes</p>
        )}
        {post.caption && (
          <p className={styles.caption}>
            <Link to={`/u/${author.username}`} className={styles.captionAuthor}>
              {author.username}
            </Link>{" "}
            <CaptionText text={post.caption} />
          </p>
        )}
        {post.comments_count > 0 && (
          <Link to={`/p/${post.id}`} className={styles.commentsLink}>
            View all {post.comments_count} comments
          </Link>
        )}
        <time className={styles.time} dateTime={post.created_at}>
          {timeAgo(post.created_at)} ago
        </time>
      </div>

      <form className={styles.commentForm} onSubmit={submitComment}>
        <input
          className={styles.commentInput}
          placeholder="Add a comment…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          maxLength={2200}
          aria-label="Add a comment"
        />
        <button
          type="submit"
          className={styles.commentSubmit}
          disabled={!commentText.trim() || submitting}
        >
          Post
        </button>
      </form>
    </article>
  );
});

function CaptionText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (/^#[\w]+$/.test(part)) {
          return (
            <Link key={i} to={`/explore?q=${encodeURIComponent(part.slice(1))}`} className={styles.hashtag}>
              {part}
            </Link>
          );
        }
        if (/^@[\w.]+$/.test(part)) {
          return (
            <Link key={i} to={`/u/${part.slice(1)}`} className={styles.mention}>
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
