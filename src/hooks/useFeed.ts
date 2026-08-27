import { useInfiniteQuery } from "./useInfiniteQuery";
import { getFeed, getExploreFeed, getUserPosts } from "../services/posts";
import type { Post } from "../types";

export function useFeed() {
  return useInfiniteQuery<Post>(
    (cursor) => getFeed(cursor).then((p) => ({ items: p.posts, nextCursor: p.nextCursor })),
    [],
  );
}

export function useExploreFeed() {
  return useInfiniteQuery<Post>(
    (cursor) => getExploreFeed(cursor).then((p) => ({ items: p.posts, nextCursor: p.nextCursor })),
    [],
  );
}

export function useUserPosts(userId: string | undefined) {
  return useInfiniteQuery<Post>(
    (cursor) =>
      userId
        ? getUserPosts(userId, cursor).then((p) => ({ items: p.posts, nextCursor: p.nextCursor }))
        : Promise.resolve({ items: [] as Post[], nextCursor: null }),
    [userId],
  );
}
