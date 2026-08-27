/*
# Orbit — Initial schema for a social media platform

## Overview
Builds the full data layer for an Instagram-tier social app on Supabase:
profiles, posts, comments, likes, follows, stories, conversations,
messages, notifications, and saved posts. Includes counters maintained
via triggers, indexes for hot read paths, and strict RLS for every table.

## Tables
1. `profiles` — public user profile data (1:1 with auth.users)
2. `posts` — authored media posts (image/video)
3. `post_likes` — join table user ↔ post
4. `comments` — comments on posts
5. `comment_likes` — join table user ↔ comment
6. `follows` — follower/following relationships
7. `stories` — ephemeral 24h stories
8. `story_views` — who has seen each story
9. `conversations` — DM threads
10. `conversation_participants` — members of a conversation
11. `messages` — DM messages
12. `notifications` — activity notifications
13. `saved_posts` — bookmarks

## Security (RLS)
- All tables have RLS enabled.
- Profiles are world-readable; only owner can update/insert/delete.
- Posts: public SELECT for public posts; private posts only visible to owner.
- Likes/comments/follows/saves: anyone authenticated can read; only owner
  of the row can create/delete their own.
- Stories: readable by everyone while not expired; only author can create/delete.
- Messages: participants can read/send in conversations they belong to.
- Notifications: only the owning user can read; only the actor can insert.

## Notes
1. Counter columns maintained by triggers so the app never does COUNT(*) on hot paths.
2. `auth.uid()` defaults on owner columns so client inserts that omit the
   owner still satisfy RLS WITH CHECK.
3. All timestamps are timestamptz, defaulting to now().
4. Hard deletes with CASCADE on FKs.
*/

create extension if not exists "pgcrypto";

-- ============================================================
-- Tables (all created first so cross-table policies can resolve)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  website text,
  is_private boolean not null default false,
  is_verified boolean not null default false,
  posts_count integer not null default 0,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  caption text,
  media_urls text[] not null check (array_length(media_urls, 1) between 1 and 10),
  media_type text not null default 'image' check (media_type in ('image','video')),
  location text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2200),
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  caption text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text check (body is null or char_length(body) between 1 and 4000),
  media_url text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like','comment','follow','mention','message')),
  post_id uuid references public.posts(id) on delete cascade,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_visibility_idx on public.posts (visibility);
create index if not exists post_likes_user_idx on public.post_likes (user_id);
create index if not exists comments_post_idx on public.comments (post_id, created_at);
create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists stories_author_idx on public.stories (author_id, created_at desc);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.follows enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_posts enable row level security;

-- ============================================================
-- Policies
-- ============================================================
-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_delete_self" on public.profiles;
create policy "profiles_delete_self" on public.profiles
  for delete to authenticated using (auth.uid() = id);

-- posts
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select to authenticated
  using (visibility = 'public' or author_id = auth.uid());
drop policy if exists "posts_insert_self" on public.posts;
create policy "posts_insert_self" on public.posts
  for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "posts_update_self" on public.posts;
create policy "posts_update_self" on public.posts
  for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "posts_delete_self" on public.posts;
create policy "posts_delete_self" on public.posts
  for delete to authenticated using (auth.uid() = author_id);

-- post_likes
drop policy if exists "post_likes_select" on public.post_likes;
create policy "post_likes_select" on public.post_likes
  for select to authenticated using (true);
drop policy if exists "post_likes_insert_self" on public.post_likes;
create policy "post_likes_insert_self" on public.post_likes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "post_likes_delete_self" on public.post_likes;
create policy "post_likes_delete_self" on public.post_likes
  for delete to authenticated using (auth.uid() = user_id);

-- comments
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select to authenticated using (true);
drop policy if exists "comments_insert_self" on public.comments;
create policy "comments_insert_self" on public.comments
  for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "comments_update_self" on public.comments;
create policy "comments_update_self" on public.comments
  for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "comments_delete_self" on public.comments;
create policy "comments_delete_self" on public.comments
  for delete to authenticated using (auth.uid() = author_id);

-- comment_likes
drop policy if exists "comment_likes_select" on public.comment_likes;
create policy "comment_likes_select" on public.comment_likes
  for select to authenticated using (true);
drop policy if exists "comment_likes_insert_self" on public.comment_likes;
create policy "comment_likes_insert_self" on public.comment_likes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "comment_likes_delete_self" on public.comment_likes;
create policy "comment_likes_delete_self" on public.comment_likes
  for delete to authenticated using (auth.uid() = user_id);

