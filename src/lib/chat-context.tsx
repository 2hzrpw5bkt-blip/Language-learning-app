// Keeps the conversation list and total unread count fresh for the tabs.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
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

  const reload = useCallback(async () => {
    const next = await load();
    setState({ ...next, loaded: true });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    load().then((next) => {
      if (!cancelled) setState({ ...next, loaded: true });
    });
    // Any new message I can see changes previews or unread counts.
    const unsubscribe = subscribeToMessages(() => {
      load().then((next) => {
        if (!cancelled) setState({ ...next, loaded: true });
      });
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        load().then((next) => {
          if (!cancelled) setState({ ...next, loaded: true });
        });
      }
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
