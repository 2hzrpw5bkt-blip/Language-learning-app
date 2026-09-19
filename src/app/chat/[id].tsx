import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  blockUser,
  fetchConversationPartner,
  fetchMessages,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
  type ConversationPartner,
  type Message,
} from '@/lib/chat';
import { useChats } from '@/lib/chat-context';
import { errorMessage } from '@/lib/errors';
import { messageTime } from '@/lib/time';

function addMessage(list: Message[], message: Message): Message[] {
  return list.some((item) => item.id === message.id) ? list : [message, ...list];
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { reload } = useChats();
  const me = session?.user.id ?? '';

  const [partner, setPartner] = useState<ConversationPartner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchConversationPartner(id), fetchMessages(id)])
      .then(([partnerResult, history]) => {
        if (cancelled) return;
        setPartner(partnerResult);
        setMessages(history);
        setLoaded(true);
        markConversationRead(id, me).then(reload);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    const unsubscribe = subscribeToMessages((message) => {
      setMessages((current) => addMessage(current, message));
      if (message.sender_id !== me) markConversationRead(id, me).then(reload);
    }, id);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id, me, reload]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await sendMessage(id, me, body);
      setMessages((current) => addMessage(current, message));
      setText('');
      reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  const openReport = (message?: Message) => {
    if (!partner) return;
    router.push({
      pathname: '/report',
      params: {
        userId: partner.id,
        ...(message ? { messageId: String(message.id), messageBody: message.body } : {}),
      },
    });
  };

  const confirmBlock = () => {
    if (!partner) return;
    Alert.alert(strings.chats.blockTitle(partner.display_name), strings.chats.blockBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.chats.blockConfirm,
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(me, partner.id);
            await reload();
            router.replace('/chats');
          } catch (caught) {
            Alert.alert(errorMessage(caught));
          }
        },
      },
    ]);
  };

  const openMenu = () => {
    if (!partner) return;
    Alert.alert(partner.display_name, undefined, [
      {
        text: strings.chats.viewProfile,
        onPress: () => router.push({ pathname: '/partner/[id]', params: { id: partner.id } }),
      },
      { text: strings.chats.report, onPress: () => openReport() },
      { text: strings.chats.block, style: 'destructive', onPress: confirmBlock },
      { text: strings.common.cancel, style: 'cancel' },
    ]);
  };

  const messageOptions = (message: Message) => {
    if (message.sender_id === me) return;
    Alert.alert(strings.chats.messageOptions, message.body, [
      { text: strings.chats.reportMessage, onPress: () => openReport(message) },
      { text: strings.common.cancel, style: 'cancel' },
    ]);
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen
        options={{
          title: partner?.display_name ?? '',
          headerRight: () => (
            <Pressable onPress={openMenu} hitSlop={8} accessibilityLabel={strings.chats.menu}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        style={styles.list}
        data={messages}
        inverted
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loaded ? <Muted style={styles.empty}>{strings.chats.noMessages}</Muted> : null}
        renderItem={({ item }) => {
          const mine = item.sender_id === me;
          return (
            <Pressable onLongPress={() => messageOptions(item)} style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                <Text style={[styles.time, mine && styles.timeMine]}>{messageTime(item.created_at)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
      <ErrorText message={error} />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={strings.chats.placeholder}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={send}
          disabled={sending || text.trim().length === 0}
          accessibilityRole="button"
          accessibilityLabel={strings.chats.send}
          style={[styles.sendButton, (sending || text.trim().length === 0) && styles.sendDisabled]}>
          <Ionicons name="arrow-up" size={22} color={colors.onPrimary} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, marginHorizontal: -spacing.md },
  listContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  empty: { textAlign: 'center', transform: [{ scaleY: -1 }] },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 16, lineHeight: 22, color: colors.text },
  bubbleTextMine: { color: colors.onPrimary },
  time: { fontSize: 11, color: colors.muted, marginTop: 2, alignSelf: 'flex-end' },
  timeMine: { color: '#DCEBFB' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
