import { supabase } from "./supabase";
import type { Post, Profile, Comment } from "../types";

const PAGE_SIZE = 10;

interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
}

export async function getFeed(cursor?: string): Promise<FeedPage> {
  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  if (!uid) return { posts: [], nextCursor: null };

  // Following IDs + self
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", uid);

  const ids = [uid, ...(following ?? []).map((f) => f.following_id)];
  if (ids.length === 0) return { posts: [], nextCursor: null };

  let q = supabase
    .from("posts")
    .select(`
      id, author_id, caption, media_urls, media_type, location, visibility,
      likes_count, comments_count, created_at, updated_at,
      author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url, is_verified)
    `)
    .in("author_id", ids)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) q = q.lt("created_at", cursor);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<Post & { author: Profile }>;
  const hasMore = rows.length > PAGE_SIZE;
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const posts = slice.map((r) => ({ ...r, author: r.author })) as Post[];

  // Enrich with liked_by_me / saved_by_me
  const enriched = await enrichPosts(posts, uid);
  return {
    posts: enriched,
    nextCursor: hasMore && slice.length ? slice[slice.length - 1].created_at : null,
  };
}

export async function getExploreFeed(cursor?: string): Promise<FeedPage> {
  let q = supabase
    .from("posts")
    .select(`
      id, author_id, caption, media_urls, media_type, location, visibility,
      likes_count, comments_count, created_at, updated_at,
      author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url, is_verified)
    `)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) q = q.lt("created_at", cursor);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<Post & { author: Profile }>;
  const hasMore = rows.length > PAGE_SIZE;
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const posts = slice.map((r) => ({ ...r, author: r.author })) as Post[];

  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  const enriched = uid ? await enrichPosts(posts, uid) : posts;

  return {
    posts: enriched,
    nextCursor: hasMore && slice.length ? slice[slice.length - 1].created_at : null,
  };
}

export async function getUserPosts(userId: string, cursor?: string): Promise<FeedPage> {
  let q = supabase
    .from("posts")
    .select(`
      id, author_id, caption, media_urls, media_type, location, visibility,
      likes_count, comments_count, created_at, updated_at,
      author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url, is_verified)
    `)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) q = q.lt("created_at", cursor);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<Post & { author: Profile }>;
  const hasMore = rows.length > PAGE_SIZE;
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const posts = slice.map((r) => ({ ...r, author: r.author })) as Post[];

  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  const enriched = uid ? await enrichPosts(posts, uid) : posts;

  return {
    posts: enriched,
    nextCursor: hasMore && slice.length ? slice[slice.length - 1].created_at : null,
  };
}

export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, author_id, caption, media_urls, media_type, location, visibility,
      likes_count, comments_count, created_at, updated_at,
      author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url, is_verified)
    `)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const post = data as unknown as Post & { author: Profile };
  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  if (uid) {
    const [liked, saved] = await Promise.all([
      supabase.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", uid).maybeSingle(),
      supabase.from("saved_posts").select("post_id").eq("post_id", id).eq("user_id", uid).maybeSingle(),
    ]);
    return { ...post, liked_by_me: !!liked.data, saved_by_me: !!saved.data };
  }
  return post;
}

async function enrichPosts(posts: Post[], uid: string): Promise<Post[]> {
  if (posts.length === 0) return posts;
  const ids = posts.map((p) => p.id);
  const [liked, saved] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", uid),
    supabase.from("saved_posts").select("post_id").in("post_id", ids).eq("user_id", uid),
  ]);
  const likedSet = new Set((liked.data ?? []).map((r) => r.post_id));
  const savedSet = new Set((saved.data ?? []).map((r) => r.post_id));
  return posts.map((p) => ({
    ...p,
    liked_by_me: likedSet.has(p.id),
    saved_by_me: savedSet.has(p.id),
  }));
}

export async function likePost(postId: string): Promise<void> {
  const { error } = await supabase.from("post_likes").insert({ post_id: postId });
  if (error) {
    if (error.code === "23505") return; // already liked
    throw error;
  }
  await notifyOwner(postId, "like");
}

export async function unlikePost(postId: string): Promise<void> {
  const { error } = await supabase.from("post_likes").delete().eq("post_id", postId);
  if (error) throw error;
}

export async function savePost(postId: string): Promise<void> {
  const { error } = await supabase.from("saved_posts").insert({ post_id: postId });
  if (error && error.code !== "23505") throw error;
}

export async function unsavePost(postId: string): Promise<void> {
  const { error } = await supabase.from("saved_posts").delete().eq("post_id", postId);
  if (error) throw error;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function createPost(input: {
  caption: string | null;
  mediaUrls: string[];
  mediaType: "image" | "video";
  location?: string | null;
}): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      caption: input.caption,
      media_urls: input.mediaUrls,
      media_type: input.mediaType,
      location: input.location ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Post;
}

export async function getComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(`
      id, post_id, author_id, body, likes_count, created_at,
      author:profiles!comments_author_id_fkey(id, username, full_name, avatar_url, is_verified)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(postId: string, body: string): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, body })
    .select(`
      id, post_id, author_id, body, likes_count, created_at,
      author:profiles!comments_author_id_fkey(id, username, full_name, avatar_url, is_verified)
    `)
    .single();
  if (error) throw error;
  await notifyOwner(postId, "comment", body);
  return data as unknown as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}

async function notifyOwner(postId: string, type: "like" | "comment", body?: string) {
  const { data: me } = await supabase.auth.getUser();
  const actorId = me.user?.id;
  if (!actorId) return;
  const { data: post } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.author_id === actorId) return;
  await supabase.from("notifications").insert({
    user_id: post.author_id,
    actor_id: actorId,
    type,
    post_id: postId,
    body: body ?? null,
  });
}
