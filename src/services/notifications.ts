import { supabase } from "./supabase";
import type { AppNotification, Profile, Post } from "../types";

export async function getNotifications(limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(`
      id, user_id, actor_id, type, post_id, body, read, created_at,
      actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url, is_verified),
      post:posts(id, media_urls)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AppNotification[];
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);
  if (error) throw error;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  if (!uid) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("read", false);
  if (error) return 0;
  return count ?? 0;
}
