// Keeps the conversation list and total unread count fresh for the tabs.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth';
import { listConversations, subscribeToMessages, type ConversationSummary } from '@/lib/chat';

type ChatContextValue = {
  conversations: ConversationSummary[];
  unreadTotal: number;
  loaded: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

async function load(): Promise<{ conversations: ConversationSummary[]; error: string | null }> {
  try {
    return { conversations: await listConversations(), error: null };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String((caught as { message?: string })?.message ?? caught);
    return { conversations: [], error: message };
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [state, setState] = useState<{ conversations: ConversationSummary[]; error: string | null; loaded: boolean }>({
    conversations: [],
    error: null,
    loaded: false,
  });

  // Reloads can overlap (realtime, focus, foreground). Only the newest one may write state,
  // otherwise a slow earlier request can restore a stale list.
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const ticket = ++latest.current;
    const next = await load();
    if (ticket === latest.current) setState({ ...next, loaded: true });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const refresh = () => {
      const ticket = ++latest.current;
      load().then((next) => {
        if (!cancelled && ticket === latest.current) setState({ ...next, loaded: true });
      });
    };
    refresh();
    // Any new message I can see changes previews or unread counts.
    const unsubscribe = subscribeToMessages(refresh, undefined, refresh);
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => {
      cancelled = true;
      unsubscribe();
      appState.remove();
    };
  }, [userId]);

  const unreadTotal = state.conversations.reduce((sum, item) => sum + item.unread_count, 0);

  return (
    <ChatContext.Provider value={{ conversations: state.conversations, unreadTotal, loaded: state.loaded, error: state.error, reload }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChats(): ChatContextValue {
  const value = useContext(ChatContext);
  if (!value) throw new Error('useChats must be used inside ChatProvider');
  return value;
}
