import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CorrectionSheet } from '@/components/chat/correction-sheet';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TimerBar } from '@/components/chat/timer-bar';
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
import { summarizeTimer, TIMER_MINUTES, type PendingRequest } from '@/lib/timer';

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
  const timer = useMemo(() => summarizeTimer(messages), [messages]);

  // Corrections are shown inside the message they correct, so they leave the list.
  const { visibleMessages, correctionsByOriginal } = useMemo(() => {
    const byOriginal = new Map<number, Message>();
    const ids = new Set(messages.map((item) => item.id));
    for (const item of messages) {
      if (item.kind === 'correction' && item.corrected_from_message_id && ids.has(item.corrected_from_message_id)) {
        const existing = byOriginal.get(item.corrected_from_message_id);
        if (!existing || existing.id < item.id) byOriginal.set(item.corrected_from_message_id, item);
      }
    }
    const attached = new Set([...byOriginal.values()].map((item) => item.id));
    return {
      visibleMessages: messages.filter((item) => !attached.has(item.id)),
      correctionsByOriginal: byOriginal,
    };
  }, [messages]);
  const myName = profile?.display_name ?? '';
  const partnerName = partner?.display_name ?? '';

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

  // Which language goes first: the one the requester is practising.
  const timerLanguages = (requesterId: string): { first: string; second: string } | null => {
    const codes = [...new Set(exchange.map((item) => item.code))];
    if (codes.length === 0) return null;
    const mine = exchange.find((item) => item.learnerId === requesterId)?.code ?? codes[0];
    const other = codes.find((code) => code !== mine) ?? mine;
    return { first: mine, second: other };
  };

  const answerRequest = async (request: PendingRequest, accept: boolean) => {
    if (request.action === 'request') {
      const first = request.meta.first ?? '';
      const second = request.meta.second ?? '';
      if (accept) {
        await deliver(strings.chats.timerStarted(TIMER_MINUTES, languageName(first)), {
          kind: 'timer',
          meta: { action: 'accept', first, second, started_at: new Date().toISOString() },
        });
      } else {
        await deliver(strings.chats.timerDeclined(myName), { kind: 'timer', meta: { action: 'decline' } });
      }
      return;
    }
    if (accept) {
      await deliver(strings.chats.timerStopped, { kind: 'timer', meta: { action: 'stop' } });
    } else {
      await deliver(strings.chats.timerKept(myName), { kind: 'timer', meta: { action: 'stop_declined' } });
    }
  };

  // Popup when the partner asks to start or stop the timer.
  const askAboutRequest = (request: PendingRequest) => {
    const name = request.meta.requester_name ?? partnerName;
    if (request.action === 'request') {
      Alert.alert(
        strings.chats.timerAskedTitle(name),
        strings.chats.timerAskedBody(
          TIMER_MINUTES,
          languageName(request.meta.first ?? ''),
          languageName(request.meta.second ?? ''),
        ),
        [
          { text: strings.chats.timerDecline, style: 'cancel', onPress: () => answerRequest(request, false) },
          { text: strings.chats.timerAccept, onPress: () => answerRequest(request, true) },
        ],
      );
    } else {
      Alert.alert(strings.chats.timerStopAskedTitle(name), strings.chats.timerStopAskedBody, [
        { text: strings.chats.timerDecline, style: 'cancel', onPress: () => answerRequest(request, false) },
        { text: strings.chats.timerAccept, onPress: () => answerRequest(request, true) },
      ]);
    }
  };

  // Show the popup once per incoming request (also covers a request that arrived while away).
  const askedFor = useRef<number | null>(null);
  const askRef = useRef(askAboutRequest);
  useEffect(() => {
    askRef.current = askAboutRequest;
  });
  useEffect(() => {
    const request = timer.pending;
    if (!request || request.sender_id === me || askedFor.current === request.message.id) return;
    askedFor.current = request.message.id;
    askRef.current(request);
  }, [timer.pending, me]);

  const requestStop = () => {
    Alert.alert(strings.chats.timerExplainTitle, strings.chats.timerStopExplain(partnerName), [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.chats.timerStopSend,
        onPress: () =>
          deliver(strings.chats.timerStopRequestBody(myName), {
            kind: 'timer',
            meta: { action: 'stop_request', requester_name: myName },
          }),
      },
    ]);
  };

  const pressTimer = () => {
    if (timer.pending) {
      if (timer.pending.sender_id !== me) askAboutRequest(timer.pending);
      else Alert.alert(strings.chats.timerExplainTitle, strings.chats.timerPending);
      return;
    }
    if (timer.active) {
      requestStop();
      return;
    }
    const languagesForTimer = timerLanguages(me);
    if (!languagesForTimer) {
      Alert.alert(strings.chats.timerExplainTitle, strings.chats.topicNoLanguages);
      return;
    }
    const { first, second } = languagesForTimer;
    Alert.alert(
      strings.chats.timerExplainTitle,
      strings.chats.timerExplain(TIMER_MINUTES, languageName(first), languageName(second), partnerName),
      [
        { text: strings.common.cancel, style: 'cancel' },
        {
          text: strings.chats.timerSend,
          onPress: () =>
            deliver(strings.chats.timerRequestBody(myName, TIMER_MINUTES), {
              kind: 'timer',
              meta: { action: 'request', first, second, requester_name: myName },
            }),
        },
      ],
    );
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
      {timer.active || timer.pending ? (
        <TimerBar
          active={timer.active}
          pending={timer.pending}
          me={me}
          partnerName={partnerName}
          languageName={languageName}
          onAnswer={answerRequest}
          onRequestStop={requestStop}
        />
      ) : null}
      <FlatList
        style={styles.list}
        data={visibleMessages}
        inverted
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Muted style={styles.emptyText}>{strings.chats.noMessages}</Muted>
              <Muted style={styles.emptyText}>{strings.chats.correctionTip}</Muted>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const attachedCorrection = correctionsByOriginal.get(item.id);
          return (
            <MessageBubble
              message={item}
              mine={item.sender_id === me}
              original={
                item.corrected_from_message_id
                  ? messages.find((candidate) => candidate.id === item.corrected_from_message_id)
                  : undefined
              }
              correction={
                attachedCorrection
                  ? {
                      corrected: attachedCorrection.body,
                      byName: attachedCorrection.sender_id === me ? strings.chats.you : partnerName,
                    }
                  : undefined
              }
              onLongPress={() => messageOptions(item)}
            />
          );
        }}
      />
      <ErrorText message={error} />
      <View style={styles.tools}>
        <Pressable onPress={() => setTopicOpen((n) => n + 1)} style={styles.tool} accessibilityRole="button">
          <Ionicons name="bulb-outline" size={18} color={colors.primary} />
          <Text style={styles.toolText}>{strings.chats.topicButton}</Text>
        </Pressable>
        <Pressable onPress={pressTimer} style={styles.tool} accessibilityRole="button">
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
  empty: { transform: [{ scaleY: -1 }], gap: spacing.sm, paddingVertical: spacing.lg },
  emptyText: { textAlign: 'center' },
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
