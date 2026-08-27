import { useEffect } from "react";
import { Link } from "react-router-dom";
import { StoriesBar } from "../components/stories/StoriesBar";
import { PostCard } from "../components/post/PostCard";
import { PostCardSkeleton } from "../components/post/PostCardSkeleton";
import { EmptyFeed } from "../components/post/EmptyFeed";
import { useFeed } from "../hooks/useFeed";
import { useInView } from "../hooks/useInView";
import styles from "./FeedPage.module.css";

export function FeedPage() {
  const { items, loading, loadingMore, error, loadMore, hasMore } = useFeed();
  const [sentinelRef, inView] = useInView<HTMLDivElement>();

  useEffect(() => {
    if (inView && hasMore && !loadingMore) loadMore();
  }, [inView, hasMore, loadingMore, loadMore]);

  return (
    <div className={styles.page}>
      <div className={styles.feed}>
        <StoriesBar />

        {error && (
          <div className={styles.errorBox}>
            Couldn't load feed. <button onClick={() => location.reload()}>Retry</button>
          </div>
        )}

        {loading
          ? Array.from({ length: 3 }).map((_, i) => <PostCardSkeleton key={i} />)
          : items.map((p) => <PostCard key={p.id} post={p} />)}

        {!loading && items.length === 0 && !error && <EmptyFeed />}

        {!loading && hasMore && (
          <div ref={sentinelRef} className={styles.sentinel} aria-hidden>
            {loadingMore && <PostCardSkeleton />}
          </div>
        )}

        {!loading && !hasMore && items.length > 0 && (
          <p className={styles.end}>You're all caught up</p>
        )}
      </div>

      <aside className={styles.suggestions}>
        <div className={styles.suggestCard}>
          <h3 className={styles.suggestTitle}>Suggested for you</h3>
          <p className={styles.suggestHint}>
            Explore <Link to="/explore">trending posts</Link> and discover new creators.
          </p>
        </div>
      </aside>
    </div>
  );
}
