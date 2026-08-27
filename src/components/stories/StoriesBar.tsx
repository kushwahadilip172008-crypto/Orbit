import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { getStoryFeed, type StoryGroup } from "../../services/stories";
import { StoriesViewer } from "./StoriesViewer";
import styles from "./StoriesBar.module.css";

export function StoriesBar() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    getStoryFeed()
      .then((g) => mounted && setGroups(g))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={styles.bar}>
      <div className={styles.scroll}>
        {profile && (
          <button
            className={styles.selfItem}
            onClick={() => {
              const idx = groups.findIndex((g) => g.author.id === profile.id);
              if (idx >= 0) setActiveIndex(idx);
            }}
          >
            <div className={styles.selfAvatar}>
              <Avatar src={profile.avatar_url} name={profile.username} size={56} />
              <span className={styles.addBadge}>
                <Plus size={14} />
              </span>
            </div>
            <span className={styles.label}>Your story</span>
          </button>
        )}

        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.item}>
                <div className={`${styles.avatarWrap} skeleton`} style={{ width: 64, height: 64 }} />
                <div className={`${styles.label} skeleton`} style={{ width: 60, height: 10 }} />
              </div>
            ))
          : groups
              .filter((g) => g.author.id !== profile?.id)
              .map((g, i) => (
                <button
                  key={g.author.id}
                  className={styles.item}
                  onClick={() => setActiveIndex(groups.indexOf(g))}
                >
                  <Avatar
                    src={g.author.avatar_url}
                    name={g.author.username}
                    size={56}
                    ring
                    seen={g.seen}
                  />
                  <span className={styles.label}>{g.author.username}</span>
                </button>
              ))}
      </div>

      {activeIndex !== null && (
        <StoriesViewer
          groups={groups}
          startIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </div>
  );
}
