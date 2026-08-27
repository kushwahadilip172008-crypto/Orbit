export type UUID = string;

export interface Profile {
  id: UUID;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  is_private: boolean;
  is_verified: boolean;
  posts_count: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export type MediaType = "image" | "video";
export type PostVisibility = "public" | "private";

export interface Post {
  id: UUID;
  author_id: UUID;
  caption: string | null;
  media_urls: string[];
  media_type: MediaType;
  location: string | null;
  visibility: PostVisibility;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  liked_by_me?: boolean;
  saved_by_me?: boolean;
}

export interface Comment {
  id: UUID;
  post_id: UUID;
  author_id: UUID;
  body: string;
  likes_count: number;
  created_at: string;
  author?: Profile;
  liked_by_me?: boolean;
}

export interface Follow {
  follower_id: UUID;
  following_id: UUID;
  created_at: string;
}

export interface Story {
  id: UUID;
  author_id: UUID;
  media_url: string;
  media_type: MediaType;
  caption: string | null;
  created_at: string;
  expires_at: string;
  viewed?: boolean;
  author?: Profile;
}

export interface Conversation {
  id: UUID;
  created_at: string;
  last_message_at: string;
  participants: ConversationParticipant[];
  last_message?: Message | null;
}

export interface ConversationParticipant {
  conversation_id: UUID;
  user_id: UUID;
  joined_at: string;
  profile?: Profile;
}

export interface Message {
  id: UUID;
  conversation_id: UUID;
  sender_id: UUID;
  body: string | null;
  media_url: string | null;
  created_at: string;
  read: boolean;
  sender?: Profile;
}

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "message";

export interface AppNotification {
  id: UUID;
  user_id: UUID;
  actor_id: UUID;
  type: NotificationType;
  post_id: UUID | null;
  body: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile;
  post?: Pick<Post, "id" | "media_urls"> | null;
}
