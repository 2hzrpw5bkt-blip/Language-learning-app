// Shows the running language-switch timer and warns when it is time to switch.
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { formatSeconds, timerState, type TimerMeta } from '@/lib/timer';

type Props = {
  meta: TimerMeta;
  languageName: (code: string) => string;
  onStop: () => void;
};

export function TimerBar({ meta, languageName, onStop }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const state = timerState(meta, now);
  const previousPhase = useRef(state.phase);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (previousPhase.current === state.phase) return;
    if (state.phase === 'second') {
      Alert.alert(strings.chats.timerSwitchTitle, strings.chats.timerSwitchBody(languageName(state.language)));
    } else if (state.phase === 'done') {
      Alert.alert(strings.chats.timerDoneTitle, strings.chats.timerDoneBody);
    }
    previousPhase.current = state.phase;
  }, [state, languageName]);

  if (state.phase === 'done') return null;

  const next = state.phase === 'first' ? meta.second : null;
  return (
    <View style={styles.bar}>
      <View style={styles.text}>
        <Text style={styles.now}>{strings.chats.timerNow(languageName(state.language))}</Text>
        {next ? <Text style={styles.then}>{strings.chats.timerThen(languageName(next))}</Text> : null}
      </View>
      <Text style={styles.clock}>{formatSeconds(state.secondsLeft)}</Text>
      <Pressable onPress={onStop} hitSlop={8}>
        <Text style={styles.stop}>{strings.chats.timerStop}</Text>
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
  text: { flex: 1 },
  now: { fontWeight: '700', color: colors.text },
  then: { fontSize: 12, color: colors.muted },
  clock: { fontVariant: ['tabular-nums'], fontSize: 20, fontWeight: '600', color: colors.primary },
  stop: { color: colors.danger, fontWeight: '600' },
});
