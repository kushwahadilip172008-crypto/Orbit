import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { getPost, getComments, addComment, deleteComment, likePost, unlikePost, deletePost } from "../services/posts";
import { timeAgo, fullDate, compactNumber } from "../utils/time";
import { toast } from "../store/toast";
import { cn } from "../utils/cn";
import type { Post, Comment } from "../types";
import styles from "./PostDetailPage.module.css";

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    Promise.all([getPost(id), getComments(id)])
      .then(([p, c]) => {
        if (!mounted) return;
        setPost(p);
        setComments(c);
        setLiked(!!p?.liked_by_me);
        setLikesCount(p?.likes_count ?? 0);
      })
      .catch(() => toast.error("Couldn't load post"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !id || submitting) return;
    setSubmitting(true);
    try {
      const c = await addComment(id, body);
      setComments((prev) => [...prev, c]);
      setDraft("");
    } catch {
      toast.error("Comment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async () => {
    if (!post) return;
    const was = liked;
    setLiked(!was);
    setLikesCount((c) => c + (was ? -1 : 1));
    try {
      if (was) await unlikePost(post.id);
      else await likePost(post.id);
    } catch {
      setLiked(was);
      setLikesCount((c) => c + (was ? 1 : -1));
    }
  };

  const removeComment = async (cid: string) => {
    try {
      await deleteComment(cid);
      setComments((prev) => prev.filter((c) => c.id !== cid));
    } catch {
      toast.error("Delete failed");
    }
  };

  const removePost = async () => {
    if (!post) return;
    if (!confirm("Delete this post?")) return;
    try {
      await deletePost(post.id);
      toast.success("Post deleted");
      navigate(`/u/${profile?.username}`);
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={`${styles.mediaSkeleton} skeleton`} />
        <div className={styles.sideSkeleton}>
          <div className={`${styles.line} skeleton`} style={{ width: 200, height: 14 }} />
          <div className={`${styles.line} skeleton`} style={{ width: "100%", height: 12, marginTop: 12 }} />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={styles.notFound}>
        <h2>Post not found</h2>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  const author = post.author!;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)} aria-label="Back">
        <ArrowLeft size={22} />
      </button>

      <article className={styles.card}>
        <div className={styles.media}>
          <img src={post.media_urls[0]} alt={post.caption ?? ""} />
        </div>

        <div className={styles.side}>
          <header className={styles.header}>
            <Link to={`/u/${author.username}`} className={styles.authorLink}>
              <Avatar src={author.avatar_url} name={author.username} size={40} ring />
              <div className={styles.authorMeta}>
                <span className={styles.authorName}>{author.username}</span>
                {post.location && <span className={styles.location}>{post.location}</span>}
              </div>
            </Link>
            {post.author_id === profile?.id && (
              <button className={styles.deleteBtn} onClick={removePost} aria-label="Delete post">
                <Trash2 size={18} />
              </button>
            )}
          </header>

          <div className={styles.comments}>
            {post.caption && (
              <div className={styles.captionRow}>
                <Avatar src={author.avatar_url} name={author.username} size={32} />
                <div className={styles.commentBody}>
                  <p>
                    <span className={styles.commentAuthor}>{author.username}</span> {post.caption}
                  </p>
                  <time dateTime={post.created_at}>{timeAgo(post.created_at)} ago</time>
                </div>
              </div>
            )}
            {comments.map((c) => (
              <div key={c.id} className={styles.commentRow}>
                <Avatar src={c.author?.avatar_url} name={c.author?.username ?? ""} size={32} />
                <div className={styles.commentBody}>
                  <p>
                    <span className={styles.commentAuthor}>{c.author?.username}</span> {c.body}
                  </p>
                  <div className={styles.commentMeta}>
                    <time dateTime={c.created_at}>{timeAgo(c.created_at)} ago</time>
                    {c.author_id === profile?.id && (
                      <button className={styles.commentDelete} onClick={() => removeComment(c.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && !post.caption && (
              <p className={styles.noComments}>No comments yet. Be the first.</p>
            )}
          </div>

          <div className={styles.actions}>
            <button
              className={cn(styles.action, liked && styles.actionActive)}
              onClick={toggleLike}
              aria-pressed={liked}
            >
              <Heart size={24} fill={liked ? "currentColor" : "none"} />
            </button>
            <span className={styles.action}>
              <MessageCircle size={24} />
            </span>
            <span className={styles.likes}>{compactNumber(likesCount)} likes</span>
            <time className={styles.time} dateTime={post.created_at} title={fullDate(post.created_at)}>
              {fullDate(post.created_at)}
            </time>
          </div>

          <form className={styles.composer} onSubmit={submit}>
            <input
              className={styles.input}
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2200}
              aria-label="Add a comment"
            />
            <button type="submit" className={styles.send} disabled={!draft.trim() || submitting}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </article>
    </div>
  );
}
