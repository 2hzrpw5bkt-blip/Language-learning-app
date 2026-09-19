import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CorrectionSheet } from '@/components/chat/correction-sheet';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TimerBar } from '@/components/chat/timer-bar';
import { TimerSheet } from '@/components/chat/timer-sheet';
import { TopicSheet } from '@/components/chat/topic-sheet';
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
  type MessageExtras,
} from '@/lib/chat';
import { useChats } from '@/lib/chat-context';
import { errorMessage } from '@/lib/errors';
import { exchangeLanguages, type ExchangeLanguage } from '@/lib/exchange';
import { fetchPartner, type Partner } from '@/lib/partners';
import { latestTimer, type TimerMeta } from '@/lib/timer';

function addMessage(list: Message[], message: Message): Message[] {
  return list.some((item) => item.id === message.id) ? list : [message, ...list];
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, profile, userLanguages, languages } = useAuth();
  const { reload } = useChats();
  const me = session?.user.id ?? '';

  const [partner, setPartner] = useState<ConversationPartner | null>(null);
  const [partnerDetails, setPartnerDetails] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicOpen, setTopicOpen] = useState(0);
  const [timerOpen, setTimerOpen] = useState(0);
  const [correcting, setCorrecting] = useState<Message | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchConversationPartner(id), fetchMessages(id)])
      .then(([partnerResult, history]) => {
        if (cancelled) return;
        setPartner(partnerResult);
        setMessages(history);
        setLoaded(true);
        markConversationRead(id, me).then(reload);
        if (partnerResult) {
          fetchPartner(partnerResult.id).then((details) => {
            if (!cancelled) setPartnerDetails(details);
          });
        }
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

  const languageName = useCallback(
    (code: string) => languages.find((item) => item.code === code)?.name ?? code,
    [languages],
  );

  // The languages this pair practises with each other.
  const exchange: ExchangeLanguage[] = useMemo(() => {
    if (!profile || !partnerDetails) return [];
    return exchangeLanguages(
      { id: profile.id, name: profile.display_name, languages: userLanguages },
      { id: partnerDetails.id, name: partnerDetails.display_name, languages: partnerDetails.languages },
    );
  }, [profile, userLanguages, partnerDetails]);
  const exchangeCodes = useMemo(() => [...new Set(exchange.map((item) => item.code))], [exchange]);
  const timer = latestTimer(messages);

  const deliver = async (body: string, extras: MessageExtras = {}) => {
    setSending(true);
    setError(null);
    try {
      const message = await sendMessage(id, me, body, extras);
      setMessages((current) => addMessage(current, message));
      reload();
      return true;
    } catch (caught) {
      setError(errorMessage(caught));
      return false;
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (await deliver(body)) setText('');
  };

  const sendTopic = async (prompt: string, option: ExchangeLanguage) => {
    setTopicOpen(0);
    await deliver(prompt, {
      kind: 'topic',
      meta: {
        language: option.code,
        language_name: languageName(option.code),
        learner_id: option.learnerId,
        learner_name: option.learnerName,
        level: option.level,
        level_title: strings.levels[option.level].title,
      },
    });
  };

  const startTimer = async (meta: TimerMeta) => {
    setTimerOpen(0);
    await deliver(strings.chats.timerStarted(languageName(meta.first), languageName(meta.second), meta.minutes), {
      kind: 'timer',
      meta: { ...meta },
    });
  };

  const stopTimer = async () => {
    if (!timer) return;
    await deliver(strings.chats.timerStopped, { kind: 'timer', meta: { ...timer, stopped: true } });
  };

  const sendCorrection = async (original: Message, corrected: string) => {
    setCorrecting(null);
    await deliver(corrected, { kind: 'correction', corrected_from_message_id: original.id });
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
    if (message.sender_id === me || message.kind === 'timer' || message.kind === 'topic') return;
    Alert.alert(strings.chats.messageOptions, message.body, [
      ...(message.kind === 'text' ? [{ text: strings.chats.correct, onPress: () => setCorrecting(message) }] : []),
      { text: strings.chats.reportMessage, onPress: () => openReport(message) },
      { text: strings.common.cancel, style: 'cancel' },
    ]);
  };

  const canSend = !sending && text.trim().length > 0;

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
      {timer ? <TimerBar meta={timer} languageName={languageName} onStop={stopTimer} /> : null}
      <FlatList
        style={styles.list}
        data={messages}
        inverted
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loaded ? <Muted style={styles.empty}>{strings.chats.noMessages}</Muted> : null}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            mine={item.sender_id === me}
            original={
              item.corrected_from_message_id
                ? messages.find((candidate) => candidate.id === item.corrected_from_message_id)
                : undefined
            }
            onLongPress={() => messageOptions(item)}
          />
        )}
      />
      <ErrorText message={error} />
      <View style={styles.tools}>
        <Pressable onPress={() => setTopicOpen((n) => n + 1)} style={styles.tool} accessibilityRole="button">
          <Ionicons name="bulb-outline" size={18} color={colors.primary} />
          <Text style={styles.toolText}>{strings.chats.topicButton}</Text>
        </Pressable>
        <Pressable onPress={() => setTimerOpen((n) => n + 1)} style={styles.tool} accessibilityRole="button">
          <Ionicons name="timer-outline" size={18} color={colors.primary} />
          <Text style={styles.toolText}>{strings.chats.timerButton}</Text>
        </Pressable>
      </View>
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
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={strings.chats.send}
          style={[styles.sendButton, !canSend && styles.sendDisabled]}>
          <Ionicons name="arrow-up" size={22} color={colors.onPrimary} />
        </Pressable>
      </View>

      {/* The key remounts each sheet when opened, so its state starts fresh. */}
      <TopicSheet
        key={`topic-${topicOpen}`}
        visible={topicOpen > 0}
        onClose={() => setTopicOpen(0)}
        options={exchange}
        languageName={languageName}
        onSend={sendTopic}
      />
      <TimerSheet
        key={`timer-${timerOpen}`}
        visible={timerOpen > 0}
        onClose={() => setTimerOpen(0)}
        codes={exchangeCodes}
        languageName={languageName}
        onStart={startTimer}
      />
      <CorrectionSheet
        key={`correction-${correcting?.id ?? 'none'}`}
        original={correcting}
        onClose={() => setCorrecting(null)}
        onSend={sendCorrection}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, marginHorizontal: -spacing.md },
  listContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  empty: { textAlign: 'center', transform: [{ scaleY: -1 }] },
  tools: { flexDirection: 'row', gap: spacing.sm },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  toolText: { color: colors.primary, fontWeight: '600' },
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
