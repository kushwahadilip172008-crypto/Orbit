import { supabase } from "./supabase";
import type { Profile } from "../types";

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function searchProfiles(query: string, limit = 12): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", `%${query}%`)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

export async function follow(followingId: string): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  const actorId = me.user?.id;
  if (!actorId || actorId === followingId) return;
  const { error } = await supabase.from("follows").insert({ following_id: followingId });
  if (error && error.code !== "23505") throw error;
  await supabase.from("notifications").insert({
    user_id: followingId,
    actor_id: actorId,
    type: "follow",
  });
}

export async function unfollow(followingId: string): Promise<void> {
  const { error } = await supabase.from("follows").delete().eq("following_id", followingId);
  if (error) throw error;
}

export async function getFollowers(userId: string, limit = 50): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`
      follower:profiles!follows_follower_id_fkey(*)
    `)
    .eq("following_id", userId)
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.follower as unknown as Profile);
}

export async function getFollowing(userId: string, limit = 50): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`
      following:profiles!follows_following_id_fkey(*)
    `)
    .eq("follower_id", userId)
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.following as unknown as Profile);
}
