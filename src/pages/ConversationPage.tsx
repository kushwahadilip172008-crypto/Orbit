import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { getConversations, getMessages, markConversationRead, sendMessage } from "../services/messages";
import { supabase } from "../services/supabase";
import { timeAgo } from "../utils/time";
import { toast } from "../store/toast";
import type { Conversation, Message } from "../types";
import styles from "./ConversationPage.module.css";

export function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    Promise.all([
      getConversations(),
      getMessages(id),
      markConversationRead(id),
    ])
      .then(([convs, msgs]) => {
        if (!mounted) return;
        const conv = convs.find((c) => c.id === id) ?? null;
        setConversation(conv);
        setMessages(msgs);
      })
      .catch(() => toast.error("Couldn't load conversation"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === profile?.id) return;
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url, is_verified")
            .eq("id", newMsg.sender_id)
            .maybeSingle();
          setMessages((prev) => [
            ...prev,
            { ...newMsg, sender: (sender as Message["sender"]) ?? undefined },
          ]);
          markConversationRead(id).catch(() => {});
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, profile?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const other = useMemo(
    () => conversation?.participants.find((p) => p.user_id !== profile?.id)?.profile,
    [conversation, profile?.id],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !id || sending) return;
    setSending(true);
    setDraft("");
    try {
      const msg = await sendMessage(id, body);
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate("/messages")} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        {other && (
          <div className={styles.headerMeta}>
            <Avatar src={other.avatar_url} name={other.username} size={36} />
            <div className={styles.headerText}>
              <span className={styles.headerName}>{other.username}</span>
              <span className={styles.headerSub}>Active now</span>
            </div>
          </div>
        )}
      </header>

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.thread}>
          {loading && (
            <div className={styles.empty}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`${styles.bubble} ${styles.skeleton} skeleton`} />
              ))}
            </div>
          )}
          {!loading && messages.map((m) => {
            const mine = m.sender_id === profile?.id;
            return (
              <div key={m.id} className={`${styles.bubbleRow} ${mine ? styles.mine : ""}`}>
                {!mine && other && (
                  <Avatar src={other.avatar_url} name={other.username} size={28} />
                )}
                <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                  {m.body}
                </div>
              </div>
            );
          })}
          {!loading && messages.length === 0 && (
            <div className={styles.empty}>
              <p>Say hello 👋</p>
            </div>
          )}
        </div>
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <input
          className={styles.input}
          placeholder="Message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={4000}
          aria-label="Message"
        />
        <button type="submit" className={styles.send} disabled={!draft.trim() || sending}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
