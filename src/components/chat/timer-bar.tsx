// The shared language-switch timer: countdown when running, Accept/Decline when the partner asked.
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { formatSeconds, timerPhase, type ActiveTimer, type PendingRequest } from '@/lib/timer';

type Props = {
  active: ActiveTimer | null;
  pending: PendingRequest | null;
  me: string;
  partnerName: string;
  languageName: (code: string) => string;
  onAnswer: (request: PendingRequest, accept: boolean) => void;
  onRequestStop: () => void;
};

export function TimerBar({ active, pending, me, partnerName, languageName, onAnswer, onRequestStop }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const phase = active ? timerPhase(active, now) : null;
  const previousIndex = useRef(phase?.index ?? 0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (!phase) return;
    if (phase.index !== previousIndex.current) {
      Alert.alert(strings.chats.timerSwitchTitle, strings.chats.timerSwitchBody(languageName(phase.language)));
    }
    previousIndex.current = phase.index;
  }, [phase, languageName]);

  if (pending) {
    const mine = pending.sender_id === me;
    const label =
      pending.action === 'request'
        ? mine
          ? strings.chats.timerWaiting(partnerName)
          : strings.chats.timerAsked(partnerName)
        : mine
          ? strings.chats.timerStopWaiting(partnerName)
          : strings.chats.timerStopAsked(partnerName);
    return (
      <View style={styles.bar}>
        <Text style={styles.text}>{label}</Text>
        {!mine ? (
          <View style={styles.buttons}>
            <Pressable onPress={() => onAnswer(pending, false)} hitSlop={8}>
              <Text style={styles.decline}>{strings.chats.timerDecline}</Text>
            </Pressable>
            <Pressable onPress={() => onAnswer(pending, true)} hitSlop={8}>
              <Text style={styles.accept}>{strings.chats.timerAccept}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  if (!phase) return null;
  return (
    <View style={styles.bar}>
      <View style={styles.text}>
        <Text style={styles.now}>{strings.chats.timerNow(languageName(phase.language))}</Text>
        <Text style={styles.then}>{strings.chats.timerThen(languageName(phase.next))}</Text>
      </View>
      <Text style={styles.clock}>{formatSeconds(phase.secondsLeft)}</Text>
      <Pressable onPress={onRequestStop} hitSlop={8}>
        <Text style={styles.decline}>{strings.chats.timerStop}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  text: { flex: 1, color: colors.text },
  buttons: { flexDirection: 'row', gap: spacing.md },
  accept: { color: colors.primary, fontWeight: '700' },
  decline: { color: colors.danger, fontWeight: '600' },
  now: { fontWeight: '700', color: colors.text },
  then: { fontSize: 12, color: colors.muted },
  clock: { fontVariant: ['tabular-nums'], fontSize: 20, fontWeight: '600', color: colors.primary },
});
