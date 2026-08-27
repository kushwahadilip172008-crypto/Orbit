import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { useExploreFeed } from "../hooks/useFeed";
import { useInView } from "../hooks/useInView";
import { searchProfiles } from "../services/profiles";
import type { Profile } from "../types";
import styles from "./ExplorePage.module.css";

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [search, setSearch] = useState(query);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const feed = useExploreFeed();
  const [sentinelRef, inView] = useInView<HTMLDivElement>();

  useEffect(() => {
    if (inView && feed.hasMore && !feed.loadingMore) feed.loadMore();
  }, [inView, feed.hasMore, feed.loadingMore, feed.loadMore]);

  useEffect(() => {
    let mounted = true;
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchProfiles(search.trim());
        if (mounted) setSearchResults(r);
      } finally {
        if (mounted) setSearching(false);
      }
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [search]);

  const showSearch = useMemo(() => search.trim().length > 0, [search]);

  return (
    <div className={styles.page}>
      <div className={styles.searchBar}>
        <Search size={18} className={styles.searchIcon} />
        <input
          className={styles.input}
          placeholder="Search people or hashtags"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setParams(e.target.value ? { q: e.target.value } : {}, { replace: true });
          }}
        />
        {search && (
          <button
            className={styles.clear}
            onClick={() => {
              setSearch("");
              setParams({}, { replace: true });
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showSearch ? (
        <div className={styles.results}>
          {searching && <p className={styles.hint}>Searching…</p>}
          {!searching && searchResults.length === 0 && (
            <p className={styles.hint}>No people found for "{search}".</p>
          )}
          {searchResults.map((p) => (
            <Link key={p.id} to={`/u/${p.username}`} className={styles.resultItem}>
              <Avatar src={p.avatar_url} name={p.username} size={48} />
              <div className={styles.resultMeta}>
                <span className={styles.resultName}>{p.username}</span>
                {p.full_name && <span className={styles.resultSub}>{p.full_name}</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {feed.items.map((p, i) => (
              <Link
                key={p.id}
                to={`/p/${p.id}`}
                className={`${styles.gridItem} ${i % 9 === 0 ? styles.large : ""}`}
              >
                <img src={p.media_urls[0]} alt={p.caption ?? ""} loading="lazy" />
                <div className={styles.overlay}>
                  <span>♥ {p.likes_count}</span>
                  <span>💬 {p.comments_count}</span>
                </div>
              </Link>
            ))}
          </div>

          {feed.loading && (
            <div className={styles.grid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`${styles.gridItem} ${styles.skeletonItem} skeleton`} />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className={styles.sentinel} />
        </>
      )}
    </div>
  );
}
