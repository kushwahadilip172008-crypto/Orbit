import { supabase } from "./supabase";
import type { Conversation, Message, Profile } from "../types";

export async function getConversations(): Promise<Conversation[]> {
  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("conversation_participants")
    .select(`
      conversation_id, joined_at,
      conversation:conversations!inner(id, created_at, last_message_at)
    `)
    .eq("user_id", uid);
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    conversation_id: string;
    joined_at: string;
    conversation: { id: string; created_at: string; last_message_at: string };
  }>;

  if (rows.length === 0) return [];

  const convIds = rows.map((r) => r.conversation.id);

  const [participantsRes, lastMsgRes] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select(`
        conversation_id, user_id, joined_at,
        profile:profiles!conversation_participants_user_id_fkey(id, username, full_name, avatar_url, is_verified)
      `)
      .in("conversation_id", convIds),
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, media_url, read, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false }),
  ]);

  if (participantsRes.error) throw participantsRes.error;

  const participantsByConv = new Map<string, Conversation["participants"]>();
  for (const p of (participantsRes.data ?? []) as unknown as Array<{
    conversation_id: string;
    user_id: string;
    joined_at: string;
    profile: Profile;
  }>) {
    if (!participantsByConv.has(p.conversation_id)) {
      participantsByConv.set(p.conversation_id, []);
    }
    participantsByConv.get(p.conversation_id)!.push({
      conversation_id: p.conversation_id,
      user_id: p.user_id,
      joined_at: p.joined_at,
      profile: p.profile,
    });
  }

  const lastMsgByConv = new Map<string, Message>();
  for (const m of (lastMsgRes.data ?? []) as unknown as Message[]) {
    if (!lastMsgByConv.has(m.conversation_id)) {
      lastMsgByConv.set(m.conversation_id, m);
    }
  }

  return rows
    .map((r) => ({
      id: r.conversation.id,
      created_at: r.conversation.created_at,
      last_message_at: r.conversation.last_message_at,
      participants: participantsByConv.get(r.conversation.id) ?? [],
      last_message: lastMsgByConv.get(r.conversation.id) ?? null,
    }))
    .sort((a, b) =>
      (b.last_message?.created_at ?? b.last_message_at).localeCompare(
        a.last_message?.created_at ?? a.last_message_at,
      ),
    );
}

export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  if (!uid || uid === otherUserId) throw new Error("Invalid conversation");

  // Look for an existing 1:1 conversation
  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", uid);

  const { data: theirs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", otherUserId);

  const mineSet = new Set((mine ?? []).map((r) => r.conversation_id));
  const shared = (theirs ?? []).find((r) => mineSet.has(r.conversation_id));
  if (shared) return shared.conversation_id;

  // Create new
  const { data: conv, error: cErr } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();
  if (cErr) throw cErr;

  const { error: pErr } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: conv.id, user_id: uid },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);
  if (pErr) throw pErr;

  return conv.id;
}

export async function getMessages(conversationId: string, limit = 50): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      id, conversation_id, sender_id, body, media_url, read, created_at,
      sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url, is_verified)
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, body })
    .select(`
      id, conversation_id, sender_id, body, media_url, read, created_at,
      sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url, is_verified)
    `)
    .single();
  if (error) throw error;
  // mark notifications for other participants
  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);
  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  const others = (parts ?? []).map((p) => p.user_id).filter((id) => id !== uid);
  if (others.length > 0) {
    await supabase.from("notifications").insert(
      others.map((oid) => ({
        user_id: oid,
        actor_id: uid,
        type: "message" as const,
        body: body.slice(0, 80),
      })),
    );
  }
  return data as unknown as Message;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  const uid = me.user?.id;
  if (!uid) return;
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", uid)
    .eq("read", false);
}
