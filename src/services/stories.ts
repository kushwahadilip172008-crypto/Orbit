import { supabase } from "./supabase";
import type { Story, Profile } from "../types";

export interface StoryGroup {
  author: Profile;
  stories: Story[];
  seen: boolean;
}

export async function getStoryFeed(): Promise<StoryGroup[]> {
  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  if (!uid) return [];

  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", uid);
  const ids = Array.from(new Set([uid, ...(following ?? []).map((f) => f.following_id)]));

  const { data, error } = await supabase
    .from("stories")
    .select(`
      id, author_id, media_url, media_type, caption, created_at, expires_at,
      author:profiles!stories_author_id_fkey(id, username, full_name, avatar_url, is_verified)
    `)
    .in("author_id", ids)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as Story[];
  const { data: views } = await supabase
    .from("story_views")
    .select("story_id")
    .in(
      "story_id",
      rows.map((r) => r.id),
    )
    .eq("user_id", uid);
  const viewedSet = new Set((views ?? []).map((v) => v.story_id));

  const groups = new Map<string, StoryGroup>();
  for (const s of rows) {
    const author = s.author as unknown as Profile;
    if (!groups.has(author.id)) {
      groups.set(author.id, { author, stories: [], seen: true });
    }
    const g = groups.get(author.id)!;
    g.stories.push({ ...s, viewed: viewedSet.has(s.id) });
    if (!s.viewed) g.seen = false;
  }
  // Sort: unseen first, then self first
  return Array.from(groups.values()).sort((a, b) => {
    if (a.author.id === uid) return -1;
    if (b.author.id === uid) return 1;
    if (a.seen === b.seen) return 0;
    return a.seen ? 1 : -1;
  });
}

export async function createStory(input: {
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("stories").insert({
    media_url: input.mediaUrl,
    media_type: input.mediaType,
    caption: input.caption ?? null,
  });
  if (error) throw error;
}

export async function markStoryViewed(storyId: string): Promise<void> {
  const { error } = await supabase.from("story_views").insert({ story_id: storyId });
  if (error && error.code !== "23505") throw error;
}

export async function deleteStory(storyId: string): Promise<void> {
  const { error } = await supabase.from("stories").delete().eq("id", storyId);
  if (error) throw error;
}