-- follows
drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows
  for select to authenticated using (true);
drop policy if exists "follows_insert_self" on public.follows;
create policy "follows_insert_self" on public.follows
  for insert to authenticated with check (auth.uid() = follower_id);
drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_delete_self" on public.follows
  for delete to authenticated using (auth.uid() = follower_id);

-- stories
drop policy if exists "stories_select" on public.stories;
create policy "stories_select" on public.stories
  for select to authenticated using (expires_at > now());
drop policy if exists "stories_insert_self" on public.stories;
create policy "stories_insert_self" on public.stories
  for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "stories_delete_self" on public.stories;
create policy "stories_delete_self" on public.stories
  for delete to authenticated using (auth.uid() = author_id);

-- story_views
drop policy if exists "story_views_select" on public.story_views;
create policy "story_views_select" on public.story_views
  for select to authenticated using (true);
drop policy if exists "story_views_insert_self" on public.story_views;
create policy "story_views_insert_self" on public.story_views
  for insert to authenticated with check (auth.uid() = user_id);

-- conversations
drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member" on public.conversations
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  );

-- conversation_participants
drop policy if exists "cp_select_member" on public.conversation_participants;
create policy "cp_select_member" on public.conversation_participants
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
    )
  );
drop policy if exists "cp_insert_self" on public.conversation_participants;
create policy "cp_insert_self" on public.conversation_participants
  for insert to authenticated with check (auth.uid() = user_id);

-- messages
drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );
drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member" on public.messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );
drop policy if exists "messages_update_member" on public.messages;
create policy "messages_update_member" on public.messages
  for update to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

-- notifications
drop policy if exists "notifications_select_owner" on public.notifications;
create policy "notifications_select_owner" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "notifications_insert_actor" on public.notifications;
create policy "notifications_insert_actor" on public.notifications
  for insert to authenticated with check (auth.uid() = actor_id);
drop policy if exists "notifications_update_owner" on public.notifications;
create policy "notifications_update_owner" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "notifications_delete_owner" on public.notifications;
create policy "notifications_delete_owner" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

-- saved_posts
drop policy if exists "saved_posts_select" on public.saved_posts;
create policy "saved_posts_select" on public.saved_posts
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "saved_posts_insert_self" on public.saved_posts;
create policy "saved_posts_insert_self" on public.saved_posts
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "saved_posts_delete_self" on public.saved_posts;
create policy "saved_posts_delete_self" on public.saved_posts
  for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- Functions + triggers
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

create or replace function public.posts_count_trigger()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.profiles set posts_count = greatest(0, posts_count - 1) where id = old.author_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists posts_count_trg on public.posts;
create trigger posts_count_trg after insert or delete on public.posts
  for each row execute function public.posts_count_trigger();

create or replace function public.post_likes_count_trigger()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists post_likes_count_trg on public.post_likes;
create trigger post_likes_count_trg after insert or delete on public.post_likes
  for each row execute function public.post_likes_count_trigger();

create or replace function public.comments_count_trigger()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists comments_count_trg on public.comments;
create trigger comments_count_trg after insert or delete on public.comments
  for each row execute function public.comments_count_trigger();

create or replace function public.comment_likes_count_trigger()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.comments set likes_count = likes_count + 1 where id = new.comment_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.comments set likes_count = greatest(0, likes_count - 1) where id = old.comment_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists comment_likes_count_trg on public.comment_likes;
create trigger comment_likes_count_trg after insert or delete on public.comment_likes
  for each row execute function public.comment_likes_count_trigger();

create or replace function public.follows_count_trigger()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists follows_count_trg on public.follows;
create trigger follows_count_trg after insert or delete on public.follows
  for each row execute function public.follows_count_trigger();

create or replace function public.messages_conv_touch_trigger()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
    return new;
  end if;
  return null;
end $$;

drop trigger if exists messages_conv_touch_trg on public.messages;
create trigger messages_conv_touch_trg after insert on public.messages
  for each row execute function public.messages_conv_touch_trigger();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  base text;
  candidate text;
  n integer := 0;
begin
  base := coalesce(nullif(split_part(new.email, '@', 1), ''), 'user');
  base := lower(regexp_replace(base, '[^a-z0-9_]', '', 'g'));
  if char_length(base) = 0 then base := 'user'; end if;
  candidate := base;
  loop
    if not exists (select 1 from public.profiles where username = candidate) then
      exit;
    end if;
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username, full_name)
  values (new.id, candidate, null)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
