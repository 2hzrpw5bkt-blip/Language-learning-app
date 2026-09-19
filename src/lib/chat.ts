// Conversations, messages, blocks and reports. Screens call these, never Supabase directly.
import { supabase } from '@/lib/supabase';

export type ConversationSummary = {
  id: string;
  other_id: string;
  other_name: string;
  other_avatar_url: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  muted: boolean;
};

export type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  corrected_from_message_id: number | null;
  created_at: string;
};

export type ReportReason = 'harassment' | 'spam' | 'inappropriate' | 'scam' | 'other';
export const REPORT_REASONS: ReportReason[] = ['harassment', 'spam', 'inappropriate', 'scam', 'other'];

// Returns the conversation id with this person, creating it if needed.
export async function startConversation(otherId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { p_other: otherId });
  if (error) throw error;
  return data as string;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('list_conversations');
  if (error) throw error;
  return (data as ConversationSummary[]).map((row) => ({ ...row, unread_count: Number(row.unread_count) }));
}

export type ConversationPartner = { id: string; display_name: string; avatar_url: string | null };

export async function fetchConversationPartner(conversationId: string): Promise<ConversationPartner | null> {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('user_id, profiles ( display_name, avatar_url )')
    .eq('conversation_id', conversationId)
    .neq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as { user_id: string; profiles: { display_name: string; avatar_url: string | null } };
  return { id: row.user_id, display_name: row.profiles.display_name, avatar_url: row.profiles.avatar_url };
}

// Newest first, so an inverted list can show them directly.
export async function fetchMessages(conversationId: string, beforeId?: number, limit = 50): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('id', { ascending: false })
    .limit(limit);
  if (beforeId !== undefined) query = query.lt('id', beforeId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('*')
    .single();
  if (error) throw error;
  return data as Message;
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

// Calls onInsert for every new message the current user is allowed to see.
// Pass a conversation id to narrow it to one chat. Returns an unsubscribe function.
export function subscribeToMessages(onInsert: (message: Message) => void, conversationId?: string): () => void {
  const channel = supabase
    .channel(conversationId ? `messages:${conversationId}` : 'messages:all')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        ...(conversationId ? { filter: `conversation_id=eq.${conversationId}` } : {}),
      },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').upsert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
  if (error) throw error;
}

export type BlockedUser = { id: string; display_name: string; avatar_url: string | null };

export async function listBlockedUsers(blockerId: string): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, profiles!blocks_blocked_id_fkey ( display_name, avatar_url )')
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data as unknown as { blocked_id: string; profiles: { display_name: string; avatar_url: string | null } }[];
  return rows.map((row) => ({ id: row.blocked_id, display_name: row.profiles.display_name, avatar_url: row.profiles.avatar_url }));
}

export type ReportInput = {
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details: string;
  messageId?: number;
  messageBody?: string;
};

export async function submitReport(input: ReportInput): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    reason: input.reason,
    details: input.details.trim() || null,
    message_id: input.messageId ?? null,
    message_body: input.messageBody ?? null,
  });
  if (error) throw error;
}
