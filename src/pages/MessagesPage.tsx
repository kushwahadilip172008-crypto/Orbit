import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { getConversations } from "../services/messages";
import { timeAgo } from "../utils/time";
import type { Conversation } from "../types";
import styles from "./MessagesPage.module.css";

export function MessagesPage() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    getConversations()
      .then((c) => mounted && setConversations(c))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const other = (c: Conversation) => c.participants.find((p) => p.user_id !== profile?.id)?.profile;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{profile?.username}</h1>
        <button className={styles.composeBtn} aria-label="New message">✏</button>
      </header>

      <div className={styles.list}>
        {loading && (
          <div className={styles.empty}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={`${styles.avatar} skeleton`} />
                <div className={styles.skeletonText}>
                  <div className={`${styles.line} skeleton`} style={{ width: 140, height: 12 }} />
                  <div className={`${styles.line} skeleton`} style={{ width: 220, height: 10, marginTop: 6 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className={styles.empty}>
            <MessageCircle size={36} />
            <h2>No messages yet</h2>
            <p>Visit a profile and tap Message to start a conversation.</p>
            <Link to="/explore" className={styles.cta}>Find people</Link>
          </div>
        )}

        {!loading &&
          conversations.map((c) => {
            const p = other(c);
            if (!p) return null;
            return (
              <Link key={c.id} to={`/messages/${c.id}`} className={styles.row}>
                <Avatar src={p.avatar_url} name={p.username} size={56} ring />
                <div className={styles.rowMeta}>
                  <span className={styles.rowName}>{p.username}</span>
                  <span className={styles.rowSub}>
                    {c.last_message?.body ?? "Start chatting"}
                    {c.last_message && ` · ${timeAgo(c.last_message.created_at)} ago`}
                  </span>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
