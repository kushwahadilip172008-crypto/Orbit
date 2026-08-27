import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, AtSign, Mail } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { getNotifications, markAllNotificationsRead } from "../services/notifications";
import { timeAgo } from "../utils/time";
import type { AppNotification, NotificationType } from "../types";
import styles from "./NotificationsPage.module.css";

const ICONS: Record<NotificationType, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  message: Mail,
};

export function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getNotifications()
      .then((n) => {
        if (!mounted) return;
        setItems(n);
        markAllNotificationsRead().catch(() => {});
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Activity</h1>
      <div className={styles.list}>
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={`${styles.avatar} skeleton`} />
              <div className={styles.skeletonText}>
                <div className={`${styles.line} skeleton`} style={{ width: 200, height: 12 }} />
                <div className={`${styles.line} skeleton`} style={{ width: 80, height: 10, marginTop: 6 }} />
              </div>
            </div>
          ))}

        {!loading && items.length === 0 && (
          <div className={styles.empty}>
            <Heart size={36} />
            <h2>No activity yet</h2>
            <p>When people interact with you, it'll show up here.</p>
          </div>
        )}

        {!loading &&
          items.map((n) => {
            const Icon = ICONS[n.type];
            const actor = n.actor;
            if (!actor) return null;
            const text =
              n.type === "like"
                ? "liked your post"
                : n.type === "comment"
                  ? `commented: ${n.body ?? ""}`
                  : n.type === "follow"
                    ? "started following you"
                    : n.type === "mention"
                      ? "mentioned you"
                      : "sent you a message";
            return (
              <Link
                key={n.id}
                to={n.post_id ? `/p/${n.post_id}` : n.type === "follow" ? `/u/${actor.username}` : "/messages"}
                className={styles.row}
              >
                <Avatar src={actor.avatar_url} name={actor.username} size={44} />
                <div className={styles.rowMeta}>
                  <p className={styles.rowText}>
                    <span className={styles.rowName}>{actor.username}</span> {text}
                  </p>
                  <span className={styles.rowTime}>{timeAgo(n.created_at)} ago</span>
                </div>
                <span className={`${styles.icon} ${styles[`type_${n.type}`]}`}>
                  <Icon size={16} />
                </span>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
